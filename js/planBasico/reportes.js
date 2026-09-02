(function () {
    const app = window.KingdomBasicApp;
    if (!app) return;

    const reportesModule = {
        render() {
            const container = document.getElementById("reportSummary");
            if (!container) return;

            const totalProducts = (app.products || []).length;
            const totalUnits = (app.inventory || []).reduce((sum, item) => sum + item.stock, 0);
            const lowStock = (app.inventory || []).filter((item) => item.status === "Bajo").length;
            const totalEntries = (app.entries || []).reduce((sum, item) => sum + item.quantity, 0);
            const totalExits = (app.exits || []).reduce((sum, item) => sum + item.quantity, 0);

            container.innerHTML = `
                <div class="mini-stat">
                    <span>Productos</span>
                    <strong>${totalProducts}</strong>
                </div>
                <div class="mini-stat warning">
                    <span>Unidades en stock</span>
                    <strong>${totalUnits}</strong>
                </div>
                <div class="mini-stat success">
                    <span>Stock bajo</span>
                    <strong>${lowStock}</strong>
                </div>
                <div class="mini-stat">
                    <span>Movimientos</span>
                    <strong>${totalEntries + totalExits}</strong>
                </div>
            `;
        }
    };

    app.registerModule("reports", reportesModule);
})();
