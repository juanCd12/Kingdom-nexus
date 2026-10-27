const SUPABASE_URL = "https://poghdicqjjrtxucuoqev.supabase.co";
const SUPABASE_KEY = "sb_publishable_-jDBMc58Msbi22Rys16pAQ_T3Q2CJ8I";

const supabaseClient = crearClienteSupabase();

function crearClienteSupabase() {
    if (!window.supabase || typeof window.supabase.createClient !== "function") {
        return null;
    }

    return window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}

const movimientosFeedback = document.getElementById("movimientosFeedback");
const buscarMovimiento = document.getElementById("buscarMovimiento");
const filtroTipoMovimiento = document.getElementById("filtroTipoMovimiento");
const limpiarFiltrosMovimiento = document.getElementById("limpiarFiltrosMovimiento");
const movimientosTabla = document.getElementById("movimientosTabla");
const movimientoDetalle = document.getElementById("movimientoDetalle");
const movimientoDetalleTitulo = document.getElementById("movimientoDetalleTitulo");
const movimientoDetalleContenido = document.getElementById("movimientoDetalleContenido");
const cerrarDetalleMovimiento = document.getElementById("cerrarDetalleMovimiento");

const TIPOS_ENTRADA = ["IN", "ENTRADA", "ENTRADAS", "ENTRY", "INGRESO", "INGRESOS"];
const TIPOS_SALIDA = ["OUT", "SALIDA", "SALIDAS", "EXIT", "EGRESO", "EGRESOS"];

let productos = [];
let movimientos = [];
let productosPorId = new Map();
let filtroTexto = "";
let filtroTipo = "todos";
let origenDetalle = null;
let cargando = false;

function mostrarFeedback(tipo, mensaje) {
    movimientosFeedback.textContent = mensaje;
    movimientosFeedback.className = `module-feedback ${tipo}`;
    movimientosFeedback.hidden = false;
}

function ocultarFeedback() {
    movimientosFeedback.hidden = true;
    movimientosFeedback.textContent = "";
}

function mostrarFilaEstado(texto, conReintento = false) {
    movimientosTabla.replaceChildren();

    const fila = movimientosTabla.insertRow();
    const celda = fila.insertCell();
    celda.colSpan = 7;
    celda.className = "table-state";
    celda.textContent = texto;

    if (conReintento) {
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "secondary-button";
        boton.textContent = "Reintentar";
        boton.addEventListener("click", cargarDatos);
        celda.append(boton);
    }
}

async function cargarDatos() {
    if (cargando) {
        return;
    }

    if (!supabaseClient) {
        mostrarFeedback("error", "No se pudo inicializar la conexión con Supabase. Verifica la carga del cliente e inténtalo de nuevo.");
        mostrarFilaEstado("No se pudo inicializar la conexión con Supabase.", true);
        return;
    }

    cargando = true;
    ocultarFeedback();
    mostrarFilaEstado("Cargando movimientos…");

    const { data: datosSesion, error: errorSesion } = await supabaseClient.auth.getSession();

    if (errorSesion || !datosSesion?.session) {
        cargando = false;
        mostrarFeedback("error", "Tu sesión de Supabase no está activa. Inicia sesión nuevamente para consultar los movimientos de inventario.");
        mostrarFilaEstado("No hay una sesión activa de Supabase.", true);
        return;
    }

    const resultadoProductos = await supabaseClient
        .from("products")
        .select("id, name, sku, category, initial_stock")
        .order("name", { ascending: true });

    if (resultadoProductos.error) {
        cargando = false;
        mostrarError(resultadoProductos.error, "productos");
        return;
    }

    const resultadoMovimientos = await supabaseClient
        .from("inventory_movements")
        .select("id, product_id, movement_type, quantity, created_at, created_by")
        .order("created_at", { ascending: false });

    cargando = false;

    if (resultadoMovimientos.error) {
        mostrarError(resultadoMovimientos.error, "movimientos");
        return;
    }

    productos = resultadoProductos.data || [];
    movimientos = resultadoMovimientos.data || [];
    productosPorId = new Map(productos.map((producto) => [producto.id, producto]));

    poblarFiltroTipos();
    renderMovimientos();
}

