-- ============================================================================
-- Kingdom Nexus · Módulo de Movimientos de Inventario
-- Migración de Supabase: public.products y public.inventory_movements
-- Archivo: docs/movimientos-supabase.sql
--
-- ESTADO
--   DOCUMENTO DE REVISIÓN. NO SE EJECUTA AUTOMÁTICAMENTE.
--   La interfaz de Movimientos incluida en esta entrega es de SOLO LECTURA.
--   El registro y el reverso permanecen deshabilitados en el frontend hasta
--   que este documento se ejecute y se verifique en Supabase.
--
-- CÓMO EJECUTAR
--   Supabase Dashboard → SQL Editor. El documento está dividido en secciones
--   numeradas e independientes. Ejecuta en orden y revisa cada resultado:
--     1. Diagnóstico previo (solo lectura)
--     2. Preparación de products.quantity (backfill condicional)
--     3. Columnas de trazabilidad de inventory_movements
--     4. Constraints (protegidos contra datos heredados)
--     5. Índices
--     6. Función atómica register_inventory_movement
--     7. Función atómica reversible reverse_inventory_movement (opcional)
--     8. Permisos para authenticated (REQUIERE REVISIÓN Y DESCOMENTAR)
--     9. Preparación de RLS (segura: habilita RLS y revoca anon)
--    10. Verificación final (solo lectura)
--    11. Supuestos
--    12. Bloqueadores y decisiones pendientes
--
-- ALCANCE
--   Solo public.inventory_movements y la preparación mínima de
--   public.products.quantity necesaria para movimientos atómicos. No toca
--   autenticación, login, registro, pagos, planes, dashboards, reportes,
--   compras, ventas, proveedores, clientes, sucursales ni bodegas.
--
-- SEGURIDAD
--   · No se otorgan permisos a anon en ninguna sección.
--   · No se deshabilita RLS.
--   · No se usan claves service_role.
--   · No se crean políticas USING (true) / WITH CHECK (true).
--   · Las funciones se crean con search_path = '' y objetos calificados.
--     Su EXECUTE se revoca de PUBLIC (que incluye a anon) y el otorgamiento
--     a authenticated queda comentado en la sección 8 hasta que el modelo de
--     propiedad se confirme.
--   · No se eliminan ni reescriben movimientos existentes.
-- ============================================================================


-- ============================================================================
-- 1. DIAGNÓSTICO PREVIO (solo lectura, sin cambios)
--    Ejecuta estas consultas antes de cualquier modificación y guarda el
--    resultado. Determinan si el backfill de quantity y los constraints son
--    seguros.
-- ============================================================================

-- 1.1 Columnas actuales de ambas tablas
select table_name, column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public'
   and table_name in ('products', 'inventory_movements')
 order by table_name, ordinal_position;

-- 1.2 Conteos base de products
select
    count(*)                                                  as productos,
    count(*) filter (where initial_stock is null)             as initial_stock_nulos,
    count(*) filter (where initial_stock is not null and initial_stock < 0)
                                                              as initial_stock_negativos,
    count(*) filter (where user_id is null)                   as productos_sin_user_id
  from public.products;

-- 1.3 Conteos base de inventory_movements
select
    count(*)                                                  as movimientos,
    count(*) filter (where product_id is null)                as movimientos_sin_producto,
    count(*) filter (where quantity is null)                  as movimientos_sin_cantidad,
    count(*) filter (where quantity is not null and quantity <= 0)
                                                              as movimientos_con_cantidad_no_positiva
  from public.inventory_movements;

-- 1.4 Valores distintos de movement_type (contrato real, no asumido)
select coalesce(movement_type::text, '<NULL>') as movement_type, count(*) as movimientos
  from public.inventory_movements
 group by movement_type
 order by movimientos desc;

-- 1.5 Movimientos huérfanos (product_id sin producto)
select m.id, m.product_id, m.movement_type, m.quantity, m.created_at
  from public.inventory_movements m
  left join public.products p on p.id = m.product_id
 where p.id is null
 order by m.created_at desc;

