(function () {
    const app = window.KingdomBasicApp;
    if (!app) return;

    const salidasModule = {
        render() {
            const tbody = document.getElementById("exitsTableBody");
            if (!tbody) return;

            tbody.innerHTML = (app.exits || []).map((item) => `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.product}</td>
                    <td>${item.quantity}</td>
                    <td>${item.destination}</td>
                    <td>${item.reason}</td>
                </tr>
            `).join("");
        },
        bind() {
            const exitForm = document.getElementById("exitForm");
            if (!exitForm || exitForm.dataset.bound === "true") return;

            exitForm.dataset.bound = "true";
            exitForm.addEventListener("submit", (event) => {
                event.preventDefault();
                const formData = new FormData(exitForm);
                const selectedProduct = formData.get("product");
                const quantity = Number(formData.get("quantity") || 0);

                if (!selectedProduct || quantity <= 0) return;

                const productMatch = (app.products || []).find((product) => product.name === selectedProduct);
                if (productMatch) {
                    productMatch.stock = Math.max(0, productMatch.stock - quantity);
                    productMatch.status = productMatch.stock > 10 ? "Disponible" : "Bajo";
                }

                app.exits.unshift({
                    date: new Date().toISOString().slice(0, 10),
                    product: selectedProduct,
                    quantity,
                    destination: formData.get("destination").toString().trim(),
                    reason: formData.get("reason").toString().trim()
                });

                if (app.modules.products) {
                    app.modules.products.render();
                }
                if (app.modules.inventory) {
                    app.modules.inventory.render();
                }
                this.render();
                exitForm.reset();
            });
        }
    };

    app.registerModule("exits", salidasModule);
})();
