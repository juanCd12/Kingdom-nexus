//LLAVES DE SUPABASE

const SUPABASE_URL = "https://poghdicqjjrtxucuoqev.supabase.co";
const SUPABASE_KEY = "sb_publishable_-jDBMc58Msbi22Rys16pAQ_T3Q2CJ8I";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

//DOM

const nuevoProducto = document.getElementById("nuevoProducto");
const productoForm = document.getElementById("productoForm");
const productoFormTitulo = document.getElementById("productoFormTitulo");
const campoStockInicial = document.getElementById("campoStockInicial");
const productoNombre = document.getElementById("productoNombre");
const productosFeedback = document.getElementById("productosFeedback");
const productosTabla = document.getElementById("productosTabla");
const buscarProducto = document.getElementById("buscarProducto");
const filtroEstado = document.getElementById("filtroEstado");
const filtroCategoria = document.getElementById("filtroCategoria");
const cancelarProducto = document.getElementById("cancelarProducto");
const guardarProducto = document.getElementById("guardarProducto");


//FILTRO Y ACTUALIZACIÓN DE LA TABLA

let productos = [];

//OBTENEMOS EL USUARIO

async function obtenerUsuario() {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) {
        console.error("No se pudo leer la sesión de Supabase.", error);
        return null;
    }

    return data.session?.user ?? null;
}

//MOSTRAR MENSAJE DEL ESTADO DE LA PETICIÓN

function mostrarFeedback(tipo, mensaje) {
    productosFeedback.textContent = mensaje;
    productosFeedback.className = `module-feedback ${tipo}`;
    productosFeedback.hidden = false;
}

//ACTIVAR FORMULARIO

function abrirFormulario() {
    productoForm.reset();
    productoFormTitulo.textContent = "Nuevo producto";
    campoStockInicial.hidden = false;
    productoForm.hidden = false;
    productoNombre.focus();
}

//CERRAR FORMULARIO

function cerrarFormulario() {
    productoForm.reset();
    productoForm.hidden = true;
}

//OBTENER DATOS DEL FORMULARIO DE PRODUCTOS
async function obtenerDatosFormulario() {
    const datos = Object.fromEntries(new FormData(productoForm));
    const usuario = await obtenerUsuario();

    if(!usuario){
        console.error("Error al obtener el usuario")
    }
    

    
    return {
        name: datos.name.trim(),
        sku: datos.sku.trim().toUpperCase(),
        description: datos.description.trim() || null,
        category: datos.category.trim() || null,
        sales_price: Number(datos.sales_price || 0),
        cost: Number(datos.cost || 0),
        min_stock: Number(datos.min_stock || 0),
        initial_stock: Number(datos.initial_stock || 0),
        user_id: usuario.id
    };
}

//VALIDAR PRODUCTOS

function validarProducto(producto) {
    if (!producto.name) return "El nombre es obligatorio.";
    if (!producto.sku) return "El SKU es obligatorio.";

    const valores = [
        [producto.sales_price, "El precio de venta"],
        [producto.cost, "El precio de costo"],
        [producto.min_stock, "El stock mínimo"],
        [producto.initial_stock, "El stock inicial"]
    ];

    for (const [valor, nombre] of valores) {
        if (!Number.isFinite(valor) || valor < 0) {
            return `${nombre} debe ser un número válido y no negativo.`;
        }
    }

    return "";
}

//GUARDAR PRODUCTOS

async function guardarProductoEnSupabase(e) {
    e.preventDefault();

    if (!productoForm.checkValidity()) {
        productoForm.reportValidity();
        return;
    }

    if (!(await obtenerUsuario())) {
        mostrarFeedback("error", "Tu sesión no está activa. Inicia sesión nuevamente.");
        return;
    }

    const producto = await obtenerDatosFormulario();
    const errorValidacion = validarProducto(producto);
    if (errorValidacion) {
        mostrarFeedback("error", errorValidacion);
        return;
    }

    //DESACTIVAR BOTON GUARDAR TEMPORALMENTE

    guardarProducto.disabled = true;

    const { data, error } = await supabaseClient
        .from("products")
        .insert(producto)
        .select()
        .single();

    guardarProducto.disabled = false;

    if (error) {
        console.error("Error al guardar producto:", error);
        mostrarFeedback("error", traducirError(error));
        return;
    }

    productos.push(data);
    renderizarProductos();
    cerrarFormulario();
    mostrarFeedback("success", "Producto guardado correctamente.");
}