-- 1.6 Productos con historial de movimientos (stock actual no reconstruible
--     de forma automática desde initial_stock)
select p.id, p.name, p.sku, p.initial_stock,
       count(m.id) as movimientos,
       count(m.id) filter (where upper(btrim(coalesce(m.movement_type::text, ''))) = 'IN')  as entradas_interpretables,
       count(m.id) filter (where upper(btrim(coalesce(m.movement_type::text, ''))) = 'OUT') as salidas_interpretables
  from public.products p
  join public.inventory_movements m on m.product_id = p.id
 group by p.id, p.name, p.sku, p.initial_stock
 order by movimientos desc;

-- 1.7 Efecto neto histórico interpretable por producto (solo cuando
--     movement_type es IN/OUT). No sustituye una conciliación manual.
select product_id,
       sum(case when upper(btrim(coalesce(movement_type::text, ''))) = 'IN' then quantity
                when upper(btrim(coalesce(movement_type::text, ''))) = 'OUT' then -quantity
                else 0
           end) as efecto_neto_interpretable
  from public.inventory_movements
 group by product_id
 order by product_id;

-- 1.8 constraints, índices, políticas y RLS existentes
select conname, contype, convalidated, pg_get_constraintdef(oid) as definicion
  from pg_constraint
 where conrelid = 'public.inventory_movements'::regclass
 order by conname;

select indexname, indexdef
  from pg_indexes
 where schemaname = 'public'
   and tablename = 'inventory_movements'
 order by indexname;

select policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname = 'public'
   and tablename in ('products', 'inventory_movements');

select relname, relrowsecurity
  from pg_class
 where oid in ('public.products'::regclass, 'public.inventory_movements'::regclass);

-- 1.9 Privilegios actuales por rol. anon no debe aparecer.
select table_name, grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name in ('products', 'inventory_movements')
 order by table_name, grantee, privilege_type;

-- 1.10 Funciones de movimientos existentes (debe estar vacío antes de este doc)
select n.nspname as esquema, p.proname as funcion,
       pg_get_function_arguments(p.oid) as argumentos,
       p.prosecdef as security_definer
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('register_inventory_movement', 'reverse_inventory_movement');


-- ============================================================================
-- 2. PREPARACIÓN DE PRODUCTS.QUANTITY
--
--    products.quantity NO existe en la base de datos verificada. Sin esta
--    columna no es posible calcular ni validar stock.
--
--    Regla conservadora:
--      · Se agrega quantity como columna NULLABLE.
--      · Solo se backfillea desde initial_stock cuando NO existe ningún
--        historial de movimientos (initial_stock se asume como stock actual
--        únicamente en ese caso y con confirmación del propietario).
--      · Con historial existente NO se inventan saldos: se reporta y se
--        requiere conciliación manual.
--      · Nunca se modifica initial_stock.
--      · NO se aplica NOT NULL ni default en esta sección.
-- ============================================================================

begin;

-- 2.A Agregar la columna (nullable)
alter table public.products
    add column if not exists quantity numeric;

-- 2.B Backfill condicional y reporte
do $$
declare
    v_movimientos integer;
    v_con_movimientos integer;
    v_quantity_nulos integer;
begin
    select count(*) into v_movimientos from public.inventory_movements;
    select count(distinct product_id) into v_con_movimientos
      from public.inventory_movements
     where product_id is not null;

    raise notice 'Productos con historial de movimientos: %.', v_con_movimientos;

    if v_movimientos = 0 then
        update public.products
           set quantity = initial_stock
         where quantity is null
           and initial_stock is not null
           and initial_stock >= 0;

        raise notice 'Sin historial de movimientos: quantity backfilled desde initial_stock. Supuesto: initial_stock representa el stock disponible actual. Revisa y confirma este supuesto.';
    else
        raise warning 'Existe historial de movimientos (% filas). NO se aplicó backfill automático. Los productos con movimientos requieren conciliación manual de quantity antes de habilitar el registro.', v_movimientos;
    end if;

    select count(*) into v_quantity_nulos from public.products where quantity is null;
    raise notice 'Productos con quantity NULL después del paso actual: %.', v_quantity_nulos;
end $$;

commit;

