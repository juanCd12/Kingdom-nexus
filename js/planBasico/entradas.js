(function () {
    const app = window.KingdomBasicApp;
    if (!app) return;

    const entradasModule = {
        render() {
            const tbody = document.getElementById("entriesTableBody");
            if (!tbody) return;

            tbody.innerHTML = (app.entries || []).map((item) => `
                <tr>
                    <td>${item.date}</td>
                    <td>${item.product}</td>
                    <td>${item.quantity}</td>
                    <td>${item.origin}</td>
                    <td>${item.user}</td>
                </tr>
            `).join("");
        },
        bind() {
            const entryForm = document.getElementById("entryForm");
            if (!entryForm || entryForm.dataset.bound === "true") return;

            entryForm.dataset.bound = "true";
            entryForm.addEventListener("submit", (event) => {
                event.preventDefault();
                const formData = new FormData(entryForm);
                const selectedProduct = formData.get("product");
                const quantity = Number(formData.get("quantity") || 0);

                if (!selectedProduct || quantity <= 0) return;

                const productMatch = (app.products || []).find((product) => product.name === selectedProduct);
                if (productMatch) {
                    productMatch.stock += quantity;
                    productMatch.status = productMatch.stock > 10 ? "Disponible" : "Bajo";
                }

                app.entries.unshift({
                    date: new Date().toISOString().slice(0, 10),
                    product: selectedProduct,
                    quantity,
                    origin: formData.get("origin").toString().trim(),
                    user: formData.get("user").toString().trim()
                });

                if (app.modules.products) {
                    app.modules.products.render();
                }
                if (app.modules.inventory) {
                    app.modules.inventory.render();
                }
                this.render();
                entryForm.reset();
            });
        }
    };

    app.registerModule("entries", entradasModule);
})();
