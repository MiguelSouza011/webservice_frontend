const API_URL = "http://localhost:8080/users";
const $ = selector => document.querySelector(selector);

const elements = {
    tbody: $("#usersTableBody"),
    message: $("#usersMessage"),
    table: $("#tableContainer"),
    search: $("#searchUsers"),
    refresh: $("#refreshUsers"),
    total: $("#totalUsers"),
    filtered: $("#filteredUsers"),
    counter: $("#resultCounter"),
    pagination: $("#paginationInfo"),

    detailsModal: $("#userModal"),
    formModal: $("#userFormModal"),
    deleteModal: $("#deleteUserModal"),

    form: $("#userForm"),
    formTitle: $("#userFormTitle"),
    formError: $("#userFormError"),
    saveButton: $("#saveUserButton"),

    id: $("#userId"),
    name: $("#userName"),
    email: $("#userEmail"),
    phone: $("#userPhone"),
    password: $("#userPassword"),
    passwordLabel: $("#passwordLabel"),
    passwordHelp: $("#passwordHelp"),

    deleteName: $("#deleteUserName"),
    deleteError: $("#deleteUserError"),
    confirmDelete: $("#confirmDeleteUser")
};

let users = [];
let selectedUserId = null;
let editing = false;
let loading = false;
let previousFocus = null;

/* REQUISIÇÕES */

async function request(path = "", options = {}) {
    const response = await fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
            ...(options.body ? {
                "Content-Type": "application/json"
            } : {}),
            ...options.headers
        }
    });

    if (!response.ok) {
        const messages = {
            400: "Confira os dados informados.",
            401: "Sua sessão precisa ser autenticada.",
            403: "Você não tem permissão para realizar esta ação.",
            404: "O usuário não foi encontrado.",
            409: "Não foi possível concluir devido a um conflito de dados."
        };

        throw new Error(
            messages[response.status] ||
            "Não foi possível concluir a operação. Tente novamente."
        );
    }

    if (response.status === 204) return null;

    const type = response.headers.get("content-type") || "";

    return type.includes("application/json")
        ? response.json()
        : null;
}

/* LISTAGEM */

async function loadUsers() {
    if (loading) return;

    loading = true;
    elements.refresh.disabled = true;

    elements.table.hidden = true;
    elements.message.hidden = false;
    elements.message.classList.remove("error");
    elements.message.textContent = "Carregando usuários...";

    try {
        const result = await request();

        if (!Array.isArray(result)) {
            throw new Error("Não foi possível carregar os cadastros.");
        }

        users = result;
        elements.total.textContent = users.length;

        filterUsers();

    } catch (error) {
        console.error("Erro na listagem:", error);

        users = [];
        elements.total.textContent = "—";
        elements.filtered.textContent = "—";
        elements.counter.textContent = "Indisponível";
        elements.pagination.textContent = "Nenhum registro exibido";

        elements.table.hidden = true;
        elements.message.hidden = false;
        elements.message.classList.add("error");
        elements.message.textContent =
            "Não foi possível carregar os usuários. Tente novamente em instantes.";

    } finally {
        loading = false;
        elements.refresh.disabled = false;
    }
}

/* PESQUISA */

function filterUsers() {
    const query = elements.search.value
        .trim()
        .toLocaleLowerCase("pt-BR");

    const results = users.filter(user => {
        return [
            user.name,
            user.email,
            user.id
        ].some(value =>
            String(value ?? "")
                .toLocaleLowerCase("pt-BR")
                .includes(query)
        );
    });

    renderUsers(results);
}

/* TABELA */

function renderUsers(list) {
    elements.tbody.replaceChildren();

    elements.filtered.textContent = list.length;
    elements.counter.textContent = `${list.length} resultado(s)`;
    elements.pagination.textContent =
        `Exibindo ${list.length} de ${users.length} usuário(s)`;

    if (!list.length) {
        elements.table.hidden = true;
        elements.message.hidden = false;
        elements.message.classList.remove("error");
        elements.message.textContent = users.length
            ? "Nenhum usuário corresponde à sua pesquisa."
            : "Ainda não há usuários cadastrados.";
        return;
    }

    const fragment = document.createDocumentFragment();

    for (const user of list) {
        const row = document.createElement("tr");

        const identityCell = document.createElement("td");
        const identity = document.createElement("div");
        identity.className = "user-identity";

        const avatar = document.createElement("div");
        avatar.className = "user-avatar";
        avatar.textContent = initials(user.name);

        const textBox = document.createElement("div");

        const name = document.createElement("span");
        name.className = "user-name";
        name.textContent = user.name || "Sem nome";

        const subtitle = document.createElement("span");
        subtitle.className = "user-subtitle";
        subtitle.textContent = "Cadastro #" + user.id;

        textBox.append(name, subtitle);
        identity.append(avatar, textBox);
        identityCell.append(identity);

        const emailCell = cell(user.email || "Não informado");
        const phoneCell = cell(user.phone || "Não informado");
        const idCell = cell(user.id ?? "—");
        idCell.className = "user-id";

        const actionCell = document.createElement("td");
        const actions = document.createElement("div");
        actions.className = "table-actions";

        actions.append(
            actionButton("Ver", "details-btn", () => viewUser(user.id)),
            actionButton("Editar", "edit-btn", () => editUser(user.id)),
            actionButton("Excluir", "delete-btn", () => confirmRemoval(user))
        );

        actionCell.append(actions);

        row.append(
            identityCell,
            emailCell,
            phoneCell,
            idCell,
            actionCell
        );

        fragment.append(row);
    }

    elements.tbody.append(fragment);
    elements.table.hidden = false;
    elements.message.hidden = true;
}