-- 2.C Backfill opcional SOLO para productos SIN movimientos cuando el
--     propietario confirma que initial_stock representa el stock actual.
--     Descomenta únicamente con esa confirmación explícita.
--
-- begin;
-- update public.products p
--    set quantity = p.initial_stock
--  where p.quantity is null
--    and p.initial_stock is not null
--    and p.initial_stock >= 0
--    and not exists (
--        select 1 from public.inventory_movements m where m.product_id = p.id
--    );
-- commit;

-- 2.D NOT NULL y default quedan diferidos a la sección 10 (verificación),
--     una vez que no existan productos con quantity NULL. No se aplican aquí
--     para no inventar stock ni romper la migración con datos heredados.


-- ============================================================================
-- 3. COLUMNAS DE TRAZABILIDAD DE INVENTORY_MOVEMENTS
--
--    Columnas confirmadas en vivo: id, product_id, movement_type, quantity,
--    created_at, created_by.
--    Se agregan únicamente las columnas del contrato mínimo aprobado:
--    reason, previous_stock, new_stock, reference, notes, status,
--    reversed_movement_id.
--    No se agrega movement_date: el MVP usa created_at como marca temporal.
-- ============================================================================

begin;

alter table public.inventory_movements add column if not exists reason text;
alter table public.inventory_movements add column if not exists previous_stock numeric;
alter table public.inventory_movements add column if not exists new_stock numeric;
alter table public.inventory_movements add column if not exists reference text;
alter table public.inventory_movements add column if not exists notes text;
alter table public.inventory_movements add column if not exists status text default 'CONFIRMED';
alter table public.inventory_movements add column if not exists reversed_movement_id uuid;

-- Los movimientos heredados quedan CONFIRMED (valor por defecto del sistema,
-- no una reinterpretación de negocio). No se modifica ningún otro campo.
update public.inventory_movements
   set status = 'CONFIRMED'
 where status is null;

alter table public.inventory_movements alter column status set default 'CONFIRMED';
alter table public.inventory_movements alter column status set not null;

-- FK de product_id → products.id (si no existe ya, sin CASCADE).
-- No se crea si existen movimientos huérfanos: primero deben conciliarse.
do $$
declare
    v_attnum smallint;
    v_huerfanos integer;
begin
    select a.attnum into v_attnum
      from pg_attribute a
     where a.attrelid = 'public.inventory_movements'::regclass
       and a.attname = 'product_id'
       and not a.attisdropped;

    if v_attnum is null then
        return;
    end if;

    if exists (
        select 1
          from pg_constraint c
         where c.conrelid = 'public.inventory_movements'::regclass
           and c.contype = 'f'
           and c.conkey = array[v_attnum]
    ) then
        return;
    end if;

    select count(*) into v_huerfanos
      from public.inventory_movements m
      left join public.products p on p.id = m.product_id
     where p.id is null;

    if v_huerfanos = 0 then
        alter table public.inventory_movements
            add constraint inventory_movements_product_id_fkey
            foreign key (product_id) references public.products(id);
        raise notice 'FK inventory_movements.product_id → products.id creada.';
    else
        raise warning 'Hay % movimientos con product_id inexistente. NO se creó la FK. Concilia esos movimientos manualmente.', v_huerfanos;
    end if;
end $$;

-- FK de reversed_movement_id → inventory_movements.id (autorreferencia)
do $$
begin
    if not exists (
        select 1
          from pg_constraint
         where conrelid = 'public.inventory_movements'::regclass
           and conname = 'inventory_movements_reversed_movement_id_fkey'
    ) then
        alter table public.inventory_movements
            add constraint inventory_movements_reversed_movement_id_fkey
            foreign key (reversed_movement_id) references public.inventory_movements(id);
        raise notice 'FK inventory_movements.reversed_movement_id creada.';
    end if;
end $$;

commit;


-- ============================================================================
-- 4. CONSTRAINTS
--
--    Todos se agregan como NOT VALID para no bloquear la migración por datos
--    heredados. Las escrituras nuevas SÍ se validan. Cuando los datos
--    heredados estén corregidos, valida manualmente cada constraint con:
--      alter table public.inventory_movements validate constraint <nombre>;
--    Si existen valores legacy incompatibles, se reportan y NO se fuerza el
--    constraint.
-- ============================================================================

begin;

-- 4.1 movement_type: solo si todos los valores existentes son compatibles
do $$
declare
    v_invalidos integer;
    v_valores text;
