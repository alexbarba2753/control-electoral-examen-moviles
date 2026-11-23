revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.rol_actual()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.rol
  from public.usuarios u
  where u.id = (select auth.uid())
  limit 1;
$$;

create or replace function private.recinto_actual()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select u.recinto_id
  from public.usuarios u
  where u.id = (select auth.uid())
  limit 1;
$$;

revoke all on function private.rol_actual() from public;
grant execute on function private.rol_actual() to authenticated;

revoke all on function private.recinto_actual() from public;
grant execute on function private.recinto_actual() to authenticated;

alter table public.recintos enable row level security;
alter table public.usuarios enable row level security;
alter table public.jrv enable row level security;
alter table public.organizaciones enable row level security;
alter table public.candidaturas enable row level security;
alter table public.actas enable row level security;
alter table public.acta_votos enable row level security;

create policy "recintos_select_por_rol"
  on public.recintos for select
  to authenticated
  using (
    private.rol_actual() = 'provincial'
    or id = private.recinto_actual()
  );

create policy "recintos_insert_provincial"
  on public.recintos for insert
  to authenticated
  with check (private.rol_actual() = 'provincial');

create policy "recintos_update_provincial"
  on public.recintos for update
  to authenticated
  using (private.rol_actual() = 'provincial')
  with check (private.rol_actual() = 'provincial');

create policy "usuarios_select_por_rol"
  on public.usuarios for select
  to authenticated
  using (
    id = (select auth.uid())
    or private.rol_actual() = 'provincial'
    or (
      private.rol_actual() = 'recinto'
      and rol = 'veedor'
      and recinto_id = private.recinto_actual()
    )
  );

create policy "usuarios_update_propio"
  on public.usuarios for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "usuarios_update_provincial_coordinadores"
  on public.usuarios for update
  to authenticated
  using (
    private.rol_actual() = 'provincial'
    and rol = 'recinto'
  )
  with check (
    private.rol_actual() = 'provincial'
    and rol = 'recinto'
  );

create policy "jrv_select_por_rol"
  on public.jrv for select
  to authenticated
  using (
    private.rol_actual() = 'provincial'
    or (
      private.rol_actual() = 'recinto'
      and recinto_id = private.recinto_actual()
    )
    or (
      private.rol_actual() = 'veedor'
      and veedor_id = (select auth.uid())
    )
  );

create policy "jrv_update_recinto"
  on public.jrv for update
  to authenticated
  using (
    private.rol_actual() = 'recinto'
    and recinto_id = private.recinto_actual()
  )
  with check (
    private.rol_actual() = 'recinto'
    and recinto_id = private.recinto_actual()
    and (
      veedor_id is null
      or exists (
        select 1
        from public.usuarios u
        where u.id = veedor_id
          and u.rol = 'veedor'
          and u.recinto_id = private.recinto_actual()
      )
    )
  );

create policy "organizaciones_select_autenticados"
  on public.organizaciones for select
  to authenticated
  using (true);

create policy "candidaturas_select_autenticados"
  on public.candidaturas for select
  to authenticated
  using (true);

create policy "actas_select_por_rol"
  on public.actas for select
  to authenticated
  using (
    private.rol_actual() = 'provincial'
    or exists (
      select 1
      from public.jrv j
      where j.id = jrv_id
        and (
          (private.rol_actual() = 'recinto' and j.recinto_id = private.recinto_actual())
          or (private.rol_actual() = 'veedor' and j.veedor_id = (select auth.uid()))
        )
    )
  );

create policy "actas_insert_por_pertenencia"
  on public.actas for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.jrv j
      where j.id = jrv_id
        and (
          (private.rol_actual() = 'recinto' and j.recinto_id = private.recinto_actual())
          or (private.rol_actual() = 'veedor' and j.veedor_id = (select auth.uid()))
        )
    )
  );

