const menuToggle = document.querySelector("#menuToggle");
const sidebar = document.querySelector("#sidebar");
const overlay = document.querySelector("#overlay");

// ABRIR MENU
function openMenu() {
    sidebar.classList.add("open");
    overlay.classList.add("show");

    menuToggle.setAttribute("aria-expanded", "true");
    menuToggle.setAttribute("aria-label", "Fechar menu");
}

// FECHAR MENU
function closeMenu() {
    sidebar.classList.remove("open");
    overlay.classList.remove("show");

    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Abrir menu");
}

// CLIQUE NO BOTÃO
menuToggle.addEventListener("click", () => {
    const isOpen = sidebar.classList.contains("open");

    if (isOpen) {
        closeMenu();
    } else {
        openMenu();
    }
});

// CLIQUE FORA DO MENU
overlay.addEventListener("click", closeMenu);

// TECLA ESC
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeMenu();
    }
});

// FECHAR AO VOLTAR PARA DESKTOP
window.addEventListener("resize", () => {
    if (window.innerWidth > 768) {
        closeMenu();
    }
});