begin
    select count(*) into v_invalidos
      from public.inventory_movements
     where upper(btrim(coalesce(movement_type::text, ''))) not in ('IN', 'OUT');

    if v_invalidos = 0 then
        if not exists (
            select 1 from pg_constraint
             where conrelid = 'public.inventory_movements'::regclass
               and conname = 'inventory_movements_type_valid'
        ) then
            alter table public.inventory_movements
                add constraint inventory_movements_type_valid
                check (upper(btrim(movement_type::text)) in ('IN', 'OUT')) not valid;
            raise notice 'Constraint inventory_movements_type_valid agregada (NOT VALID).';
        end if;
    else
        select string_agg(distinct coalesce(movement_type, '<NULL>'), ', ')
          into v_valores
          from public.inventory_movements
         where upper(btrim(coalesce(movement_type::text, ''))) not in ('IN', 'OUT');

        raise warning 'Existen % movimientos con movement_type no compatible (%). NO se agregó el constraint ni se reescribieron valores. Requiere mapping manual aprobado.', v_invalidos, v_valores;
    end if;
end $$;

-- 4.2 status: solo CONFIRMED / REVERSED
do $$
begin
    if not exists (
        select 1 from pg_constraint
         where conrelid = 'public.inventory_movements'::regclass
           and conname = 'inventory_movements_status_valid'
    ) then
        alter table public.inventory_movements
            add constraint inventory_movements_status_valid
            check (status in ('CONFIRMED', 'REVERSED')) not valid;
    end if;
end $$;

-- 4.3 quantity: estrictamente positiva (solo si no hay legacy no positivo)
do $$
declare
    v_invalidos integer;
begin
    select count(*) into v_invalidos
      from public.inventory_movements
     where quantity is null or quantity <= 0;

    if v_invalidos = 0 then
        if not exists (
            select 1 from pg_constraint
             where conrelid = 'public.inventory_movements'::regclass
               and conname = 'inventory_movements_quantity_positive'
        ) then
            alter table public.inventory_movements
                add constraint inventory_movements_quantity_positive
                check (quantity > 0) not valid;
            raise notice 'Constraint inventory_movements_quantity_positive agregada (NOT VALID).';
        end if;
    else
        raise warning 'Existen % movimientos con quantity NULL o <= 0. NO se agregó el constraint. Requiere revisión manual.', v_invalidos;
    end if;
end $$;

-- 4.4 previous_stock / new_stock no negativos (NULL permitido para legacy)
do $$
begin
    if not exists (
        select 1 from pg_constraint
         where conrelid = 'public.inventory_movements'::regclass
           and conname = 'inventory_movements_previous_stock_nonnegative'
    ) then
        alter table public.inventory_movements
            add constraint inventory_movements_previous_stock_nonnegative
            check (previous_stock is null or previous_stock >= 0) not valid;
    end if;

    if not exists (
        select 1 from pg_constraint
         where conrelid = 'public.inventory_movements'::regclass
           and conname = 'inventory_movements_new_stock_nonnegative'
    ) then
        alter table public.inventory_movements
            add constraint inventory_movements_new_stock_nonnegative
            check (new_stock is null or new_stock >= 0) not valid;
    end if;
end $$;

-- 4.5 Un reverso no puede referenciarse a sí mismo
do $$
begin
    if not exists (
        select 1 from pg_constraint
         where conrelid = 'public.inventory_movements'::regclass
           and conname = 'inventory_movements_reversal_not_self'
    ) then
        alter table public.inventory_movements
            add constraint inventory_movements_reversal_not_self
            check (reversed_movement_id is null or reversed_movement_id <> id) not valid;
    end if;
end $$;

commit;


-- ============================================================================
-- 5. ÍNDICES
--
--    Solo los justificados por los patrones de consulta del MVP:
--      · product_id → historial por producto y soporte de FK.
--      · created_at → historial cronológico (la lista ordena por esta columna).
--      · reversed_movement_id (único parcial) → impide reversos duplicados.
--    No se agrega índice sobre movement_type: el filtro es del lado del
--    cliente y el volumen aún no justifica uno.
-- ============================================================================

begin;

