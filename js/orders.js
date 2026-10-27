const ORDERS_API = "http://localhost:8080/orders";
const $ = selector => document.querySelector(selector);

const elements = {
    tbody: $("#ordersTableBody"),
    message: $("#ordersMessage"),
    table: $("#ordersTableContainer"),
    search: $("#searchOrders"),
    filter: $("#statusFilter"),
    refresh: $("#refreshOrders"),
    total: $("#totalOrders"),
    processing: $("#processingOrders"),
    delivered: $("#deliveredOrders"),
    revenue: $("#totalRevenue"),
    count: $("#ordersCount"),
    pagination: $("#ordersPaginationInfo"),
    modal: $("#orderDetailsModal")
};

const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short"
});

const statusCodes = {
    1: "WAITING_PAYMENT",
    2: "PAID",
    3: "SHIPPED",
    4: "DELIVERED",
    5: "CANCELED"
};

const statusLabels = {
    WAITING_PAYMENT: "Aguardando pagamento",
    PAID: "Pago",
    SHIPPED: "Enviado",
    DELIVERED: "Entregue",
    CANCELED: "Cancelado"
};

const statusClasses = {
    WAITING_PAYMENT: "status-waiting",
    PAID: "status-paid",
    SHIPPED: "status-shipped",
    DELIVERED: "status-delivered",
    CANCELED: "status-canceled"
};

let orders = [];
let loading = false;
let previousFocus = null;

/* REQUISIÇÕES */

async function request(path = "") {
    let response;

    try {
        response = await fetch(`${ORDERS_API}${path}`);
    } catch {
        throw new Error("Não foi possível carregar os pedidos.");
    }

    if (!response.ok) {
        throw new Error(
            response.status === 404
                ? "Pedido não encontrado."
                : "Não foi possível consultar os pedidos."
        );
    }

    return response.json();
}

/* FORMATAÇÃO */

function formatMoney(value) {
    if (value === null || value === undefined || value === "") {
        return "—";
    }

    const number = Number(value);

    return Number.isFinite(number)
        ? currency.format(number)
        : "—";
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : dateFormatter.format(date);
}

function normalizeStatus(value) {
    if (value == null) return "UNKNOWN";

    const normalized = String(value).trim().toUpperCase();

    if (/^[1-5]$/.test(normalized)) {
        return statusCodes[Number(normalized)] || "UNKNOWN";
    }

    return Object.hasOwn(statusLabels, normalized)
        ? normalized
        : "UNKNOWN";
}

function getStatus(order) {
    return normalizeStatus(order.orderStatus ?? order.status);
}

function createStatusBadge(order) {
    const status = getStatus(order);
    const badge = document.createElement("span");

    badge.className =
        `order-status ${statusClasses[status] || "status-unknown"}`;

    badge.textContent = statusLabels[status] || "Não informado";

    return badge;
}

function getItems(order) {
    return Array.isArray(order.items) ? order.items : [];
}

function getOrderTotal(order) {
    if (
        order.total !== null &&
        order.total !== undefined &&
        Number.isFinite(Number(order.total))
    ) {
        return Number(order.total);
    }

    const items = getItems(order);

    if (!items.length) return null;

    let total = 0;

    for (const item of items) {
        const quantity = Number(item.quantity);
        const price = Number(item.price);

        if (!Number.isFinite(quantity) || !Number.isFinite(price)) {
            return null;
        }

        total += quantity * price;
    }

    return total;
}

function createCell(value, className = "") {
    const cell = document.createElement("td");
    cell.textContent = String(value);
    cell.className = className;
    return cell;
}

function getInitials(name) {
    return String(name || "Cliente")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word.charAt(0).toUpperCase())
        .join("");
}

/* LISTAGEM */

