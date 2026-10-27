/* COMMERCEHUB — DASHBOARD */

const DASHBOARD_API = "http://localhost:8080";

const dashboardElements = {
    refresh: document.querySelector("#refreshDashboard"),
    notice: document.querySelector("#dashboardNotice"),
    totalOrders: document.querySelector("#dashboardTotalOrders"),
    totalValue: document.querySelector("#dashboardTotalValue"),
    totalProducts: document.querySelector("#dashboardTotalProducts"),
    totalUsers: document.querySelector("#dashboardTotalUsers"),
    chart: document.querySelector("#ordersChart"),
    donut: document.querySelector("#ordersDonut"),
    donutTotal: document.querySelector("#donutTotal"),
    legend: document.querySelector("#ordersLegend"),
    recentOrders: document.querySelector("#recentOrdersBody"),
    catalogProducts: document.querySelector("#catalogProducts"),
    catalogCategories: document.querySelector("#catalogCategories")
};

const dashboardCurrency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

const dashboardDate = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
});

const dashboardStatuses = [
    { code: "WAITING_PAYMENT", label: "Aguardando", color: "#f0b34c", className: "waiting" },
    { code: "PAID", label: "Pago", color: "#5587e8", className: "paid" },
    { code: "SHIPPED", label: "Enviado", color: "#8b69e8", className: "shipped" },
    { code: "DELIVERED", label: "Entregue", color: "#20b780", className: "delivered" },
    { code: "CANCELED", label: "Cancelado", color: "#e26a7d", className: "canceled" }
];

const dashboardStatusCodes = {
    1: "WAITING_PAYMENT",
    2: "PAID",
    3: "SHIPPED",
    4: "DELIVERED",
    5: "CANCELED"
};

let dashboardLoading = false;

/* CONSULTAS */

async function dashboardFetch(path) {
    const response = await fetch(`${DASHBOARD_API}${path}`);

    if (!response.ok) {
        throw new Error(`Não foi possível consultar ${path}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        throw new Error(`Dados inesperados em ${path}`);
    }

    return data;
}

/* FORMATAÇÃO */

function dashboardFormatMoney(value) {
    const number = Number(value);

    return value != null && Number.isFinite(number)
        ? dashboardCurrency.format(number)
        : "—";
}

function dashboardFormatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : dashboardDate.format(date);
}

function dashboardNormalizeStatus(value) {
    if (value == null) return "UNKNOWN";

    const normalized = String(value).trim().toUpperCase();

    if (/^[1-5]$/.test(normalized)) {
        return dashboardStatusCodes[Number(normalized)] || "UNKNOWN";
    }

    return dashboardStatuses.some(status => status.code === normalized)
        ? normalized
        : "UNKNOWN";
}

function dashboardGetStatus(order) {
    return dashboardNormalizeStatus(order.orderStatus ?? order.status);
}

function dashboardGetTotal(order) {
    if (order.total != null) {
        const total = Number(order.total);
        if (Number.isFinite(total)) return total;
    }

    if (!Array.isArray(order.items) || order.items.length === 0) {
        return null;
    }

    let total = 0;

    for (const item of order.items) {
        const quantity = Number(item.quantity);
        const price = Number(item.price);

        if (
            item.quantity == null ||
            item.price == null ||
            !Number.isFinite(quantity) ||
            !Number.isFinite(price)
        ) {
            return null;
        }

        total += quantity * price;
    }

    return total;
}

/* INDICADORES */

function dashboardUpdateOrders(orders) {
    dashboardElements.totalOrders.textContent = orders.length;

    const totals = orders.map(dashboardGetTotal);

    dashboardElements.totalValue.textContent =
        totals.every(total => total !== null)
            ? dashboardFormatMoney(
                totals.reduce((sum, total) => sum + total, 0)
            )
            : "—";

    dashboardRenderMonthlyChart(orders);
    dashboardRenderStatusChart(orders);
    dashboardRenderRecentOrders(orders);
}

/* PEDIDOS POR MÊS */

function dashboardRenderMonthlyChart(orders) {
    const container = dashboardElements.chart;
    container.replaceChildren();

    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
        const date = new Date(
            now.getFullYear(),
            now.getMonth() - i,
            1
        );

        months.push({
            year: date.getFullYear(),
            month: date.getMonth(),
            label: date.toLocaleDateString("pt-BR", {
                month: "short"
            }).replace(".", ""),
            count: 0
        });
    }

    for (const order of orders) {
        if (!order.moment) continue;

        const date = new Date(order.moment);

        if (Number.isNaN(date.getTime())) continue;

        const entry = months.find(month =>
            month.year === date.getFullYear() &&
            month.month === date.getMonth()
        );

        if (entry) entry.count++;
    }

    const maxCount = Math.max(1, ...months.map(month => month.count));

    for (const month of months) {
        const column = document.createElement("div");
        column.className = "dashboard-bar-column";

        const value = document.createElement("span");
        value.className = "dashboard-bar-value";
        value.textContent = month.count;

        const track = document.createElement("div");
        track.className = "dashboard-bar-track";

        const fill = document.createElement("div");
        fill.className = "dashboard-bar-fill";
        fill.style.height = `${(month.count / maxCount) * 100}%`;

        track.append(fill);

        const label = document.createElement("span");
        label.className = "dashboard-bar-label";
        label.textContent = month.label;

        column.append(value, track, label);
        container.append(column);
    }
}

/* STATUS DOS PEDIDOS */

function dashboardRenderStatusChart(orders) {
    const total = orders.length;

    dashboardElements.donutTotal.textContent = total;
    dashboardElements.legend.replaceChildren();

    const counts = dashboardStatuses.map(status => ({
        ...status,
        count: orders.filter(order =>
            dashboardGetStatus(order) === status.code
        ).length
    }));

    const unknownCount = orders.filter(order =>
        dashboardGetStatus(order) === "UNKNOWN"
    ).length;

    if (unknownCount > 0) {
        counts.push({
            code: "UNKNOWN",
            label: "Outros",
            color: "#b4b8c9",
            className: "unknown",
            count: unknownCount
        });
    }

    let currentPercentage = 0;
    const segments = [];

    for (const status of counts) {
        if (status.count === 0 || total === 0) continue;

        const percentage = (status.count / total) * 100;

        segments.push(
            `${status.color} ${currentPercentage}% ${currentPercentage + percentage}%`
        );

        currentPercentage += percentage;
    }

    dashboardElements.donut.style.background = total > 0
        ? `conic-gradient(${segments.join(", ")})`
        : "#e9eaf4";

    for (const status of counts) {
        const item = document.createElement("div");
        item.className = "dashboard-legend-item";

        const name = document.createElement("span");
        name.className = "dashboard-legend-name";

        const dot = document.createElement("span");
        dot.className = "dashboard-legend-dot";
        dot.style.backgroundColor = status.color;

        name.append(dot, document.createTextNode(status.label));

        const count = document.createElement("strong");
        count.textContent = status.count;

        item.append(name, count);
        dashboardElements.legend.append(item);
    }
}

/* PEDIDOS RECENTES */

function dashboardRenderRecentOrders(orders) {
    const tbody = dashboardElements.recentOrders;
    tbody.replaceChildren();

    const sorted = [...orders]
        .sort((a, b) => {
            const dateA = Date.parse(a.moment) || 0;
            const dateB = Date.parse(b.moment) || 0;
            return dateB - dateA;
        })
        .slice(0, 5);

    if (sorted.length === 0) {
        dashboardSetTableMessage("Nenhum pedido registrado.");
        return;
    }

    for (const order of sorted) {
        const row = document.createElement("tr");

        const idCell = document.createElement("td");
        idCell.className = "dashboard-order-id";
        idCell.textContent = `#${order.id}`;

        const clientCell = document.createElement("td");
        const clientName = document.createElement("span");
        clientName.className = "dashboard-client-name";
        clientName.textContent = order.client?.name || "Não informado";
        clientCell.append(clientName);

        const dateCell = document.createElement("td");
        dateCell.textContent = dashboardFormatDate(order.moment);

        const statusCell = document.createElement("td");
        const statusCode = dashboardGetStatus(order);

        const statusConfig = dashboardStatuses.find(status =>
            status.code === statusCode
        );

        const badge = document.createElement("span");
        badge.className = `dashboard-status ${statusConfig?.className || "unknown"}`;
        badge.textContent = statusConfig?.label || "Não informado";
        statusCell.append(badge);

        const valueCell = document.createElement("td");
        valueCell.className = "dashboard-order-value";
        valueCell.textContent = dashboardFormatMoney(
            dashboardGetTotal(order)
        );

        row.append(
            idCell,
            clientCell,
            dateCell,
            statusCell,
            valueCell
        );

        tbody.append(row);
    }
}

function dashboardSetTableMessage(message) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");

    cell.colSpan = 5;
    cell.className = "dashboard-empty-cell";
    cell.textContent = message;

    row.append(cell);
    dashboardElements.recentOrders.replaceChildren(row);
}

