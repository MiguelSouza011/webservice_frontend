const CATEGORIES_API = "http://localhost:8080/categories";
const PRODUCTS_API = "http://localhost:8080/products";

const $ = selector => document.querySelector(selector);

const elements = {
    tbody: $("#categoriesTableBody"),
    message: $("#categoriesMessage"),
    table: $("#categoriesTableContainer"),
    search: $("#searchCategories"),
    refresh: $("#refreshCategories"),
    total: $("#totalCategories"),
    filtered: $("#filteredCategories"),
    associated: $("#associatedProducts"),
    count: $("#categoriesCount"),
    pagination: $("#categoriesPaginationInfo"),
    modal: $("#categoryDetailsModal")
};

const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

let categories = [];
let products = [];
let productAssociationsAvailable = false;
let loading = false;
let previousFocus = null;

/* ========================================
   REQUISIÇÕES
======================================== */

async function request(url) {
    let response;

    try {
        response = await fetch(url);
    } catch {
        throw new Error("Não foi possível carregar as informações.");
    }

    if (!response.ok) {
        throw new Error(
            response.status === 404
                ? "Registro não encontrado."
                : "Não foi possível consultar as informações."
        );
    }

    return response.json();
}

/* ========================================
   RELACIONAMENTOS
======================================== */

function getProductsForCategory(category) {
    // Se o JSON da categoria já trouxer seus produtos,
    // podemos utilizá-los diretamente.
    if (Array.isArray(category.products)) {
        return category.products;
    }

    // Alternativamente, usamos as categorias de cada produto.
    if (!productAssociationsAvailable) {
        return null;
    }

    return products.filter(product =>
        Array.isArray(product.categories) &&
        product.categories.some(related =>
            String(related.id) === String(category.id)
        )
    );
}

function formatMoney(value) {
    if (value == null || value === "") return "—";

    const number = Number(value);

    return Number.isFinite(number)
        ? currency.format(number)
        : "—";
}

/* ========================================
   LISTAGEM
======================================== */

async function loadCategories() {
    if (loading) return;

    loading = true;
    elements.refresh.disabled = true;
    elements.table.hidden = true;
    elements.message.hidden = false;
    elements.message.classList.remove("error");
    elements.message.textContent = "Carregando categorias...";

    try {
        // Categorias são obrigatórias; produtos são complementares.
        const categoryData = await request(CATEGORIES_API);

        if (!Array.isArray(categoryData)) {
            throw new Error("Formato de categorias inesperado.");
        }

        categories = categoryData;

        try {
            const productData = await request(PRODUCTS_API);

            products = Array.isArray(productData) ? productData : [];

            productAssociationsAvailable =
                Array.isArray(productData) &&
                (
                    products.some(product =>
                        Array.isArray(product.categories)
                    ) ||
                    products.length === 0
                );

        } catch (error) {
            console.warn(
                "Informações complementares dos produtos indisponíveis.",
                error
            );

            products = [];
            productAssociationsAvailable = false;
        }

        updateStatistics();
        filterCategories();

    } catch (error) {
        console.error("Erro ao carregar categorias:", error);

        categories = [];
        products = [];
        productAssociationsAvailable = false;

        elements.total.textContent = "—";
        elements.filtered.textContent = "—";
        elements.associated.textContent = "—";
        elements.count.textContent = "Indisponível";
        elements.pagination.textContent = "Nenhuma categoria exibida";

        elements.table.hidden = true;
        elements.message.hidden = false;
        elements.message.classList.add("error");
        elements.message.textContent =
            "Não foi possível carregar as categorias. Tente novamente em instantes.";

    } finally {
        loading = false;
        elements.refresh.disabled = false;
    }
}

/* ========================================
   INDICADORES
======================================== */

function updateStatistics() {
    elements.total.textContent = categories.length;

    const lists = categories.map(getProductsForCategory);

    // Só mostra um número quando as associações são conhecidas.
    if (lists.every(Array.isArray)) {
        const uniqueIds = new Set();

        lists.forEach(list => {
            list.forEach(product => {
                if (product.id != null) {
                    uniqueIds.add(String(product.id));
                }
            });
        });

        elements.associated.textContent = uniqueIds.size;
    } else {
        elements.associated.textContent = "—";
    }
}

/* ========================================
   PESQUISA
======================================== */

function filterCategories() {
    const query = elements.search.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const results = categories.filter(category =>
        [category.name, category.id].some(value =>
            String(value ?? "")
                .toLocaleLowerCase("pt-BR")
                .includes(query)
        )
    );

    renderCategories(results);
}

/* ========================================
   TABELA
======================================== */

