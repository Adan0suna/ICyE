-- ============================================================
-- ICyE — esquema inicial (Supabase / PostgreSQL)
-- Cubre RF-01 a RF-21 y los RNF-04, 05, 06, 08
-- Ejecutar en el SQL Editor de Supabase, en este orden.
-- ============================================================

create extension if not exists pg_trgm;

-- ------------------------------------------------------------
-- 1. Usuarios y roles (RF-01, RF-02, RNF-08)
--    Supabase Auth guarda la contraseña en auth.users.
--    Aquí solo va el perfil de negocio.
-- ------------------------------------------------------------

create type rol_usuario as enum ('administrador', 'capturista');

create table perfiles (
  id          uuid primary key references auth.users on delete cascade,
  nombre      text not null,
  rol         rol_usuario not null default 'capturista',
  activo      boolean not null default true,
  creado_en   timestamptz not null default now()
);

-- Se usa dentro de las políticas RLS. SECURITY DEFINER evita
-- recursión infinita al consultar perfiles desde una política.
create or replace function mi_rol()
returns rol_usuario
language sql stable security definer set search_path = public as $$
  select rol from perfiles where id = auth.uid() and activo
$$;

create or replace function es_admin()
returns boolean
language sql stable as $$
  select mi_rol() = 'administrador'
$$;

-- ------------------------------------------------------------
-- 2. Ubicaciones físicas (RF-03, RF-04, RF-05, RF-06, RF-07)
-- ------------------------------------------------------------

create table casilleros (
  id      smallserial primary key,
  clave   text not null unique,          -- 2M, 2N, 2O...
  nombre  text,
  activo  boolean not null default true
);

create table filas (
  id            serial primary key,
  casillero_id  smallint not null references casilleros on delete restrict,
  clave         text not null check (clave ~ '^[A-Z]$'),   -- A..E
  activo        boolean not null default true,
  unique (casillero_id, clave)
);

create type estado_bli as enum ('disponible', 'asignado', 'incompleto');

create table bli (
  id            bigserial primary key,
  fila_id       integer not null references filas on delete restrict,
  subposicion   text not null check (subposicion ~ '^[0-9]{4}$'),  -- 0000, 0010...
  control       text not null,           -- 2M-A0000, lo arma el trigger
  estado        estado_bli not null default 'disponible',
  notas         text,
  creado_en     timestamptz not null default now(),
  unique (fila_id, subposicion),         -- RF-07: sin subposiciones repetidas
  unique (control)
);

-- RF-06: el capturista nunca escribe el control completo.
create or replace function fn_bli_control()
returns trigger language plpgsql as $$
begin
  select c.clave || '-' || f.clave || new.subposicion
    into new.control
  from filas f
  join casilleros c on c.id = f.casillero_id
  where f.id = new.fila_id;

  if new.control is null then
    raise exception 'La fila % no existe', new.fila_id;
  end if;
  return new;
end $$;

create trigger tg_bli_control
before insert or update of fila_id, subposicion on bli
for each row execute function fn_bli_control();

-- ------------------------------------------------------------
-- 3. Catálogo de códigos (RF-09, RF-11, RF-12)
-- ------------------------------------------------------------

create table familias (
  id      serial primary key,
  nombre  text not null unique
);

create table marcas (
  id      serial primary key,
  nombre  text not null unique
);

-- El "grupo maestro" es lo que agrupa CA-94-G, CA-94-1G y 55287.
-- Con esto, la equivalencia se resuelve sola: dos códigos son
-- equivalentes si comparten grupo.
create table grupos (
  id           serial primary key,
  clave        text not null unique,     -- CA-94
  descripcion  text
);

create table codigos (
  id           bigserial primary key,
  codigo       text not null unique,     -- CA-94-G
  descripcion  text,
  familia_id   integer references familias,
  marca_id     integer references marcas,
  grupo_id     integer references grupos,
  activo       boolean not null default true,
  creado_en    timestamptz not null default now()
);