create index if not exists inventory_movements_product_id_idx
    on public.inventory_movements (product_id);

create index if not exists inventory_movements_created_at_idx
    on public.inventory_movements (created_at desc);

create unique index if not exists inventory_movements_reversed_unique
    on public.inventory_movements (reversed_movement_id)
    where reversed_movement_id is not null;

commit;


-- ============================================================================
-- 6. FUNCIÓN ATÓMICA DE REGISTRO: register_inventory_movement
--
--    Una sola llamada RPC ejecuta, dentro de una única transacción:
--      · validación de sesión (auth.uid() obligatorio),
--      · validación de tipo, cantidad y motivo,
--      · bloqueo del producto con FOR UPDATE,
--      · verificación de existencia, actividad (si is_active existe) y
--        propiedad (products.user_id),
--      · lectura del stock actual en base de datos,
--      · cálculo del nuevo stock y rechazo de negativos,
--      · inserción del movimiento con previous_stock / new_stock,
--      · actualización de products.quantity,
--      · retorno del movimiento creado.
--    Si cualquier paso falla, PostgreSQL revierte todo.
--
--    El navegador NO envía previous_stock, new_stock, status, created_by ni
--    reversed_movement_id. created_by sale de auth.uid().
--
--    SECURITY DEFINER:
--      Es necesario para que la actualización de products.quantity y la
--      inserción del movimiento ocurran en la misma transacción controlada,
--      sin depender de políticas RLS de escritura directa desde el cliente.
--      La función no permite actualizar columnas arbitrarias de products:
--      solo quantity, con el valor calculado internamente.
-- ============================================================================

