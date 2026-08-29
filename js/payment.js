const registro = JSON.parse(sessionStorage.getItem("registro"));

const backToRegister = document.getElementById("backToRegister");

if (!registro) {
    window.location.href = "register.html";
} else {

    const planName = document.getElementById("selectedPlanName");
    const planPrice = document.getElementById("selectedPlanPrice");
    const nextPaymentPrice = document.getElementById("nextPaymentPrice");

    const planes = {
        basic: {
            name: "Plan Básico",
            price: "$49.900"
        },

        professional: {
            name: "Plan Profesional",
            price: "$99.900"
        },

        enterprise: {
            name: "Plan Empresarial",
            price: "$199.900"
        }
    };

    const planSeleccionado = planes[registro.plan];

    if (!planSeleccionado) {
        window.location.href = "index.html";
    } else {

        planName.textContent = planSeleccionado.name;

        planPrice.textContent = planSeleccionado.price;

        nextPaymentPrice.textContent =
            `${planSeleccionado.price}/mes`;

        backToRegister.href =
            `register.html?plan=${registro.plan}`;
    }
}