function mostrarError(error, recurso) {
    mostrarFeedback("error", traducirError(error, recurso));
    mostrarFilaEstado("No se pudo cargar el historial de movimientos.", true);
}

function traducirError(error, recurso) {
    const codigo = error?.code || "";
    const detalle = String(error?.message || "");

    if (codigo === "42501" || detalle.includes("permission denied")) {
        return "La sesión actual no está autorizada para ver los movimientos de inventario. Verifica la sesión de Supabase Auth y las políticas RLS de Inventory Movements.";
    }

    if (codigo === "PGRST205" || codigo === "42P01") {
        return recurso === "productos"
            ? "No existe la tabla de productos esperada en Supabase (public.products)."
            : "No existe la tabla de movimientos esperada en Supabase (public.inventory_movements).";
    }

    if (codigo === "42703" || codigo === "PGRST204") {
        return "El esquema de la base de datos no coincide con los campos esperados por el módulo de movimientos.";
    }

    if (error instanceof TypeError || detalle.includes("Failed to fetch") || detalle.includes("NetworkError")) {
        return "No pudimos comunicarnos con Supabase. Verifica tu conexión e inténtalo de nuevo.";
    }

    return "No se pudieron cargar los movimientos de inventario.";
}

function normalizarTipo(valor) {
    return String(valor ?? "").trim();
}

function clasificarTipo(valor) {
    const crudo = normalizarTipo(valor);
    const normalizado = crudo.toUpperCase().replace(/[\s-]+/g, "_");

    if (TIPOS_ENTRADA.includes(normalizado)) {
        return { texto: "Entrada", clase: "good" };
    }

    if (TIPOS_SALIDA.includes(normalizado)) {
        return { texto: "Salida", clase: "alert" };
    }

    if (!crudo) {
        return { texto: "Sin tipo", clase: "" };
    }

    return { texto: crudo, clase: "" };
}

function formatearFecha(valor) {
    if (!valor) {
        return "—";
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
        return String(valor);
    }

    return new Intl.DateTimeFormat("es-CO", {
        dateStyle: "medium",
        timeStyle: "short"
    }).format(fecha);
}

function formatearCantidad(valor) {
    const numero = Number(valor);

    if (!Number.isFinite(numero)) {
        return valor === null || valor === undefined ? "—" : String(valor);
    }

    return new Intl.NumberFormat("es-CO", {
        maximumFractionDigits: 2
    }).format(numero);
}

function poblarFiltroTipos() {
    const seleccionado = filtroTipoMovimiento.value || "todos";
    const valores = [...new Set(
        movimientos
            .map((movimiento) => normalizarTipo(movimiento.movement_type))
            .filter((valor) => valor !== "")
    )].sort((a, b) => a.localeCompare(b, "es"));

    filtroTipoMovimiento.replaceChildren(new Option("Todos", "todos"));
    valores.forEach((valor) => filtroTipoMovimiento.append(new Option(valor, valor)));

    filtroTipo = valores.includes(seleccionado) ? seleccionado : "todos";
    filtroTipoMovimiento.value = filtroTipo;
}

function filtrarMovimientos() {
    return movimientos.filter((movimiento) => {
        const tipoCrudo = normalizarTipo(movimiento.movement_type);

        if (filtroTipo !== "todos" && tipoCrudo !== filtroTipo) {
            return false;
        }

        if (!filtroTexto) {
            return true;
        }

        const producto = productosPorId.get(movimiento.product_id);
        const contenido = [producto?.name, producto?.sku]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

        return contenido.includes(filtroTexto);
    });
}

