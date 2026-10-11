-- 0015 · Bloqueos de archivos adjuntos al chat (instrucciones escondidas, archivos no válidos)
-- Amplía los motivos que acepta chat_bloqueos para que el administrador los vea en «Valoraciones».

do $$
declare
  c record;
begin
  -- Quita el CHECK de `motivo` sea cual sea su nombre y lo recrea con los motivos nuevos
  for c in
    select conname from pg_constraint
    where conrelid = 'chat_bloqueos'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%motivo%'
  loop
    execute format('alter table chat_bloqueos drop constraint %I', c.conname);
  end loop;
  alter table chat_bloqueos add constraint chat_bloqueos_motivo_check
    check (motivo in ('manipulacion', 'formato', 'fuera_de_alcance', 'demasiado_largo', 'adjunto_sospechoso', 'adjunto_invalido'));
end $$;
