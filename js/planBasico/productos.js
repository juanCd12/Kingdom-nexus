(function () {
    const app = window.KingdomBasicApp;
    if (!app) return;

    const productosModule = {
        render() {
            const tbody = document.getElementById("productsTableBody");
            if (!tbody) return;

            tbody.innerHTML = (app.products || []).map((item) => `
                <tr>
                    <td>${item.name}</td>
                    <td>${item.category}</td>
                    <td>${item.stock}</td>
                    <td>${item.price}</td>
                    <td><span class="status-pill ${item.status === "Bajo" ? "alert" : "good"}">${item.status}</span></td>
                </tr>
            `).join("");

            const entrySelect = document.getElementById("entryProduct");
            const exitSelect = document.getElementById("exitProduct");
            const options = (app.products || []).map((product) => `<option value="${product.name}">${product.name}</option>`).join("");

            if (entrySelect) entrySelect.innerHTML = options;
            if (exitSelect) exitSelect.innerHTML = options;
        },
        bind() {
            const productForm = document.getElementById("productForm");
            if (!productForm || productForm.dataset.bound === "true") return;

            productForm.dataset.bound = "true";
            productForm.addEventListener("submit", (event) => {
                event.preventDefault();
                const formData = new FormData(productForm);
                const name = formData.get("name").toString().trim();
                const category = formData.get("category").toString().trim();
                const stock = Number(formData.get("stock") || 0);
                const price = Number(formData.get("price") || 0);

                if (!name || !category) return;

                app.products.unshift({
                    name,
                    category,
                    stock,
                    price: `$${price.toFixed(3).replace(/\./, ".")}`,
                    status: stock > 10 ? "Disponible" : "Bajo"
                });

                if (app.modules.inventory) {
                    app.modules.inventory.render();
                }
                this.render();
                productForm.reset();
            });
        }
    };

    app.registerModule("products", productosModule);
})();
