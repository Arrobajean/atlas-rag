-- 0009 · Migra la tabla antigua `documents` al modelo nuevo y activa RLS en todas las tablas

-- 1. Cada `source` antiguo pasa a ser un documento general; sus fragmentos se conservan con su embedding.
do $$
begin
  if to_regclass('public.documents') is not null then
    insert into documentos (titulo, tipo, estado_indexado, embedding_model, vigente)
    select s.source, 'general', 'indexado', 'gemini-embedding-001', true
    from (select distinct source from documents) s
    where not exists (select 1 from documentos d where d.titulo = s.source and d.tipo = 'general');

    insert into document_chunks (documento_id, orden, contenido, embedding, embedding_model)
    select d.id,
           (row_number() over (partition by x.source order by x.id))::int,
           x.content,
           x.embedding,
           'gemini-embedding-001'
    from documents x
    join documentos d on d.titulo = x.source and d.tipo = 'general'
    on conflict (documento_id, orden) do nothing;
  end if;
end $$;

-- 2. RLS activado en todo `public`. Sin políticas: solo la clave service_role (servidor) accede.
--    Las políticas por rol (admin / gestor / propietario) llegan con Supabase Auth.
do $$
declare
  r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', r.tablename);
  end loop;
end $$;

-- 3. Las funciones no deben ser ejecutables con la clave pública (anon) ni por usuarios autenticados
--    hasta que existan políticas por rol. Solo service_role (servidor) las usa.
do $$
declare
  rol text;
begin
  foreach rol in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = rol) then
      execute format('revoke execute on all functions in schema public from %I', rol);
      execute format('alter default privileges in schema public revoke execute on functions from %I', rol);
    end if;
  end loop;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on all functions in schema public to service_role';
  end if;
end $$;
revoke execute on all functions in schema public from public;
alter default privileges in schema public revoke execute on functions from public;
