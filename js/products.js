const PRODUCTS_API = "http://localhost:8080/products";
const $ = selector => document.querySelector(selector);

const el = {
    tbody: $("#productsTableBody"),
    message: $("#productsMessage"),
    table: $("#productsTableContainer"),
    search: $("#searchProducts"),
    refresh: $("#refreshProducts"),
    total: $("#totalProducts"),
    filtered: $("#filteredProducts"),
    average: $("#averagePrice"),
    counter: $("#productResultCounter"),
    pagination: $("#productsPaginationInfo"),

    detailsModal: $("#productDetailsModal"),
    formModal: $("#productFormModal"),
    deleteModal: $("#deleteProductModal"),

    form: $("#productForm"),
    formTitle: $("#productFormTitle"),
    formError: $("#productFormError"),
    save: $("#saveProductButton"),

    name: $("#productName"),
    description: $("#productDescription"),
    price: $("#productPrice"),
    imageUrl: $("#productImageUrl"),

    deleteName: $("#deleteProductName"),
    deleteError: $("#deleteProductError"),
    confirmDelete: $("#confirmDeleteProduct")
};

const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

let products = [];
let selectedProductId = null;
let editing = false;
let loading = false;
let previousFocus = null;

/* ========================================
   HTTP
======================================== */

async function request(path = "", options = {}) {
    let response;

    try {
        response = await fetch(`${PRODUCTS_API}${path}`, {
            ...options,
            headers: {
                ...(options.body
                    ? { "Content-Type": "application/json" }
                    : {}),
                ...options.headers
            }
        });
    } catch {
        throw new Error(
            "Não foi possível completar a solicitação. Tente novamente."
        );
    }

    if (!response.ok) {
        const messages = {
            400: "Confira os dados informados.",
            401: "É necessário entrar na sua conta.",
            403: "Você não tem permissão para esta operação.",
            404: "O produto não foi encontrado.",
            405: "Esta operação não está disponível.",
            409: "Não foi possível concluir devido a um conflito de dados."
        };

        throw new Error(
            messages[response.status] ||
            "Não foi possível concluir a operação."
        );
    }

    if (response.status === 204) return null;

    const contentType = response.headers.get("content-type") || "";

    return contentType.includes("application/json")
        ? response.json()
        : null;
}

/* ========================================
   UTILITÁRIOS
======================================== */

function formatPrice(value) {
    const number = Number(value);

    return Number.isFinite(number)
        ? currency.format(number)
        : "Não informado";
}

function createCell(value, className = "") {
    const td = document.createElement("td");
    td.textContent = String(value);
    if (className) td.className = className;
    return td;
}

function createButton(label, className, handler) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", handler);
    return button;
}

function createProductImage(url, className) {
    const container = document.createElement("div");
    container.className = className;
    container.textContent = "◈";

    if (!url) return container;

    try {
        const parsed = new URL(url);

        if (!["http:", "https:"].includes(parsed.protocol)) {
            return container;
        }

        const img = document.createElement("img");
        img.alt = "";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";

        img.addEventListener("load", () => {
            container.replaceChildren(img);
        });

        img.addEventListener("error", () => {
            container.textContent = "◈";
        });

        img.src = parsed.href;
    } catch {
        // Mantém o ícone quando a URL é inválida.
    }

    return container;
}

function showError(element, message) {
    element.textContent = message;
    element.hidden = false;
}

/* ========================================
   LISTAGEM
======================================== */

async function loadProducts() {
    if (loading) return;

    loading = true;
    el.refresh.disabled = true;
    el.table.hidden = true;
    el.message.hidden = false;
    el.message.classList.remove("error");
    el.message.textContent = "Carregando produtos...";

    try {
        const result = await request();

        if (!Array.isArray(result)) {
            throw new Error("Formato de dados inesperado.");
        }

        products = result;
        el.total.textContent = products.length;

        const prices = products
            .map(product => product.price)
            .filter(price =>
                price !== null &&
                price !== undefined &&
                price !== "" &&
                Number.isFinite(Number(price))
            )
            .map(Number);

        el.average.textContent = prices.length
            ? formatPrice(
                prices.reduce((sum, price) => sum + price, 0) /
                prices.length
            )
            : "—";

        filterProducts();

    } catch (error) {
        console.error("Erro ao carregar produtos:", error);

        products = [];
        el.total.textContent = "—";
        el.filtered.textContent = "—";
        el.average.textContent = "—";
        el.counter.textContent = "Indisponível";
        el.pagination.textContent = "Nenhum produto exibido";
        el.table.hidden = true;
        el.message.hidden = false;
        el.message.classList.add("error");
        el.message.textContent =
            "Não foi possível carregar os produtos. Tente novamente em instantes.";

    } finally {
        loading = false;
        el.refresh.disabled = false;
    }
}

