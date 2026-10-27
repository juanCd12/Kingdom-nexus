# Personalizar dashboard

## Propósito

La opción **Configuraciones > Personalizar dashboard** del plan básico permite
elegir qué tarjetas de resumen y panel de actividad se muestran en el
dashboard. Las preferencias se aplican al volver a abrir
`planBasico/dashboard.html`.

## Opciones disponibles

| Opción | Sección controlada |
| --- | --- |
| Resumen de productos | Tarjeta con el conteo del catálogo |
| Sucursales | Tarjeta de sucursales |
| Compras | Tarjeta de compras |
| Alertas | Tarjeta de alertas inteligentes |
| Actividad reciente | Panel de actividad reciente |

Desmarcar una opción oculta únicamente su tarjeta o panel del dashboard; no
elimina datos, no desactiva módulos del plan y no afecta la navegación lateral.
Las opciones se marcan de forma predeterminada si todavía no existe una
preferencia guardada.

## Funcionamiento implementado

1. `planBasico/personalizar-dashboard.html` muestra cinco casillas asociadas a
   claves estables (`products`, `branches`, `purchases`, `alerts` y
   `recentActivity`).
2. `js/dashboard-preferences.js` usa el identificador de Supabase para cargar
   preferencias independientes por cuenta cuando hay una sesión disponible.
   Sin sesión, permite igualmente probar y guardar opciones locales del
   navegador bajo el perfil `guest`.
3. Al guardar, el script conserva el estado de cada casilla en `localStorage`
   y comunica el resultado en un área accesible para lectores de pantalla.
4. `planBasico/dashboard.html` marca las secciones correspondientes. El mismo
   script las oculta o las muestra según la preferencia almacenada y el diseño
   reajusta el espacio disponible.
5. El botón de guardar está habilitado desde que se muestra la pantalla. La
   falta de sesión o indisponibilidad de Supabase no impide probar la
   funcionalidad. Los fallos de lectura o escritura se notifican y no se
   presentan como guardados exitosos.

## Persistencia y alcance

Las preferencias se guardan en el almacenamiento local del navegador bajo una
clave con el formato
`kingdom-nexus-dashboard-preferences:<id-del-usuario>`. Por este motivo:

- cada usuario autenticado tiene un conjunto separado de preferencias en el
  mismo navegador;
- sin sesión, las preferencias se guardan bajo el perfil local `guest`, útil
  para pruebas en el mismo navegador;
- las preferencias sobreviven recargas y nuevas sesiones en ese navegador;
- no se sincronizan entre navegadores ni dispositivos y no se almacenan en la
  base de datos de Supabase;
- borrar los datos locales del sitio elimina estas preferencias y el dashboard
  vuelve a mostrar todas las secciones.

## Archivos relacionados

- `planBasico/personalizar-dashboard.html`: controles de configuración,
  mensaje de estado y acción de guardar.
- `planBasico/dashboard.html`: secciones del dashboard conectadas a las
  preferencias.
- `js/dashboard-preferences.js`: carga, guardado, validación y aplicación de
  preferencias.
- `css/dashboard.css`: garantiza que una sección oculta no ocupe espacio en
  la cuadrícula.