create policy "actas_update_por_pertenencia"
  on public.actas for update
  to authenticated
  using (
    exists (
      select 1
      from public.jrv j
      where j.id = jrv_id
        and (
          (private.rol_actual() = 'recinto' and j.recinto_id = private.recinto_actual())
          or (private.rol_actual() = 'veedor' and j.veedor_id = (select auth.uid()))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.jrv j
      where j.id = jrv_id
        and (
          (private.rol_actual() = 'recinto' and j.recinto_id = private.recinto_actual())
          or (private.rol_actual() = 'veedor' and j.veedor_id = (select auth.uid()))
        )
    )
  );

create policy "acta_votos_select_por_rol"
  on public.acta_votos for select
  to authenticated
  using (
    private.rol_actual() = 'provincial'
    or exists (
      select 1
      from public.actas a
      join public.jrv j on j.id = a.jrv_id
      where a.id = acta_id
        and (
          (private.rol_actual() = 'recinto' and j.recinto_id = private.recinto_actual())
          or (private.rol_actual() = 'veedor' and j.veedor_id = (select auth.uid()))
        )
    )
  );

create policy "acta_votos_insert_por_pertenencia"
  on public.acta_votos for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.actas a
      join public.jrv j on j.id = a.jrv_id
      where a.id = acta_id
        and (
          (private.rol_actual() = 'recinto' and j.recinto_id = private.recinto_actual())
          or (private.rol_actual() = 'veedor' and j.veedor_id = (select auth.uid()))
        )
    )
  );

create policy "acta_votos_update_por_pertenencia"
  on public.acta_votos for update
  to authenticated
  using (
    exists (
      select 1
      from public.actas a
      join public.jrv j on j.id = a.jrv_id
      where a.id = acta_id
        and (
          (private.rol_actual() = 'recinto' and j.recinto_id = private.recinto_actual())
          or (private.rol_actual() = 'veedor' and j.veedor_id = (select auth.uid()))
        )
    )
  )
  with check (
    exists (
      select 1
      from public.actas a
      join public.jrv j on j.id = a.jrv_id
      where a.id = acta_id
        and (
          (private.rol_actual() = 'recinto' and j.recinto_id = private.recinto_actual())
          or (private.rol_actual() = 'veedor' and j.veedor_id = (select auth.uid()))
        )
    )
  );

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('actas-fotos', 'actas-fotos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "storage_actas_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'actas-fotos'
    and (
      private.rol_actual() = 'provincial'
      or (
        private.rol_actual() = 'recinto'
        and (storage.foldername(name))[1] = private.recinto_actual()::text
      )
      or (
        private.rol_actual() = 'veedor'
        and exists (
          select 1
          from public.jrv j
          where j.id::text = (storage.foldername(name))[2]
            and j.veedor_id = (select auth.uid())
        )
      )
    )
  );

create policy "storage_actas_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'actas-fotos'
    and (
      (
        private.rol_actual() = 'recinto'
        and (storage.foldername(name))[1] = private.recinto_actual()::text
      )
      or (
        private.rol_actual() = 'veedor'
        and exists (
          select 1
          from public.jrv j
          where j.id::text = (storage.foldername(name))[2]
            and j.veedor_id = (select auth.uid())
        )
      )
    )
  );

create policy "storage_actas_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'actas-fotos'
    and (
      (
        private.rol_actual() = 'recinto'
        and (storage.foldername(name))[1] = private.recinto_actual()::text
      )
      or (
        private.rol_actual() = 'veedor'
        and exists (
          select 1
          from public.jrv j
          where j.id::text = (storage.foldername(name))[2]
            and j.veedor_id = (select auth.uid())
        )
      )
    )
  )
  with check (
    bucket_id = 'actas-fotos'
    and (
      (
        private.rol_actual() = 'recinto'
        and (storage.foldername(name))[1] = private.recinto_actual()::text
      )
      or (
        private.rol_actual() = 'veedor'
        and exists (
          select 1
          from public.jrv j
          where j.id::text = (storage.foldername(name))[2]
            and j.veedor_id = (select auth.uid())
        )
      )
    )
  );