/* ========================================
   PESQUISA
======================================== */

function filterProducts() {
    const query = el.search.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const results = products.filter(product =>
        [product.name, product.description, product.id]
            .some(value =>
                String(value ?? "")
                    .toLocaleLowerCase("pt-BR")
                    .includes(query)
            )
    );

    renderProducts(results);
}

/* ========================================
   TABELA
======================================== */

function renderProducts(list) {
    el.tbody.replaceChildren();

    el.filtered.textContent = list.length;
    el.counter.textContent = `${list.length} resultado(s)`;
    el.pagination.textContent =
        `Exibindo ${list.length} de ${products.length} produto(s)`;

    if (list.length === 0) {
        el.table.hidden = true;
        el.message.hidden = false;
        el.message.classList.remove("error");
        el.message.textContent = products.length
            ? "Nenhum produto corresponde à sua pesquisa."
            : "Ainda não há produtos cadastrados.";
        return;
    }

    const fragment = document.createDocumentFragment();

    list.forEach(product => {
        const row = document.createElement("tr");

        const identityCell = document.createElement("td");
        const identity = document.createElement("div");
        identity.className = "product-identity";

        const image = createProductImage(
            product.imgUrl,
            "product-thumb"
        );

        const textBox = document.createElement("div");

        const name = document.createElement("span");
        name.className = "product-name";
        name.textContent = product.name || "Sem nome";

        const subtitle = document.createElement("span");
        subtitle.className = "product-subtitle";
        subtitle.textContent = `Produto #${product.id}`;

        textBox.append(name, subtitle);
        identity.append(image, textBox);
        identityCell.append(identity);

        const descriptionCell = createCell(
            product.description || "Sem descrição",
            "product-description-cell"
        );

        const priceCell = createCell(
            formatPrice(product.price),
            "product-price"
        );

        const idCell = createCell(
            product.id ?? "—",
            "product-id"
        );

        const actionsCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "product-table-actions";

        actions.append(
            createButton(
                "Ver",
                "product-details-btn",
                () => viewProduct(product.id)
            ),
            createButton(
                "Editar",
                "product-edit-btn",
                () => editProduct(product.id)
            ),
            createButton(
                "Excluir",
                "product-delete-btn",
                () => confirmRemoval(product)
            )
        );

        actionsCell.append(actions);

        row.append(
            identityCell,
            descriptionCell,
            priceCell,
            idCell,
            actionsCell
        );

        fragment.append(row);
    });

    el.tbody.append(fragment);
    el.table.hidden = false;
    el.message.hidden = true;
}

/* ========================================
   MODAIS
======================================== */

function openModal(modal) {
    previousFocus = document.activeElement;
    modal.hidden = false;
    document.body.style.overflow = "hidden";
    modal.querySelector("button")?.focus();
}

function closeModal(modal) {
    modal.hidden = true;
    document.body.style.overflow = "";

    if (previousFocus?.isConnected) {
        previousFocus.focus();
    }
}

/* ========================================
   DETALHES — GET /products/{id}
======================================== */

