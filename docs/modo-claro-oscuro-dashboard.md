# Modo claro y oscuro para los dashboards

## Requerimiento

Los dashboards activos de los planes Básico, Profesional y Empresarial deben permitir alternar entre modo claro y modo oscuro. La elección debe aplicarse de inmediato, mantenerse al navegar entre dashboards del mismo sitio y conservar la vista clara como valor predeterminado para usuarios sin preferencia guardada.

## Alcance de la implementación

La función se incorporó a estas páginas:

- `planBasico/dashboard.html`
- `planProfesional/dashboard.html`
- `planEmpresarial/dashboard.html`

El selector aparece como un botón compacto de 44 × 44 píxeles en el grupo de acciones de la parte superior derecha del encabezado, junto al estado de suscripción y el perfil. Solo muestra el icono de luna o sol: así resulta fácil de encontrar sin añadir una etiqueta larga que compita con los otros elementos. Su tamaño mantiene un área cómoda para pulsar y el espacio del encabezado evita que cubra tarjetas o contenido. Mantiene la misma preferencia en los tres planes porque comparten el mismo origen y la clave `kingdom-nexus-theme` de `localStorage`.

## Cómo funciona

1. Antes de cargar los estilos, cada página lee la preferencia guardada. Si es oscura, añade `data-theme="dark"` al elemento raíz para evitar que se muestre primero el modo claro.
2. `dashboard-theme.js` inicializa el botón de acuerdo con el tema activo. El icono indica el modo al que se puede cambiar y el nombre accesible describe la acción. `aria-pressed` se mantiene sincronizado.
3. Al pulsar el botón, el script cambia el atributo `data-theme` entre `light` y `dark`. La hoja de estilos compartida aplica la paleta correspondiente sin recargar la página.
4. El script persiste la elección para que se conserve en visitas y dashboards posteriores. Si el navegador impide el acceso a `localStorage`, el cambio visual sigue funcionando durante la página actual y se registra una advertencia en consola.

## Funciones y variables

### `themeStorageKey`

Constante de `js/dashboard-theme.js` con el nombre de la clave en `localStorage`. Centraliza el identificador que el script usa para guardar la preferencia.

### `themeToggle`

Referencia al botón con atributo `data-theme-toggle`. Permite manejar el clic, actualizar el estado accesible y mostrar el icono del modo disponible.

### `themeIcon`

Referencia al contenedor del icono del botón. `applyDashboardTheme` cambia su SVG entre luna y sol para reforzar visualmente el modo que se puede activar.

### `applyDashboardTheme(theme)`

Aplica el modo recibido al elemento raíz mediante `data-theme`. También actualiza `aria-pressed`, el nombre accesible y el icono. Reunir estas operaciones en una función evita que la vista y el estado del control queden desincronizados.

### `isDark`

Variable local booleana que indica si el modo recibido es oscuro. Se utiliza para derivar de forma consistente el atributo y el nombre accesible del botón.

### `nextTheme`

Variable local del manejador de clic. Calcula el modo opuesto al actual para que cada pulsación alterne entre claro y oscuro.

### `error`

Parámetro local de los manejadores de error de almacenamiento. Permite registrar la causa técnica cuando el navegador no permite leer o persistir la preferencia, sin impedir el cambio visual.

### `data-theme`

Atributo del elemento `<html>` que representa el modo activo. CSS puede seleccionar `[data-theme="dark"]`; al estar en la raíz, la paleta cubre todo el dashboard.

### `data-theme-toggle`

Atributo de búsqueda del botón. Evita acoplar el JavaScript a clases de presentación que pueden cambiar por razones visuales.

### `aria-pressed` y `aria-label`

Atributos de accesibilidad. Comunican si el modo oscuro está activo y qué modo activará el control al pulsarlo. El botón presenta solo el icono de luna o sol, sin texto visible, y conserva un nombre accesible para lectores de pantalla.

### `localStorage`

Almacenamiento persistente del navegador usado para mantener la preferencia entre cargas de páginas. No guarda datos personales ni de sesión.

### Variables CSS

En `css/dashboard-theme.css`, las variables de color para los tonos `slate`, los fondos de estado y las sombras se redefinen dentro de `[data-theme="dark"]`. Los selectores complementarios actualizan fondos, bordes y texto de tarjetas, formularios, tablas y paneles, incluidos los colores explícitos de los estilos actuales de los planes.

Se conserva la barra lateral oscura que ya formaba parte del diseño claro. Así, el modo nocturno cambia el área de trabajo sin alterar la identidad y navegación existentes.

## Archivos

- `js/dashboard-theme.js`: estado, alternancia, accesibilidad y persistencia.
- `css/dashboard-theme.css`: paleta oscura y estilos del selector.
- Los tres HTML de dashboard: carga temprana del tema, hoja compartida y botón.

## Validación manual recomendada

1. Abrir cada dashboard sin preferencia guardada y confirmar que aparece el modo claro y el control solo muestra el icono de luna.
2. Activar el modo oscuro y revisar el encabezado, resumen, tarjetas, módulos, paneles, tablas y formularios.
3. Recargar y confirmar que el modo continúa oscuro.
4. Abrir otro dashboard activo del plan y confirmar que conserva la misma selección.
5. Volver al modo claro y confirmar que la selección se conserva al recargar.
6. Usar Tab y Enter para operar el botón y verificar que el nombre accesible cambia con el modo.