async function cargarProductos() {
    if (!(await obtenerUsuario())) {
        mostrarFeedback("error", "Tu sesión no está activa. Inicia sesión nuevamente.");
        return;
    }

    const { data, error } = await supabaseClient
        .from("products")
        .select("id, name, sku, description, category, sales_price, initial_stock")
        .order("name", { ascending: true });

    if (error) {
        console.error("Error al cargar productos:", error);
        mostrarFeedback("error", traducirError(error));
        return;
    }

    productos = data || [];
    renderizarProductos();
}

function productosFiltrados() {
    const texto = buscarProducto.value.trim().toLowerCase();
    const estado = filtroEstado.value;
    const categoria = filtroCategoria.value;

    return productos.filter((producto) => {
        const contenido = [producto.name, producto.sku, producto.category]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();
        const coincideEstado = estado === "todos" ||
            (estado === "activos" && producto.is_active !== false) ||
            (estado === "inactivos" && producto.is_active === false);
        const coincideCategoria = categoria === "todas" || producto.category === categoria;

        return contenido.includes(texto) && coincideEstado && coincideCategoria;
    });
}

function renderizarProductos() {
    const categorias = [...new Set(productos.map((producto) => producto.category).filter(Boolean))].sort();
    const categoriaActual = filtroCategoria.value;
    filtroCategoria.replaceChildren(new Option("Todas", "todas"));

    categorias.forEach((categoria) => filtroCategoria.append(new Option(categoria, categoria)));
    filtroCategoria.value = categorias.includes(categoriaActual) ? categoriaActual : "todas";
    productosTabla.replaceChildren();

    const visibles = productosFiltrados();
    if (!visibles.length) {
        const fila = productosTabla.insertRow();
        const celda = fila.insertCell();
        celda.colSpan = 7;
        celda.className = "table-state";
        celda.textContent = "Aún no tienes productos que mostrar.";
        return;
    }

    visibles.forEach((producto) => {
        const fila = productosTabla.insertRow();
        fila.insertCell().textContent = producto.name || "—";
        fila.insertCell().textContent = producto.sku || "—";
        fila.insertCell().textContent = producto.category || "Sin categoría";
        fila.insertCell().textContent = formatoMoneda(producto.sales_price);
        fila.insertCell().textContent = producto.initial_stock ?? 0;

        const estado = fila.insertCell();
        estado.textContent = producto.is_active === false ? "Inactivo" : "Activo";
        estado.className = producto.is_active === false ? "status-pill alert" : "status-pill good";
        fila.insertCell().textContent = "—";
    });
}

function formatoMoneda(valor) {
    return new Intl.NumberFormat("es-CO", {
        style: "currency",
        currency: "COP",
        maximumFractionDigits: 2
    }).format(Number(valor) || 0);
}

function traducirError(error) {
    if (error.code === "23505") return "Ya existe un producto con ese SKU.";
    if (error.code === "42501") return "Supabase bloqueó la operación por sus políticas RLS.";
    if (error.code === "23502") return "Falta un dato obligatorio del producto.";
    return error.message || "No se pudo completar la operación.";
}

nuevoProducto.addEventListener("click", abrirFormulario);
productoForm.addEventListener("submit", guardarProductoEnSupabase);
cancelarProducto.addEventListener("click", cerrarFormulario);
buscarProducto.addEventListener("input", renderizarProductos);
filtroEstado.addEventListener("change", renderizarProductos);
filtroCategoria.addEventListener("change", renderizarProductos);

cargarProductos();
