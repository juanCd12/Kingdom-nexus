const form = document.getElementById("registerForm");
const params = new URLSearchParams(window.location.search);
const plan = params.get("plan");
const validPlans = ["basic", "professional", "enterprise"];
const selectedPlanValue = validPlans.includes(plan) ? plan : "basic";

const planCatalog = {
    basic: {
        name: "Básico",
        price: "$49.900",
        features: [
            "1 sucursal",
            "Gestión de productos",
            "Control de inventario",
            "Entradas y salidas",
            "Alertas de stock bajo",
            "Hasta 2 usuarios"
        ]
    },
    professional: {
        name: "Profesional",
        price: "$99.900",
        features: [
            "Hasta 5 sucursales",
            "Gestión completa de productos",
            "Reportes avanzados",
            "Clientes y proveedores",
            "Compras y ventas",
            "Hasta 10 usuarios"
        ]
    },
    enterprise: {
        name: "Empresarial",
        price: "$199.900",
        features: [
            "Sucursales ilimitadas",
            "Multiusuario avanzado",
            "Auditoría y permisos",
            "Soporte prioritario",
            "Reportes corporativos",
            "Integraciones a medida"
        ]
    }
};

if (form) {
    form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const datos = Object.fromEntries(new FormData(form));

        const registro = {
            ...datos,
            plan: selectedPlanValue
        };

        sessionStorage.setItem("registro", JSON.stringify(registro));
        sessionStorage.setItem("authUser", JSON.stringify({
            email: datos.email,
            firstName: datos.firstName,
            plan: selectedPlanValue,
            planName: planCatalog[selectedPlanValue]?.name || "Básico"
        }));
        window.location.href = "payment.html";
    });
}

