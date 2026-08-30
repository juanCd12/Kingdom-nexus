const form = document.getElementById("loginForm");

if (form) {
    const params = new URLSearchParams(window.location.search);
    const selectedPlan = params.get("plan");
    const planSelect = document.getElementById("plan");

    if (selectedPlan && planSelect) {
        const validPlans = ["basic", "professional", "enterprise"];

        if (validPlans.includes(selectedPlan)) {
            planSelect.value = selectedPlan;
        }
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const formData = new FormData(form);
        const email = formData.get("email").trim();
        const selectedPlanValue = formData.get("plan");

        const planNames = {
            basic: "Básico",
            professional: "Profesional",
            enterprise: "Empresarial"
        };

        sessionStorage.setItem("authUser", JSON.stringify({
            email,
            plan: selectedPlanValue,
            planName: planNames[selectedPlanValue] || "Plan"
        }));

        window.location.href = "index.html";
    });
}