async function loadOrders() {
    if (loading) return;

    loading = true;
    elements.refresh.disabled = true;
    elements.table.hidden = true;
    elements.message.hidden = false;
    elements.message.classList.remove("error");
    elements.message.textContent = "Carregando pedidos...";

    try {
        const data = await request();

        if (!Array.isArray(data)) {
            throw new Error("Formato de resposta inesperado.");
        }

        orders = data;

        updateStatistics();
        filterOrders();

    } catch (error) {
        console.error("Erro ao listar pedidos:", error);

        orders = [];

        elements.total.textContent = "—";
        elements.processing.textContent = "—";
        elements.delivered.textContent = "—";
        elements.revenue.textContent = "—";
        elements.count.textContent = "Indisponível";
        elements.pagination.textContent = "Nenhum pedido exibido";

        elements.table.hidden = true;
        elements.message.hidden = false;
        elements.message.classList.add("error");
        elements.message.textContent =
            "Não foi possível carregar os pedidos. Tente novamente em instantes.";

    } finally {
        loading = false;
        elements.refresh.disabled = false;
    }
}

/* INDICADORES */

function updateStatistics() {
    elements.total.textContent = orders.length;

    const processing = orders.filter(order =>
        ["WAITING_PAYMENT", "PAID", "SHIPPED"].includes(getStatus(order))
    ).length;

    const delivered = orders.filter(order =>
        getStatus(order) === "DELIVERED"
    ).length;

    elements.processing.textContent = processing;
    elements.delivered.textContent = delivered;

    const totals = orders
        .map(getOrderTotal)
        .filter(value => value !== null);

    // Se algum pedido não tiver total disponível, não exibe uma soma incompleta.
    elements.revenue.textContent = totals.length === orders.length
        ? formatMoney(totals.reduce((sum, value) => sum + value, 0))
        : "—";
}

/* PESQUISA E FILTRO */

function filterOrders() {
    const query = elements.search.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const selectedStatus = elements.filter.value;

    const filtered = orders.filter(order => {
        const client = order.client || {};

        const matchesSearch = [
            order.id,
            client.name,
            client.email
        ].some(value =>
            String(value ?? "")
                .toLocaleLowerCase("pt-BR")
                .includes(query)
        );

        const matchesStatus =
            selectedStatus === "ALL" ||
            getStatus(order) === selectedStatus;

        return matchesSearch && matchesStatus;
    });

    renderOrders(filtered);
}

/* TABELA */

function renderOrders(list) {
    elements.tbody.replaceChildren();

    elements.count.textContent = `${list.length} pedido(s)`;
    elements.pagination.textContent =
        `Exibindo ${list.length} de ${orders.length} pedido(s)`;

    if (list.length === 0) {
        elements.table.hidden = true;
        elements.message.hidden = false;
        elements.message.classList.remove("error");

        elements.message.textContent = orders.length
            ? "Nenhum pedido corresponde aos filtros selecionados."
            : "Ainda não há pedidos registrados.";

        return;
    }

    const fragment = document.createDocumentFragment();

    list.forEach(order => {
        const row = document.createElement("tr");

        const numberCell = createCell(
            `#${order.id}`,
            "order-number"
        );

        const clientCell = document.createElement("td");
        const clientBox = document.createElement("div");
        clientBox.className = "order-client";

        const avatar = document.createElement("div");
        avatar.className = "order-client-avatar";
        avatar.textContent = getInitials(order.client?.name);

        const clientInfo = document.createElement("div");

        const clientName = document.createElement("span");
        clientName.className = "order-client-name";
        clientName.textContent =
            order.client?.name || "Cliente não informado";

        const clientEmail = document.createElement("span");
        clientEmail.className = "order-client-email";
        clientEmail.textContent = order.client?.email || "—";

        clientInfo.append(clientName, clientEmail);
        clientBox.append(avatar, clientInfo);
        clientCell.append(clientBox);

        const dateCell = createCell(formatDate(order.moment));

        const statusCell = document.createElement("td");
        statusCell.append(createStatusBadge(order));

        const totalCell = createCell(
            formatMoney(getOrderTotal(order)),
            "order-amount"
        );

        const actionCell = document.createElement("td");
        const button = document.createElement("button");

        button.type = "button";
        button.className = "order-view-btn";
        button.textContent = "Ver detalhes";
        button.addEventListener("click", () => viewOrder(order.id));

        actionCell.append(button);

        row.append(
            numberCell,
            clientCell,
            dateCell,
            statusCell,
            totalCell,
            actionCell
        );

        fragment.append(row);
    });

    elements.tbody.append(fragment);
    elements.table.hidden = false;
    elements.message.hidden = true;
}