function renderCategories(list) {
    elements.tbody.replaceChildren();

    elements.filtered.textContent = list.length;
    elements.count.textContent = `${list.length} categoria(s)`;
    elements.pagination.textContent =
        `Exibindo ${list.length} de ${categories.length} categoria(s)`;

    if (list.length === 0) {
        elements.table.hidden = true;
        elements.message.hidden = false;
        elements.message.classList.remove("error");
        elements.message.textContent = categories.length
            ? "Nenhuma categoria corresponde à sua pesquisa."
            : "Ainda não há categorias cadastradas.";
        return;
    }

    const fragment = document.createDocumentFragment();

    list.forEach(category => {
        const row = document.createElement("tr");

        const identityCell = document.createElement("td");
        const identity = document.createElement("div");
        identity.className = "category-identity";

        const icon = document.createElement("div");
        icon.className = "category-icon";
        icon.textContent = "▧";

        const info = document.createElement("div");

        const name = document.createElement("span");
        name.className = "category-name";
        name.textContent = category.name || "Sem nome";

        const subtitle = document.createElement("span");
        subtitle.className = "category-subtitle";
        subtitle.textContent = "Categoria de produtos";

        info.append(name, subtitle);
        identity.append(icon, info);
        identityCell.append(identity);

        const idCell = document.createElement("td");
        idCell.className = "category-id";
        idCell.textContent = `#${category.id}`;

        const productsCell = document.createElement("td");
        const countBadge = document.createElement("span");
        countBadge.className = "category-products-count";

        const associated = getProductsForCategory(category);

        countBadge.textContent = associated === null
            ? "Não informado"
            : `${associated.length} produto(s)`;

        productsCell.append(countBadge);

        const actionCell = document.createElement("td");
        const button = document.createElement("button");

        button.type = "button";
        button.className = "category-view-btn";
        button.textContent = "Ver detalhes";
        button.addEventListener("click", () =>
            viewCategory(category.id)
        );

        actionCell.append(button);

        row.append(
            identityCell,
            idCell,
            productsCell,
            actionCell
        );

        fragment.append(row);
    });

    elements.tbody.append(fragment);
    elements.table.hidden = false;
    elements.message.hidden = true;
}

/* ========================================
   DETALHES
======================================== */

async function viewCategory(id) {
    try {
        const category = await request(`${CATEGORIES_API}/${id}`);

        $("#categoryDetailName").textContent =
            category.name || "Sem nome";

        $("#categoryDetailId").textContent =
            `#${category.id}`;

        const associated = getProductsForCategory(category);

        $("#categoryDetailProductsCount").textContent =
            associated === null
                ? "Não informado"
                : associated.length;

        renderCategoryProducts(associated);
        openModal();

    } catch (error) {
        console.error("Erro ao consultar categoria:", error);
        alert("Não foi possível abrir os detalhes desta categoria.");
    }
}

/* ========================================
   PRODUTOS DA CATEGORIA
======================================== */

function renderCategoryProducts(list) {
    const container = $("#categoryProductsList");
    container.replaceChildren();

    if (list === null) {
        showEmpty(
            container,
            "A lista de produtos desta categoria não está disponível."
        );
        return;
    }

    if (list.length === 0) {
        showEmpty(
            container,
            "Nenhum produto vinculado a esta categoria."
        );
        return;
    }

    const fragment = document.createDocumentFragment();

    list.forEach(product => {
        const row = document.createElement("div");
        row.className = "category-product-item";

        const name = document.createElement("strong");
        name.textContent = product.name || "Produto sem nome";

        const price = document.createElement("span");
        price.textContent = formatMoney(product.price);

        row.append(name, price);
        fragment.append(row);
    });

    container.append(fragment);
}

function showEmpty(container, message) {
    const paragraph = document.createElement("p");
    paragraph.className = "category-empty";
    paragraph.textContent = message;
    container.append(paragraph);
}

/* ========================================
   MODAL
======================================== */

function openModal() {
    previousFocus = document.activeElement;
    elements.modal.hidden = false;
    document.body.style.overflow = "hidden";
    $("#closeCategoryDetails").focus();
}

function closeModal() {
    elements.modal.hidden = true;
    document.body.style.overflow = "";

    if (previousFocus?.isConnected) {
        previousFocus.focus();
    }
}

/* ========================================
   EVENTOS
======================================== */

elements.search.addEventListener("input", filterCategories);
elements.refresh.addEventListener("click", loadCategories);

$("#closeCategoryDetails").addEventListener("click", closeModal);
$("#doneCategoryDetails").addEventListener("click", closeModal);

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

/* ========================================
   INICIALIZAÇÃO
======================================== */

loadCategories();
