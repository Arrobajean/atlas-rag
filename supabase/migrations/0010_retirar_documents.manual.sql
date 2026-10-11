-- 0010 · MANUAL (el ejecutor de migraciones lo omite a propósito).
-- Ejecutar solo cuando 0009 haya migrado los datos y la app ya no use la tabla antigua.
-- Es destructivo: comprueba antes que `documentos`/`document_chunks` contienen tus fragmentos.
--   select (select count(*) from documents) as antiguos, (select count(*) from document_chunks) as nuevos;

drop function if exists match_documents(vector, int);
drop table if exists documents;