/* CARREGAMENTO */

async function loadDashboard() {
    if (dashboardLoading) return;

    dashboardLoading = true;
    dashboardElements.refresh.disabled = true;
    dashboardElements.notice.hidden = true;

    // Limpa indicadores antigos enquanto atualiza.
    dashboardElements.totalOrders.textContent = "—";
    dashboardElements.totalValue.textContent = "—";
    dashboardElements.totalProducts.textContent = "—";
    dashboardElements.totalUsers.textContent = "—";
    dashboardElements.catalogProducts.textContent = "—";
    dashboardElements.catalogCategories.textContent = "—";
    dashboardElements.donutTotal.textContent = "—";
    dashboardElements.donut.style.background = "#e9eaf4";
    dashboardElements.legend.textContent = "Carregando...";
    dashboardElements.chart.textContent = "Carregando...";
    dashboardSetTableMessage("Carregando pedidos...");

    const endpoints = [
        "/orders",
        "/products",
        "/users",
        "/categories"
    ];

    const results = await Promise.allSettled(
        endpoints.map(endpoint => dashboardFetch(endpoint))
    );

    const [ordersResult, productsResult, usersResult, categoriesResult] = results;

    if (ordersResult.status === "fulfilled") {
        dashboardUpdateOrders(ordersResult.value);
    } else {
        dashboardElements.chart.textContent = "Dados indisponíveis.";
        dashboardElements.legend.textContent = "Dados indisponíveis.";
        dashboardSetTableMessage("Não foi possível carregar os pedidos.");
    }

    if (productsResult.status === "fulfilled") {
        const total = productsResult.value.length;
        dashboardElements.totalProducts.textContent = total;
        dashboardElements.catalogProducts.textContent = total;
    }

    if (usersResult.status === "fulfilled") {
        dashboardElements.totalUsers.textContent = usersResult.value.length;
    }

    if (categoriesResult.status === "fulfilled") {
        dashboardElements.catalogCategories.textContent =
            categoriesResult.value.length;
    }

    if (results.some(result => result.status === "rejected")) {
        dashboardElements.notice.textContent =
            "Algumas informações não puderam ser atualizadas. Tente novamente em instantes.";
        dashboardElements.notice.hidden = false;
    }

    dashboardLoading = false;
    dashboardElements.refresh.disabled = false;
}

dashboardElements.refresh.addEventListener("click", loadDashboard);

loadDashboard();
