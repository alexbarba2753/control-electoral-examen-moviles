create schema if not exists private;

create table public.recintos (
  id uuid primary key default gen_random_uuid(),
  provincia text not null,
  canton text not null,
  parroquia text not null,
  nombre text not null,
  cantidad_jrv integer not null check (cantidad_jrv > 0 and cantidad_jrv <= 100),
  created_at timestamptz not null default now(),
  unique (canton, parroquia, nombre)
);

create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  cedula text not null unique check (cedula ~ '^[0-9]{10}$'),
  nombres text not null,
  apellidos text not null,
  telefono text not null,
  correo text not null unique,
  rol text not null check (rol in ('provincial', 'recinto', 'veedor')),
  recinto_id uuid references public.recintos(id) on delete set null,
  debe_cambiar_password boolean not null default true,
  created_by uuid references public.usuarios(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index idx_usuarios_coordinador_unico_recinto
  on public.usuarios (recinto_id)
  where rol = 'recinto' and recinto_id is not null;

create index idx_usuarios_recinto_id on public.usuarios (recinto_id);
create index idx_usuarios_rol on public.usuarios (rol);
create index idx_usuarios_created_by on public.usuarios (created_by);

create table public.jrv (
  id uuid primary key default gen_random_uuid(),
  recinto_id uuid not null references public.recintos(id) on delete cascade,
  numero integer not null check (numero > 0),
  veedor_id uuid references public.usuarios(id) on delete set null,
  estado text not null default 'pendiente' check (estado in ('pendiente', 'parcial', 'completa')),
  created_at timestamptz not null default now(),
  unique (recinto_id, numero)
);

create index idx_jrv_recinto_id on public.jrv (recinto_id);
create index idx_jrv_veedor_id on public.jrv (veedor_id);

create table public.organizaciones (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  sigla text not null unique,
  lista text not null unique,
  color_hex text not null,
  orden integer not null unique
);

create table public.candidaturas (
  id uuid primary key default gen_random_uuid(),
  organizacion_id uuid not null references public.organizaciones(id) on delete cascade,
  dignidad text not null check (dignidad in ('alcalde', 'prefecto')),
  nombre_candidato text not null,
  unique (organizacion_id, dignidad)
);

create index idx_candidaturas_organizacion_id on public.candidaturas (organizacion_id);

create table public.actas (
  id uuid primary key default gen_random_uuid(),
  jrv_id uuid not null references public.jrv(id) on delete cascade,
  dignidad text not null check (dignidad in ('alcalde', 'prefecto')),
  nulos integer not null default 0 check (nulos >= 0),
  blancos integer not null default 0 check (blancos >= 0),
  total_sufragantes integer not null default 0 check (total_sufragantes >= 0),
  foto_path text not null,
  puntaje_nitidez numeric(10, 2) not null check (puntaje_nitidez >= 0),
  latitud double precision not null,
  longitud double precision not null,
  precision_gps double precision,
  registrado_por uuid not null references public.usuarios(id),
  actualizado_por uuid not null references public.usuarios(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (jrv_id, dignidad)
);

create index idx_actas_jrv_id on public.actas (jrv_id);
create index idx_actas_dignidad on public.actas (dignidad);
create index idx_actas_registrado_por on public.actas (registrado_por);
create index idx_actas_actualizado_por on public.actas (actualizado_por);

create table public.acta_votos (
  id uuid primary key default gen_random_uuid(),
  acta_id uuid not null references public.actas(id) on delete cascade,
  organizacion_id uuid not null references public.organizaciones(id) on delete restrict,
  votos integer not null default 0 check (votos >= 0),
  unique (acta_id, organizacion_id)
);

create index idx_acta_votos_acta_id on public.acta_votos (acta_id);
create index idx_acta_votos_organizacion_id on public.acta_votos (organizacion_id);

create or replace function private.generar_jrv_recinto()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.jrv (recinto_id, numero, estado)
  select new.id, gs, 'pendiente'
  from generate_series(1, new.cantidad_jrv) as gs;
  return new;
end;
$$;

create trigger trg_generar_jrv_recinto
  after insert on public.recintos
  for each row
  execute function private.generar_jrv_recinto();

create or replace function private.actualizar_estado_jrv()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_jrv_id uuid;
  v_conteo integer;
begin
  v_jrv_id := coalesce(new.jrv_id, old.jrv_id);
  select count(distinct dignidad) into v_conteo
  from public.actas
  where jrv_id = v_jrv_id;

  update public.jrv
  set estado = case
    when v_conteo >= 2 then 'completa'
    when v_conteo = 1 then 'parcial'
    else 'pendiente'
  end
  where id = v_jrv_id;

  return coalesce(new, old);
end;
$$;

create trigger trg_actualizar_estado_jrv
  after insert or delete on public.actas
  for each row
  execute function private.actualizar_estado_jrv();

create or replace function private.actualizar_timestamp_acta()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger trg_actualizar_timestamp_acta
  before update on public.actas
  for each row
  execute function private.actualizar_timestamp_acta();

create or replace function private.proteger_campos_usuario()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rol_actual text;
begin
  if auth.uid() is null then
    return new;
  end if;

  select rol into v_rol_actual from public.usuarios where id = auth.uid();

  if v_rol_actual <> 'provincial' then
    if new.rol is distinct from old.rol
      or new.cedula is distinct from old.cedula
      or new.correo is distinct from old.correo
      or new.recinto_id is distinct from old.recinto_id then
      raise exception 'No tiene permisos para modificar rol o asignacion de cuenta';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_proteger_campos_usuario
  before update on public.usuarios
  for each row
  execute function private.proteger_campos_usuario();
