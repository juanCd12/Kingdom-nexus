(function () {
    const app = window.KingdomBasicApp;
    if (!app) return;

    const inventarioModule = {
        render() {
            const tbody = document.getElementById("inventoryTableBody");
            if (!tbody) return;

            const total = (app.inventory || []).reduce((sum, item) => sum + item.stock, 0);
            const low = (app.inventory || []).filter((item) => item.status === "Bajo").length;
            const healthy = (app.inventory || []).filter((item) => item.status === "Bueno").length;

            const totalNode = document.getElementById("inventoryTotal");
            const lowNode = document.getElementById("inventoryLow");
            const healthyNode = document.getElementById("inventoryHealthy");

            if (totalNode) totalNode.textContent = total;
            if (lowNode) lowNode.textContent = low;
            if (healthyNode) healthyNode.textContent = healthy;

            tbody.innerHTML = (app.inventory || []).map((item) => `
                <tr>
                    <td>${item.sku}</td>
                    <td>${item.product}</td>
                    <td>${item.stock}</td>
                    <td>${item.location}</td>
                    <td><span class="status-pill ${item.status === "Bajo" ? "alert" : "good"}">${item.status}</span></td>
                </tr>
            `).join("");
        }
    };

    app.registerModule("inventory", inventarioModule);
})();