create or replace function public.register_inventory_movement(
    p_product_id uuid,
    p_movement_type text,
    p_quantity numeric,
    p_reason text,
    p_reference text default null,
    p_notes text default null
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_product public.products%rowtype;
    v_tipo text := upper(btrim(coalesce(p_movement_type, '')));
    v_cantidad numeric := p_quantity;
    v_nuevo_stock numeric;
    v_activo boolean;
    v_tiene_is_active boolean;
    v_movimiento public.inventory_movements%rowtype;
begin
    if v_user_id is null then
        raise exception 'Se requiere una sesión autenticada de Supabase para registrar movimientos.'
            using errcode = '42501';
    end if;

    if v_tipo not in ('IN', 'OUT') then
        raise exception 'Tipo de movimiento inválido: solo se admite IN o OUT.'
            using errcode = '22023';
    end if;

    if v_cantidad is null
       or v_cantidad::text in ('NaN', 'Infinity', '-Infinity')
       or v_cantidad <= 0 then
        raise exception 'La cantidad debe ser un número finito mayor que cero.'
            using errcode = '22023';
    end if;

    if btrim(coalesce(p_reason, '')) = '' then
        raise exception 'El motivo del movimiento es obligatorio.'
            using errcode = '22023';
    end if;

    select * into v_product
      from public.products
     where id = p_product_id
       for update;

    if not found then
        raise exception 'El producto indicado no existe.'
            using errcode = 'P0002';
    end if;

    -- Supuesto de propiedad: products.user_id es el dueño del producto.
    -- Si el modelo de propiedad fuera distinto, ajustar ANTES de otorgar
    -- EXECUTE (sección 8). Los productos con user_id NULL quedan rechazados
    -- hasta su conciliación.
    if v_product.user_id is distinct from v_user_id then
        raise exception 'No autorizado para registrar movimientos del producto indicado.'
            using errcode = '42501';
    end if;

    -- Verificación de actividad solo si products.is_active existe.
    select exists (
        select 1
          from information_schema.columns
         where table_schema = 'public'
           and table_name = 'products'
           and column_name = 'is_active'
    ) into v_tiene_is_active;

    if v_tiene_is_active then
        execute 'select is_active from public.products where id = $1'
           into v_activo
          using p_product_id;

        if v_activo is not true then
            raise exception 'El producto está inactivo y no admite nuevos movimientos.'
                using errcode = 'P0001';
        end if;
    end if;

    if v_product.quantity is null then
        raise exception 'El producto no tiene un stock actual conciliado (quantity es NULL). Requiere conciliación manual antes de registrar movimientos.'
            using errcode = 'P0001';
    end if;

    v_nuevo_stock := case
        when v_tipo = 'IN' then v_product.quantity + v_cantidad
        else v_product.quantity - v_cantidad
    end;

    if v_nuevo_stock < 0 then
        raise exception 'Stock insuficiente: disponible %, solicitado %.', v_product.quantity, v_cantidad
            using errcode = 'P0001';
    end if;

    insert into public.inventory_movements (
        product_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        reason,
        reference,
        notes,
        status,
        created_by
    ) values (
        p_product_id,
        v_tipo,
        v_cantidad,
        v_product.quantity,
        v_nuevo_stock,
        btrim(p_reason),
        nullif(btrim(coalesce(p_reference, '')), ''),
        nullif(btrim(coalesce(p_notes, '')), ''),
        'CONFIRMED',
        v_user_id
    )
    returning * into v_movimiento;

    update public.products
       set quantity = v_nuevo_stock
     where id = p_product_id;

    return v_movimiento;
end;
$$;

revoke all on function public.register_inventory_movement(uuid, text, numeric, text, text, text) from public;


-- ============================================================================
-- 7. FUNCIÓN ATÓMICA DE REVERSO (OPCIONAL): reverse_inventory_movement
--
--    Sección secundaria. No habilita ninguna acción en el frontend.
--    Crea un movimiento compensatorio, marca el original como REVERSED y
--    enlaza el reverso con reversed_movement_id. Nunca elimina ni edita la
--    cantidad del movimiento original. Todo ocurre en una única transacción.
-- ============================================================================

create or replace function public.reverse_inventory_movement(
    p_movement_id uuid,
    p_reason text
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_user_id uuid := auth.uid();
    v_original public.inventory_movements%rowtype;
    v_product public.products%rowtype;
    v_tipo_reverso text;
    v_nuevo_stock numeric;
    v_reverso public.inventory_movements%rowtype;
begin
    if v_user_id is null then
        raise exception 'Se requiere una sesión autenticada de Supabase para reversar movimientos.'
            using errcode = '42501';
    end if;

    if btrim(coalesce(p_reason, '')) = '' then
        raise exception 'El motivo del reverso es obligatorio.'
            using errcode = '22023';
    end if;

    select * into v_original
      from public.inventory_movements
     where id = p_movement_id
       for update;

    if not found then
        raise exception 'El movimiento original no existe.'
            using errcode = 'P0002';
    end if;

    if v_original.status <> 'CONFIRMED' then
        raise exception 'Solo se pueden reversar movimientos confirmados.'
            using errcode = 'P0001';
    end if;

    if exists (
        select 1
          from public.inventory_movements m
         where m.reversed_movement_id = p_movement_id
    ) then
        raise exception 'El movimiento ya fue reversado.'
            using errcode = '23505';
    end if;

    if v_original.quantity is null or v_original.quantity <= 0 then
        raise exception 'El movimiento original no tiene una cantidad válida para reversar.'
            using errcode = 'P0001';
    end if;

    select * into v_product
      from public.products
     where id = v_original.product_id
       for update;

    if not found then
        raise exception 'El producto relacionado con el movimiento no existe.'
            using errcode = 'P0002';
    end if;

    if v_product.user_id is distinct from v_user_id then
        raise exception 'No autorizado para reversar movimientos del producto indicado.'
            using errcode = '42501';
    end if;

    if v_product.quantity is null then
        raise exception 'El producto no tiene un stock actual conciliado (quantity es NULL).'
            using errcode = 'P0001';
    end if;

    v_tipo_reverso := case when v_original.movement_type = 'IN' then 'OUT' else 'IN' end;

    v_nuevo_stock := case
        when v_tipo_reverso = 'IN' then v_product.quantity + v_original.quantity
        else v_product.quantity - v_original.quantity
    end;

    if v_nuevo_stock < 0 then
        raise exception 'El reverso generaría stock negativo: disponible %, efecto %.', v_product.quantity, v_original.quantity
            using errcode = 'P0001';
    end if;

    insert into public.inventory_movements (
        product_id,
        movement_type,
        quantity,
        previous_stock,
        new_stock,
        reason,
        status,
        created_by,
        reversed_movement_id
    ) values (
        v_original.product_id,
        v_tipo_reverso,
        v_original.quantity,
        v_product.quantity,
        v_nuevo_stock,
        btrim(p_reason),
        'CONFIRMED',
        v_user_id,
        p_movement_id
    )
    returning * into v_reverso;

    update public.inventory_movements
       set status = 'REVERSED'
     where id = p_movement_id;

    update public.products
       set quantity = v_nuevo_stock
     where id = v_original.product_id;

    return v_reverso;
end;
$$;

revoke all on function public.reverse_inventory_movement(uuid, text) from public;


-- ============================================================================
-- 8. PERMISOS PARA AUTHENTICATED (REQUIERE REVISIÓN · NO EJECUTAR A CIEGAS)
--
--    ESTADO ACTUAL DEL FRONTEND: SOLO LECTURA. El registro y el reverso
--    permanecen deshabilitados hasta que esta sección se revise, se ejecute y
--    se verifiquen las funciones.
--
--    ANTES DE DESCOMENTAR:
--      1. Confirma que products.user_id es el modelo de propiedad vigente y
--         que los productos operables lo tienen poblado.
--      2. Confirma que la lectura de inventory_movements debe limitarse por
--         producto propio (política propuesta abajo).
--      3. Confirma que el login vigente produce una sesión real de Supabase
--         Auth (no sessionStorage).
--
--    El EXECUTE ya fue revocado de PUBLIC (que incluye a anon). anon no debe
--    recibir ningún privilegio.
-- ============================================================================

-- begin;
--
-- grant execute on function public.register_inventory_movement(uuid, text, numeric, text, text, text)
--     to authenticated;
--
-- grant execute on function public.reverse_inventory_movement(uuid, text)
--     to authenticated;
--
-- -- Lectura del historial limitada a movimientos de productos propios.
-- -- Nota: la interfaz de solo lectura también consulta public.products, cuya
-- -- política de lectura depende del módulo de Productos (fuera de alcance).
-- create policy inventory_movements_select_own on public.inventory_movements
--     for select to authenticated
--     using (exists (
--         select 1
--           from public.products p
--          where p.id = inventory_movements.product_id
--            and p.user_id = auth.uid()
--     ));
--
-- commit;


-- ============================================================================
-- 9. PREPARACIÓN DE RLS
--
--    Acciones seguras (solo restringen, nunca otorgan):
--      · Habilita RLS en inventory_movements.
--      · Revoca cualquier privilegio de anon sobre la tabla.
--    No se crean políticas permisivas aquí. Sin políticas, RLS deniega toda
--    lectura/escritura directa: es el estado seguro esperado hasta que la
--    sección 8 se apruebe.
-- ============================================================================

begin;

alter table public.inventory_movements enable row level security;

revoke all on public.inventory_movements from anon;

commit;


-- ============================================================================
-- 10. VERIFICACIÓN FINAL (solo lectura) Y PASO OPCIONAL DE NOT NULL
-- ============================================================================

-- 10.1 Columnas finales
select column_name, data_type, is_nullable, column_default
  from information_schema.columns
 where table_schema = 'public'
   and table_name in ('products', 'inventory_movements')
 order by table_name, ordinal_position;

-- 10.2 Constraints (convalidated = false en los NOT VALID)
select conname, contype, convalidated
  from pg_constraint
 where conrelid in ('public.products'::regclass, 'public.inventory_movements'::regclass)
 order by conname;

-- 10.3 Índices
select indexname, indexdef
  from pg_indexes
 where schemaname = 'public'
   and tablename = 'inventory_movements'
 order by indexname;

-- 10.4 Funciones creadas y sus privilegios (proacl no debe mostrar PUBLIC/anon)
select p.proname,
       pg_get_function_arguments(p.oid) as argumentos,
       p.prosecdef as security_definer,
       p.proacl as privilegios
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.proname in ('register_inventory_movement', 'reverse_inventory_movement');

-- 10.5 RLS y políticas
select relname, relrowsecurity
  from pg_class
 where oid in ('public.products'::regclass, 'public.inventory_movements'::regclass);

select policyname, cmd, roles, qual, with_check
  from pg_policies
 where schemaname = 'public'
   and tablename in ('products', 'inventory_movements');

-- 10.6 anon no debe tener privilegios
select table_name, grantee, privilege_type
  from information_schema.role_table_grants
 where table_schema = 'public'
   and table_name in ('products', 'inventory_movements')
   and grantee = 'anon';

-- 10.7 Productos con quantity NULL (debe ser 0 antes de aplicar NOT NULL)
select count(*) as productos_con_quantity_null
  from public.products
 where quantity is null;

-- 10.8 Tipos de movimiento reales
select coalesce(movement_type::text, '<NULL>') as movement_type, count(*) as movimientos
  from public.inventory_movements
 group by movement_type
 order by movimientos desc;

-- 10.9 PASO OPCIONAL: aplicar NOT NULL y default a products.quantity.
--      Ejecuta SOLO cuando 10.7 devuelva 0. El bloque falla de forma segura
--      si aún existen NULL.
--
-- do $$
-- declare
--     v_nulos integer;
-- begin
--     select count(*) into v_nulos from public.products where quantity is null;
--
--     if v_nulos > 0 then
--         raise exception 'Aún hay % productos con quantity NULL. Concilia antes de aplicar NOT NULL.', v_nulos;
--     end if;
--
--     alter table public.products alter column quantity set default 0;
--     alter table public.products alter column quantity set not null;
--     raise notice 'products.quantity quedó NOT NULL con default 0.';
-- end $$;

-- 10.10 PASO OPCIONAL: validar constraints NOT VALID cuando los datos
--       heredados estén corregidos.
--
-- alter table public.inventory_movements validate constraint inventory_movements_type_valid;
-- alter table public.inventory_movements validate constraint inventory_movements_status_valid;
-- alter table public.inventory_movements validate constraint inventory_movements_quantity_positive;
-- alter table public.inventory_movements validate constraint inventory_movements_previous_stock_nonnegative;
-- alter table public.inventory_movements validate constraint inventory_movements_new_stock_nonnegative;
-- alter table public.inventory_movements validate constraint inventory_movements_reversal_not_self;


-- ============================================================================
-- 11. SUPUESTOS
--
--   1. products.quantity no existe en la base verificada. Su ausencia se
--      confirma por sondeo de solo lectura (error 42703 al seleccionarla).
--   2. initial_stock representa el stock inicial registrado al crear el
--      producto; NO se asume automáticamente como stock actual. El backfill
--      solo corre cuando no existe ningún historial de movimientos.
--   3. El historial de movimientos existente, si lo hay, no es reconstruible
--      de forma segura desde initial_stock. Requiere conciliación manual.
--   4. products.user_id existe y se asume como dueño del producto para la
--      verificación de propiedad dentro de las funciones. DEBE confirmarse.
--   5. Los valores reales de movement_type son desconocidos al momento de
--      esta migración. El constraint solo se agrega si todos los valores
--      existentes son IN/OUT; de lo contrario se reportan sin reescribirlos.
--   6. created_by existe en la tabla viva y se completa con auth.uid()
--      dentro de la función. El navegador nunca lo envía.
--   7. La sesión de Supabase Auth es real. sessionStorage no se usa como
--      autorización en ningún punto de este diseño.
--   8. No existe hoy ninguna función atómica de movimientos en la base
--      verificada (sondeo PGRST202 para los nombres candidatos).
--
--   12. BLOQUEADORES Y DECISIONES PENDIENTES
--
--   B1. products.quantity no existe: sin ella no hay stock actual.
--   B2. No existe operación atómica: el frontend permanece de solo lectura
--       hasta que las funciones de las secciones 6 y 7 se ejecuten.
--   B3. Las columnas de trazabilidad no existen: la interfaz actual solo
--       muestra id, producto, SKU, tipo, cantidad, fecha y created_by.
--   B4. products.user_id debe confirmarse como modelo de propiedad antes de
--       otorgar EXECUTE a authenticated (sección 8).
--   B5. RLS de products no se modifica en este documento. Si la lectura de
--       productos está denegada, el módulo de Movimientos muestra el error
--       de permisos correspondiente.
--   B6. Los valores de movement_type y la existencia de datos heredados
--       deben revisarse con la sección 1 antes de ejecutar el resto.
--
-- ============================================================================