-- Equivalencias sueltas entre códigos que no caen en el mismo grupo
-- (RF-11). Si el grupo resulta suficiente al analizar el Excel,
-- esta tabla se puede borrar sin tocar el resto.
create table equivalencias (
  codigo_a_id  bigint not null references codigos on delete cascade,
  codigo_b_id  bigint not null references codigos on delete cascade,
  nota         text,
  primary key (codigo_a_id, codigo_b_id),
  check (codigo_a_id < codigo_b_id)      -- evita el par duplicado A-B / B-A
);

-- RF-12: búsqueda por código y descripción sobre miles de registros.
-- trigram y no full-text porque los códigos traen guiones y números.
create index ix_codigos_codigo_trgm on codigos using gin (codigo gin_trgm_ops);
create index ix_codigos_desc_trgm   on codigos using gin (descripcion gin_trgm_ops);
create index ix_codigos_grupo       on codigos (grupo_id);
create index ix_codigos_marca       on codigos (marca_id);

-- ------------------------------------------------------------
-- 4. Asignaciones código → BLI (RF-08, RF-10, RF-13, RF-14, RF-15)
--    La existencia vive aquí, no en el código: el mismo código
--    puede estar en dos ubicaciones con cantidades distintas.
-- ------------------------------------------------------------

create table asignaciones (
  id              bigserial primary key,
  bli_id          bigint not null references bli on delete restrict,
  codigo_id       bigint not null references codigos on delete restrict,
  existencia      integer not null default 0 check (existencia >= 0),
  activo          boolean not null default true,   -- RF-15: baja lógica
  creado_por      uuid references perfiles,
  creado_en       timestamptz not null default now(),
  actualizado_en  timestamptz not null default now()
);

-- RNF-05: el mismo código no se asigna dos veces al mismo BLI,
-- pero sí se puede volver a dar de alta después de una baja lógica.
create unique index ux_asignacion_activa
  on asignaciones (bli_id, codigo_id) where activo;

create index ix_asignaciones_bli    on asignaciones (bli_id) where activo;
create index ix_asignaciones_codigo on asignaciones (codigo_id) where activo;

create or replace function fn_touch()
returns trigger language plpgsql as $$
begin
  new.actualizado_en = now();
  return new;
end $$;

create trigger tg_asignaciones_touch
before update on asignaciones
for each row execute function fn_touch();

-- ------------------------------------------------------------
-- 5. Auditoría (RF-21)
--    En el nivel de base de datos, no del frontend: con Supabase
--    el navegador habla directo con Postgres y un log escrito
--    desde React se puede saltar.
-- ------------------------------------------------------------

create table auditoria (
  id             bigserial primary key,
  tabla          text not null,
  registro_id    text not null,
  accion         text not null,           -- INSERT / UPDATE / DELETE
  usuario_id     uuid,
  datos_antes    jsonb,
  datos_despues  jsonb,
  ocurrido_en    timestamptz not null default now()
);

create index ix_auditoria_fecha  on auditoria (ocurrido_en desc);
create index ix_auditoria_tabla  on auditoria (tabla, registro_id);