async function viewProduct(id) {
    try {
        const product = await request(`/${id}`);

        $("#detailProductName").textContent =
            product.name || "Sem nome";

        $("#detailProductPrice").textContent =
            formatPrice(product.price);

        $("#detailProductId").textContent =
            product.id ?? "—";

        $("#detailProductDescription").textContent =
            product.description || "Sem descrição";

        $("#detailProductImageUrl").textContent =
            product.imgUrl || "Não informada";

        const imageContainer = $("#detailImageContainer");
        imageContainer.replaceChildren();

        const image = createProductImage(
            product.imgUrl,
            "product-detail-image"
        );

        // Mantém a classe do elemento já existente.
        imageContainer.replaceWith(image);
        image.id = "detailImageContainer";

        openModal(el.detailsModal);
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

/* ========================================
   CADASTRO — POST /products
======================================== */

function newProduct() {
    editing = false;
    selectedProductId = null;

    el.form.reset();
    el.formTitle.textContent = "Novo produto";
    el.save.textContent = "Cadastrar produto";
    el.formError.hidden = true;

    openModal(el.formModal);
    el.name.focus();
}

/* ========================================
   EDIÇÃO — GET /products/{id}
======================================== */

async function editProduct(id) {
    try {
        const product = await request(`/${id}`);

        editing = true;
        selectedProductId = id;

        el.form.reset();
        el.name.value = product.name ?? "";
        el.description.value = product.description ?? "";
        el.price.value = product.price ?? "";
        el.imageUrl.value = product.imgUrl ?? "";

        el.formTitle.textContent = "Editar produto";
        el.save.textContent = "Salvar alterações";
        el.formError.hidden = true;

        openModal(el.formModal);
        el.name.focus();
    } catch (error) {
        console.error(error);
        alert(error.message);
    }
}

/* ========================================
   SALVAR — POST / PUT
======================================== */

async function saveProduct(event) {
    event.preventDefault();

    if (!el.form.reportValidity()) return;

    const data = {
        name: el.name.value.trim(),
        description: el.description.value.trim(),
        price: Number(el.price.value),
        imgUrl: el.imageUrl.value.trim()
    };

    if (!Number.isFinite(data.price) || data.price < 0) {
        showError(el.formError, "Informe um preço válido.");
        return;
    }

    el.formError.hidden = true;
    el.save.disabled = true;
    el.save.textContent = "Salvando...";

    try {
        await request(
            editing ? `/${selectedProductId}` : "",
            {
                method: editing ? "PUT" : "POST",
                body: JSON.stringify(data)
            }
        );

        closeModal(el.formModal);
        el.form.reset();
        await loadProducts();

    } catch (error) {
        console.error("Erro ao salvar produto:", error);
        showError(el.formError, error.message);

    } finally {
        el.save.disabled = false;
        el.save.textContent = editing
            ? "Salvar alterações"
            : "Cadastrar produto";
    }
}

/* ========================================
   EXCLUSÃO — DELETE /products/{id}
======================================== */

function confirmRemoval(product) {
    selectedProductId = product.id;
    el.deleteName.textContent =
        product.name || `Produto #${product.id}`;

    el.deleteError.hidden = true;
    openModal(el.deleteModal);
}

async function removeProduct() {
    if (selectedProductId == null) return;

    el.confirmDelete.disabled = true;
    el.confirmDelete.textContent = "Excluindo...";
    el.deleteError.hidden = true;

    try {
        await request(`/${selectedProductId}`, {
            method: "DELETE"
        });

        closeModal(el.deleteModal);
        selectedProductId = null;

        await loadProducts();

    } catch (error) {
        console.error("Erro ao excluir produto:", error);

        showError(
            el.deleteError,
            "Não foi possível excluir este produto. Ele pode estar associado a pedidos."
        );

    } finally {
        el.confirmDelete.disabled = false;
        el.confirmDelete.textContent = "Excluir produto";
    }
}

/* ========================================
   EVENTOS
======================================== */

el.search.addEventListener("input", filterProducts);
el.refresh.addEventListener("click", loadProducts);

$("#createProductButton").addEventListener("click", newProduct);
el.form.addEventListener("submit", saveProduct);

$("#closeProductDetails").addEventListener("click", () =>
    closeModal(el.detailsModal)
);

$("#doneProductDetails").addEventListener("click", () =>
    closeModal(el.detailsModal)
);

$("#closeProductForm").addEventListener("click", () =>
    closeModal(el.formModal)
);

$("#cancelProductForm").addEventListener("click", () =>
    closeModal(el.formModal)
);

$("#cancelDeleteProduct").addEventListener("click", () =>
    closeModal(el.deleteModal)
);

el.confirmDelete.addEventListener("click", removeProduct);

const modals = [
    el.detailsModal,
    el.formModal,
    el.deleteModal
];

modals.forEach(modal => {
    modal.addEventListener("click", event => {
        if (event.target === modal) {
            closeModal(modal);
        }
    });
});

document.addEventListener("keydown", event => {
    const active = modals.find(modal => !modal.hidden);

    if (!active) return;

    if (event.key === "Escape") {
        closeModal(active);
        return;
    }

    if (event.key !== "Tab") return;

    const focusable = [
        ...active.querySelectorAll(
            "button:not(:disabled), input:not(:disabled), textarea:not(:disabled)"
        )
    ].filter(element => element.getClientRects().length > 0);

    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
});

/* ========================================
   INICIALIZAÇÃO
======================================== */

loadProducts();
