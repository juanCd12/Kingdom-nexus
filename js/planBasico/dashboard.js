(function () {
    const app = window.KingdomBasicApp = {
        modules: {},
        authUser: JSON.parse(sessionStorage.getItem("authUser") || "null"),
        subscription: JSON.parse(sessionStorage.getItem("subscription") || "null"),
        planLabels: {
            basic: "Plan Básico",
            professional: "Plan Profesional",
            enterprise: "Plan Empresarial"
        },
        planPrices: {
            basic: "$49.900",
            professional: "$99.900",
            enterprise: "$199.900"
        },
        products: [
            { name: "Arroz Premium 25kg", category: "Granos", stock: 42, price: "$82.000", status: "Disponible" },
            { name: "Leche Entera 1L", category: "Lácteos", stock: 18, price: "$4.200", status: "Bajo" },
            { name: "Jabón Líquido 500ml", category: "Aseo", stock: 36, price: "$7.800", status: "Disponible" },
            { name: "Atún en Agua", category: "Enlatados", stock: 12, price: "$3.900", status: "Bajo" }
        ],
        inventory: [
            { sku: "GR-025", product: "Arroz Premium 25kg", stock: 42, location: "Bodega A", status: "Bueno" },
            { sku: "LT-118", product: "Leche Entera 1L", stock: 18, location: "Refrigerador", status: "Bajo" },
            { sku: "AS-308", product: "Jabón Líquido 500ml", stock: 36, location: "Pasillo 2", status: "Bueno" },
            { sku: "EN-410", product: "Atún en Agua", stock: 12, location: "Anaquel 4", status: "Bajo" }
        ],
        entries: [
            { date: "2026-08-29", product: "Arroz Premium 25kg", quantity: 30, origin: "Proveedor Norte", user: "Ana" },
            { date: "2026-08-28", product: "Jabón Líquido 500ml", quantity: 20, origin: "Distribuidora Clean", user: "Luis" },
            { date: "2026-08-27", product: "Leche Entera 1L", quantity: 40, origin: "Lácteos del Valle", user: "María" }
        ],
        exits: [
            { date: "2026-08-30", product: "Arroz Premium 25kg", quantity: 8, destination: "Tienda principal", reason: "Venta" },
            { date: "2026-08-29", product: "Leche Entera 1L", quantity: 12, destination: "Restaurante local", reason: "Consumo" },
            { date: "2026-08-28", product: "Atún en Agua", quantity: 6, destination: "Punto de venta", reason: "Venta" }
        ],
        registerModule(name, moduleApi) {
            this.modules[name] = moduleApi;
            if (typeof moduleApi.bind === "function") {
                moduleApi.bind();
            }
            if (typeof moduleApi.render === "function") {
                moduleApi.render();
            }
        },
        refreshAll() {
            Object.values(this.modules).forEach((module) => {
                if (typeof module.render === "function") {
                    module.render();
                }
            });
        },
        renderUserMeta() {
            const userName = document.getElementById("userName");
            const userEmail = document.getElementById("userEmail");
            const userInitials = document.getElementById("userInitials");
            const sidebarPlanName = document.getElementById("sidebarPlanName");
            const sidebarPlanPrice = document.getElementById("sidebarPlanPrice");
            const nextCharge = document.getElementById("nextCharge");
            const currentPlan = this.authUser?.plan || this.subscription?.plan || "basic";
            const currentPlanName = this.planLabels[currentPlan] || "Plan Básico";
            const currentPrice = this.planPrices[currentPlan] || "$49.900";

            if (userName) {
                userName.textContent = this.authUser?.firstName || "Usuario";
            }

            if (userEmail) {
                userEmail.textContent = this.authUser?.email || "usuario@ejemplo.com";
            }

            if (userInitials) {
                const initial = (this.authUser?.firstName || "U").charAt(0).toUpperCase();
                userInitials.textContent = initial;
            }

            if (sidebarPlanName) {
                sidebarPlanName.textContent = currentPlanName;
            }

            if (sidebarPlanPrice) {
                sidebarPlanPrice.textContent = `${currentPrice} / mes`;
            }

            if (nextCharge) {
                nextCharge.textContent = currentPrice;
            }
        },
        initTabs() {
            const tabs = document.querySelectorAll(".module-tab");
            const panels = document.querySelectorAll(".module-panel");

            tabs.forEach((tab) => {
                tab.addEventListener("click", () => {
                    const selected = tab.dataset.module;
                    tabs.forEach((item) => item.classList.toggle("active", item === tab));
                    panels.forEach((panel) => {
                        const isActive = panel.dataset.panel === selected;
                        panel.classList.toggle("active", isActive);
                    });
                });
            });
        },
        initSidebarNav() {
            const navItems = document.querySelectorAll(".nav-item");
            const sections = document.querySelectorAll("[data-view-section]");

            navItems.forEach((item) => {
                item.addEventListener("click", () => {
                    const view = item.dataset.view;
                    navItems.forEach((nav) => nav.classList.toggle("active", nav === item));

                    if (view === "dashboard") {
                        sections.forEach((section) => {
                            const isDashboard = section.dataset.viewSection === "dashboard";
                            section.style.display = isDashboard ? "block" : "none";
                        });
                        document.querySelector('[data-view-section="module"]').style.display = "none";
                        return;
                    }

                    const allowedViews = ["products", "inventory", "entries", "exits", "reports"];
                    if (allowedViews.includes(view)) {
                        const targetPanel = view === "reports" ? "reports" : view;
                        const moduleTab = document.querySelector(`.module-tab[data-module="${targetPanel}"]`);
                        if (moduleTab) {
                            moduleTab.click();
                        }
                        document.querySelector('[data-view-section="module"]').style.display = "block";
                        sections.forEach((section) => {
                            if (section.dataset.viewSection === "dashboard") {
                                section.style.display = "none";
                            }
                        });
                    }
                });
            });
        },
        init() {
            this.renderUserMeta();
            this.initTabs();
            this.initSidebarNav();
            this.refreshAll();
        }
    };

    app.init();
})();