function cell(value) {
    const td = document.createElement("td");
    td.textContent = String(value);
    return td;
}

function actionButton(label, className, callback) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = className;
    button.textContent = label;
    button.addEventListener("click", callback);
    return button;
}

function initials(value) {
    return String(value || "Usuário")
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(word => word[0].toUpperCase())
        .join("");
}

/* MODAIS */

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

function showError(element, message) {
    element.textContent = message;
    element.hidden = false;
}

/* VISUALIZAR */

async function viewUser(id) {
    try {
        const user = await request(`/${id}`);

        $("#modalAvatar").textContent = initials(user.name);
        $("#modalName").textContent = user.name || "Sem nome";
        $("#modalEmail").textContent = user.email || "Não informado";
        $("#modalId").textContent = user.id ?? "—";
        $("#modalPhone").textContent = user.phone || "Não informado";

        openModal(elements.detailsModal);
    } catch (error) {
        alert(error.message);
    }
}

/* NOVO USUÁRIO */

function newUser() {
    editing = false;
    selectedUserId = null;

    elements.form.reset();
    elements.id.value = "";
    elements.formTitle.textContent = "Novo usuário";
    elements.saveButton.textContent = "Cadastrar usuário";

    elements.password.required = true;
    elements.password.value = "";
    elements.passwordLabel.textContent = "Senha";
    elements.passwordHelp.textContent = "Escolha uma senha segura.";

    elements.formError.hidden = true;

    openModal(elements.formModal);
    elements.name.focus();
}

/* EDITAR */

async function editUser(id) {
    try {
        const user = await request(`/${id}`);

        editing = true;
        selectedUserId = id;

        elements.form.reset();
        elements.id.value = user.id;
        elements.name.value = user.name ?? "";
        elements.email.value = user.email ?? "";
        elements.phone.value = user.phone ?? "";

        elements.password.value = "";
        elements.password.required = false;
        elements.passwordLabel.textContent = "Nova senha (opcional)";
        elements.passwordHelp.textContent =
            "Deixe em branco para manter a senha atual.";

        elements.formTitle.textContent = "Editar usuário";
        elements.saveButton.textContent = "Salvar alterações";
        elements.formError.hidden = true;

        openModal(elements.formModal);
        elements.name.focus();
    } catch (error) {
        alert(error.message);
    }
}

/* SALVAR */

async function saveUser(event) {
    event.preventDefault();

    if (!elements.form.reportValidity()) return;

    const data = {
        name: elements.name.value.trim(),
        email: elements.email.value.trim(),
        phone: elements.phone.value.trim()
    };

    const password = elements.password.value;

    if (!editing || password.length > 0) {
        data.password = password;
    }

    elements.formError.hidden = true;
    elements.saveButton.disabled = true;
    elements.saveButton.textContent = "Salvando...";

    try {
        await request(editing ? `/${selectedUserId}` : "", {
            method: editing ? "PUT" : "POST",
            body: JSON.stringify(data)
        });

        closeModal(elements.formModal);
        elements.form.reset();

        await loadUsers();
    } catch (error) {
        showError(elements.formError, error.message);
    } finally {
        elements.saveButton.disabled = false;
        elements.saveButton.textContent = editing
            ? "Salvar alterações"
            : "Cadastrar usuário";
    }
}

/* EXCLUSÃO */

function confirmRemoval(user) {
    selectedUserId = user.id;
    elements.deleteName.textContent = user.name || `#${user.id}`;
    elements.deleteError.hidden = true;
    openModal(elements.deleteModal);
}

async function removeUser() {
    if (selectedUserId == null) return;

    elements.confirmDelete.disabled = true;
    elements.confirmDelete.textContent = "Excluindo...";
    elements.deleteError.hidden = true;

    try {
        await request(`/${selectedUserId}`, {
            method: "DELETE"
        });

        closeModal(elements.deleteModal);
        selectedUserId = null;

        await loadUsers();
    } catch (error) {
        showError(
            elements.deleteError,
            "Não foi possível excluir este usuário. Verifique se há pedidos associados."
        );
    } finally {
        elements.confirmDelete.disabled = false;
        elements.confirmDelete.textContent = "Excluir usuário";
    }
}

/* EVENTOS */

elements.search.addEventListener("input", filterUsers);
elements.refresh.addEventListener("click", loadUsers);

$("#createUserButton").addEventListener("click", newUser);
elements.form.addEventListener("submit", saveUser);

$("#closeModal").addEventListener("click", () =>
    closeModal(elements.detailsModal)
);
$("#doneModal").addEventListener("click", () =>
    closeModal(elements.detailsModal)
);

$("#closeUserForm").addEventListener("click", () =>
    closeModal(elements.formModal)
);
$("#cancelUserForm").addEventListener("click", () =>
    closeModal(elements.formModal)
);

$("#cancelDeleteUser").addEventListener("click", () =>
    closeModal(elements.deleteModal)
);
elements.confirmDelete.addEventListener("click", removeUser);

const modals = [
    elements.detailsModal,
    elements.formModal,
    elements.deleteModal
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
            'button:not(:disabled), input:not(:disabled):not([type="hidden"])'
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

/* INICIALIZAÇÃO */

loadUsers();