/* DETALHES */

async function viewOrder(id) {
    try {
        const order = await request(`/${id}`);
        const total = formatMoney(getOrderTotal(order));

        $("#orderModalTitle").textContent = `Pedido #${order.id}`;
        $("#orderDetailTotal").textContent = total;
        $("#orderDetailFooterTotal").textContent = total;

        $("#orderDetailClient").textContent =
            order.client?.name || "Não informado";

        $("#orderDetailEmail").textContent =
            order.client?.email || "Não informado";

        $("#orderDetailDate").textContent =
            formatDate(order.moment);

        // A entidade Payment é opcional no seu modelo.
        $("#orderDetailPayment").textContent = order.payment
            ? "Pagamento registrado"
            : "Não registrado";

        const statusElement = $("#orderDetailStatus");
        const badge = createStatusBadge(order);

        statusElement.className = badge.className;
        statusElement.textContent = badge.textContent;

        renderOrderItems(getItems(order));
        openModal();

    } catch (error) {
        console.error("Erro ao consultar pedido:", error);
        alert("Não foi possível abrir os detalhes deste pedido.");
    }
}

/* ITENS */

function renderOrderItems(items) {
    const container = $("#orderItemsList");
    container.replaceChildren();

    if (items.length === 0) {
        const empty = document.createElement("p");
        empty.className = "orders-message";
        empty.textContent = "Nenhum item disponível para este pedido.";
        container.append(empty);
        return;
    }

    const fragment = document.createDocumentFragment();

    items.forEach(item => {
        const row = document.createElement("div");
        row.className = "order-item";

        const info = document.createElement("div");

        const name = document.createElement("strong");
        name.textContent =
            item.product?.name || "Produto não informado";

        const quantity = document.createElement("span");
        quantity.textContent =
            `${item.quantity ?? 0} un. × ${formatMoney(item.price)}`;

        const total = document.createElement("span");
        total.className = "order-item-total";

        const quantityNumber = Number(item.quantity);
        const priceNumber = Number(item.price);

        total.textContent =
            item.quantity != null &&
            item.price != null &&
            Number.isFinite(quantityNumber) &&
            Number.isFinite(priceNumber)
                ? formatMoney(quantityNumber * priceNumber)
                : "—";

        info.append(name, quantity);
        row.append(info, total);
        fragment.append(row);
    });

    container.append(fragment);
}

/* MODAL */

function openModal() {
    previousFocus = document.activeElement;
    elements.modal.hidden = false;
    document.body.style.overflow = "hidden";
    $("#closeOrderDetails").focus();
}

function closeModal() {
    elements.modal.hidden = true;
    document.body.style.overflow = "";

    if (previousFocus?.isConnected) {
        previousFocus.focus();
    }
}

/* EVENTOS */

elements.search.addEventListener("input", filterOrders);
elements.filter.addEventListener("change", filterOrders);
elements.refresh.addEventListener("click", loadOrders);

$("#closeOrderDetails").addEventListener("click", closeModal);
$("#doneOrderDetails").addEventListener("click", closeModal);

elements.modal.addEventListener("click", event => {
    if (event.target === elements.modal) {
        closeModal();
    }
});

document.addEventListener("keydown", event => {
    if (elements.modal.hidden) return;

    if (event.key === "Escape") {
        closeModal();
        return;
    }

    if (event.key !== "Tab") return;

    const buttons = [
        ...elements.modal.querySelectorAll("button:not(:disabled)")
    ];

    if (!buttons.length) return;

    const first = buttons[0];
    const last = buttons[buttons.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});

/* INICIALIZAÇÃO */

loadOrders();