function renderMovimientos() {
    movimientosTabla.replaceChildren();

    if (!movimientos.length) {
        mostrarFilaEstado("Aún no hay movimientos registrados. El registro estará disponible después de configurar la operación segura de inventario.");
        return;
    }

    const visibles = filtrarMovimientos();

    if (!visibles.length) {
        mostrarFilaEstado("No hay movimientos que coincidan con los filtros aplicados.");
        return;
    }

    visibles.forEach((movimiento) => {
        const producto = productosPorId.get(movimiento.product_id);
        const fila = movimientosTabla.insertRow();

        fila.insertCell().textContent = formatearFecha(movimiento.created_at);
        fila.insertCell().textContent = producto?.name || "Producto no disponible";
        fila.insertCell().textContent = producto?.sku || "—";

        const celdaTipo = fila.insertCell();
        const etiqueta = clasificarTipo(movimiento.movement_type);
        const pill = document.createElement("span");
        pill.className = etiqueta.clase ? `status-pill ${etiqueta.clase}` : "status-pill";
        pill.textContent = etiqueta.texto;
        celdaTipo.append(pill);

        fila.insertCell().textContent = formatearCantidad(movimiento.quantity);
        fila.insertCell().textContent = movimiento.created_by || "—";

        const celdaAccion = fila.insertCell();
        const boton = document.createElement("button");
        boton.type = "button";
        boton.className = "secondary-button";
        boton.textContent = "Ver";
        boton.addEventListener("click", () => abrirDetalle(movimiento, boton));
        celdaAccion.append(boton);
    });
}

function agregarFilaDetalle(etiqueta, valor) {
    const fila = movimientoDetalleContenido.insertRow();
    const encabezado = document.createElement("th");
    encabezado.scope = "row";
    encabezado.textContent = etiqueta;
    fila.append(encabezado);

    const valorTexto = valor === null || valor === undefined || valor === "" ? "—" : String(valor);
    fila.insertCell().textContent = valorTexto;
}

function abrirDetalle(movimiento, botonOrigen) {
    const producto = productosPorId.get(movimiento.product_id);

    origenDetalle = botonOrigen;
    movimientoDetalleContenido.replaceChildren();

    agregarFilaDetalle("ID del movimiento", movimiento.id);
    agregarFilaDetalle("Producto", producto?.name || "Producto no disponible");
    agregarFilaDetalle("SKU", producto?.sku || "—");
    agregarFilaDetalle("ID del producto", movimiento.product_id);
    agregarFilaDetalle("Tipo", clasificarTipo(movimiento.movement_type).texto);
    agregarFilaDetalle("Cantidad", formatearCantidad(movimiento.quantity));
    agregarFilaDetalle("Fecha de creación", formatearFecha(movimiento.created_at));
    agregarFilaDetalle("Registrado por", movimiento.created_by);

    movimientoDetalle.hidden = false;
    movimientoDetalleTitulo.focus();
}

function cerrarDetalle() {
    if (movimientoDetalle.hidden) {
        return;
    }

    movimientoDetalle.hidden = true;
    movimientoDetalleContenido.replaceChildren();

    if (origenDetalle && document.contains(origenDetalle)) {
        origenDetalle.focus();
    }

    origenDetalle = null;
}

buscarMovimiento.addEventListener("input", () => {
    filtroTexto = buscarMovimiento.value.trim().toLowerCase();
    renderMovimientos();
});

filtroTipoMovimiento.addEventListener("change", () => {
    filtroTipo = filtroTipoMovimiento.value;
    renderMovimientos();
});

limpiarFiltrosMovimiento.addEventListener("click", () => {
    buscarMovimiento.value = "";
    filtroTexto = "";
    filtroTipo = "todos";
    filtroTipoMovimiento.value = "todos";
    renderMovimientos();
    buscarMovimiento.focus();
});

cerrarDetalleMovimiento.addEventListener("click", cerrarDetalle);

document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") {
        cerrarDetalle();
    }
});

cargarDatos();
