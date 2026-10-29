# Aislamiento de proveedores y clientes por cuenta

Los registros de `public.suppliers` y `public.customers` comparten el mismo proyecto y las mismas tablas de Supabase. Antes del cambio, las consultas de la aplicación no filtraban por usuario y las tablas no tenían una política RLS de propietario que impidiera leer o modificar los registros de otra cuenta. El servicio de proveedores tampoco exigía una sesión al crear registros. Por eso las filas podían aparecer juntas para distintos usuarios.

## Aplicar en Supabase

1. En Supabase, abre **SQL Editor** y ejecuta [`suppliers-customers-rls.sql`](./suppliers-customers-rls.sql).
2. El script crea `created_by` cuando no existe, usa `auth.uid()` como valor predeterminado, habilita RLS y reemplaza todas las políticas que ya existan en estas dos tablas por reglas que solo permiten a cada usuario operar con sus propios registros.
3. Detecta los registros antiguos que aún no tienen dueño:

   ```sql
   SELECT 'suppliers' AS tabla, count(*) AS sin_propietario
   FROM public.suppliers WHERE created_by IS NULL
   UNION ALL
   SELECT 'customers', count(*)
   FROM public.customers WHERE created_by IS NULL;
   ```

4. El script no asigna usuarios automáticamente a esas filas porque no existe una relación segura que permita deducir a qué cuenta pertenecen. Asígnalas usando un mapeo comprobado entre cada fila y el UUID del administrador en `auth.users` (también usado como `register.id`). No asignes todos los registros históricos al mismo administrador salvo que hayas confirmado que efectivamente le pertenecen. Por ejemplo, cuando tengas identificados los IDs de filas que pertenecen a un administrador:

   ```sql
   UPDATE public.suppliers
   SET created_by = 'UUID_DEL_ADMINISTRADOR'
   WHERE id IN ('UUID_DEL_PROVEEDOR_1', 'UUID_DEL_PROVEEDOR_2');

   UPDATE public.customers
   SET created_by = 'UUID_DEL_ADMINISTRADOR'
   WHERE id IN ('UUID_DEL_CLIENTE_1', 'UUID_DEL_CLIENTE_2');
   ```

5. Si todas las filas ya tienen propietario y quieres hacer la columna obligatoria, puedes ejecutar:

   ```sql
   ALTER TABLE public.suppliers ALTER COLUMN created_by SET NOT NULL;
   ALTER TABLE public.customers ALTER COLUMN created_by SET NOT NULL;
   ```

   No ejecutes este paso mientras queden filas sin `created_by`.

## Asociación de registros nuevos

La aplicación obtiene el usuario autenticado de Supabase Auth y escribe su UUID en `created_by`. No acepta un propietario enviado por el formulario. Las operaciones de lectura, búsqueda, edición, conteo y eliminación también filtran por ese UUID; RLS aplica la misma restricción en el servidor, que es el control de seguridad definitivo.

Este modelo asocia cada fila al usuario administrador que creó la cuenta. Si una cuenta empresarial va a tener varios usuarios que deben compartir los mismos datos, se necesitará una tabla de organizaciones/cuentas y una relación de membresía; no se debe reemplazar la política por acceso a todos los usuarios autenticados.
