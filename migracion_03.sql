-- ============================================================
-- ICyE — migración 03: equivalencias como texto plano
-- Evita crear registros duplicados en codigos al capturar
-- una equivalencia. El texto se guarda directo en equivalencias.
-- Correr en el SQL Editor de Supabase.
-- ============================================================

-- 1. Agregar columna de texto y hacer equivalente_id opcional
alter table equivalencias
  add column if not exists texto_equivalente text;

alter table equivalencias
  alter column equivalente_id drop not null;

-- 2. Actualizar la vista para leer el texto directo
create or replace view v_codigos_export as
select
  c.id,
  c.codigo,
  (
    select e.texto_equivalente
    from   equivalencias e
    where  e.codigo_id = c.id
    limit  1
  ) as equivalencia,
  (
    select string_agg(b.control, ', ')
    from   asignaciones a
    join   bli b on b.id = a.bli_id
    where  a.codigo_id = c.id and a.activo
  ) as bli,
  m.nombre as marca,
  coalesce(
    (
      select sum(a.existencia)
      from   asignaciones a
      where  a.codigo_id = c.id and a.activo
    ),
    0
  ) as existencia
from   codigos c
left   join marcas m on m.id = c.marca_id
where  c.activo = true;

grant select on v_codigos_export to authenticated;

-- 3. (Opcional) Limpiar los registros HGX que fueron creados
--    automáticamente como equivalencia fantasma.
--    Solo ejecuta si quieres limpiar la tabla codigos.
--
-- delete from codigos
-- where descripcion = 'Creado automáticamente como equivalencia';