create or replace function fn_auditar()
returns trigger language plpgsql security definer as $$
begin
  insert into auditoria (tabla, registro_id, accion, usuario_id, datos_antes, datos_despues)
  values (
    tg_table_name,
    coalesce(new.id, old.id)::text,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT','UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end $$;

create trigger tg_aud_asignaciones
after insert or update or delete on asignaciones
for each row execute function fn_auditar();

create trigger tg_aud_bli
after insert or update or delete on bli
for each row execute function fn_auditar();

create trigger tg_aud_codigos
after insert or update or delete on codigos
for each row execute function fn_auditar();

-- ------------------------------------------------------------
-- 6. Vistas de consulta y exportación (RF-13, RF-17, RF-18)
-- ------------------------------------------------------------

-- Estructura exacta del Excel de salida.
create view v_exportacion as
select
  c.codigo        as "CODIGO",
  b.control       as "CONTROL",
  c.descripcion   as "DESCRIPCION",
  f.nombre        as "FAMILIA",
  m.nombre        as "MARCA",
  a.existencia    as "EXISTENCIA"
from asignaciones a
join bli      b on b.id = a.bli_id
join codigos  c on c.id = a.codigo_id
left join familias f on f.id = c.familia_id
left join marcas   m on m.id = c.marca_id
where a.activo
order by b.control, c.codigo;

-- Tabla general con todo lo que piden los filtros de RF-19.
create view v_asignaciones as
select
  a.id,
  cas.clave      as casillero,
  fil.clave      as fila,
  b.subposicion,
  b.control,
  b.estado,
  c.codigo,
  c.descripcion,
  g.clave        as grupo,
  fam.nombre     as familia,
  mar.nombre     as marca,
  a.existencia,
  a.actualizado_en
from asignaciones a
join bli        b   on b.id  = a.bli_id
join filas      fil on fil.id = b.fila_id
join casilleros cas on cas.id = fil.casillero_id
join codigos    c   on c.id  = a.codigo_id
left join grupos   g   on g.id   = c.grupo_id
left join familias fam on fam.id = c.familia_id
left join marcas   mar on mar.id = c.marca_id
where a.activo;

-- ------------------------------------------------------------
-- 7. RLS (RNF-08)
--    Sin esto, cualquiera con la anon key lee toda la base.
-- ------------------------------------------------------------

alter table perfiles      enable row level security;
alter table casilleros    enable row level security;
alter table filas         enable row level security;
alter table bli           enable row level security;
alter table familias      enable row level security;
alter table marcas        enable row level security;
alter table grupos        enable row level security;
alter table codigos       enable row level security;
alter table equivalencias enable row level security;
alter table asignaciones  enable row level security;
alter table auditoria     enable row level security;

-- Lectura: cualquier usuario autenticado y activo.
create policy leer_perfiles      on perfiles      for select to authenticated using (true);
create policy leer_casilleros    on casilleros    for select to authenticated using (true);
create policy leer_filas         on filas         for select to authenticated using (true);
create policy leer_bli           on bli           for select to authenticated using (true);
create policy leer_familias      on familias      for select to authenticated using (true);
create policy leer_marcas        on marcas        for select to authenticated using (true);
create policy leer_grupos        on grupos        for select to authenticated using (true);
create policy leer_codigos       on codigos       for select to authenticated using (true);
create policy leer_equivalencias on equivalencias for select to authenticated using (true);
create policy leer_asignaciones  on asignaciones  for select to authenticated using (true);

-- El capturista trabaja códigos y asignaciones.
create policy escribir_codigos on codigos
  for all to authenticated
  using (mi_rol() is not null) with check (mi_rol() is not null);

create policy escribir_asignaciones on asignaciones
  for all to authenticated
  using (mi_rol() is not null) with check (mi_rol() is not null);

create policy escribir_bli on bli
  for all to authenticated
  using (mi_rol() is not null) with check (mi_rol() is not null);

-- Los catálogos de ubicación y los perfiles solo el administrador.
create policy admin_casilleros on casilleros for all to authenticated
  using (es_admin()) with check (es_admin());
create policy admin_filas on filas for all to authenticated
  using (es_admin()) with check (es_admin());
create policy admin_perfiles on perfiles for all to authenticated
  using (es_admin()) with check (es_admin());

-- La auditoría no se lee ni se modifica desde el cliente.
-- Solo el administrador consulta; nadie edita (el trigger escribe
-- con SECURITY DEFINER, así que no necesita política de insert).
create policy leer_auditoria on auditoria for select to authenticated
  using (es_admin());

-- ------------------------------------------------------------
-- 8. Datos iniciales (RF-03, RF-04, RF-07)
--    Arranque con un solo casillero: 5 filas x 100 subposiciones
--    (0000 a 0990 en pasos de 10) = 500 ubicaciones.
--    Cambia '2M' por el casillero real y ajusta el 990 si la fila
--    no llega hasta ahí. Los demás casilleros se agregan después
--    repitiendo estos tres inserts, sin tocar el esquema.
-- ------------------------------------------------------------

insert into casilleros (clave) values ('2M');

insert into filas (casillero_id, clave)
select c.id, f
from casilleros c
cross join (values ('A'),('B'),('C'),('D'),('E')) as x(f)
where c.clave = '2M';

insert into bli (fila_id, subposicion)
select f.id, lpad(n::text, 4, '0')
from filas f
join casilleros c on c.id = f.casillero_id
cross join generate_series(0, 990, 10) as n
where c.clave = '2M';