import type { PGlite } from "@electric-sql/pglite";
import type { RepoDocumentos } from "../../src/lib/documents/repo";

const COLUMNAS_EDITABLES = new Set([
  "estado_indexado", "error", "paginas", "embedding_model", "vigente", "hash_sha256", "storage_path", "titulo", "tipo",
  "edificio_id", "unidad_id", "contrato_id", "fecha_documento",
]);

/** Repositorio de documentos sobre PGlite con archivos en memoria (para probar la ingesta real). */
export function pgliteRepo(db: PGlite): RepoDocumentos & { archivosEnMemoria: Map<string, Uint8Array> } {
  const archivosEnMemoria = new Map<string, Uint8Array>();
  return {
    archivosEnMemoria,
    async crear(d) {
      const r = await db.query<{ id: number }>(
        `insert into documentos (titulo, tipo, edificio_id, unidad_id, contrato_id, fecha_documento, sustituye_a, storage_path, mime, hash_sha256, estado_indexado)
         values ($1, $2::tipo_documento, $3, $4, $5, $6, $7, $8, $9, $10, 'pendiente') returning id`,
        [d.titulo, d.tipo, d.edificio_id, d.unidad_id, d.contrato_id, d.fecha_documento, d.sustituye_a, d.storage_path, d.mime, d.hash_sha256]
      );
      return Number(r.rows[0].id);
    },
    async obtener(id) {
      const r = await db.query("select id, titulo, tipo, storage_path, mime, hash_sha256, paginas, sustituye_a from documentos where id = $1", [id]);
      return (r.rows[0] as never) ?? null;
    },
    async actualizar(id, cambios) {
      const claves = Object.keys(cambios).filter((k) => COLUMNAS_EDITABLES.has(k));
      if (claves.length === 0) return;
      const sets = claves.map((k, i) => `${k} = $${i + 2}${k === "estado_indexado" ? "::estado_indexado" : ""}`).join(", ");
      await db.query(`update documentos set ${sets} where id = $1`, [id, ...claves.map((k) => cambios[k])]);
    },
    async porHash(hash, excluirId) {
      const r = await db.query<{ id: number; paginas: number | null }>(
        "select id, paginas from documentos where hash_sha256 = $1 and ($2::bigint is null or id <> $2)",
        [hash, excluirId ?? null]
      );
      return r.rows[0] ? { id: Number(r.rows[0].id), paginas: r.rows[0].paginas } : null;
    },
    async reemplazarFragmentos(documentoId, filas) {
      await db.query("delete from document_chunks where documento_id = $1", [documentoId]);
      for (const f of filas) {
        await db.query(
          "insert into document_chunks (documento_id, orden, pagina, seccion, contenido, embedding, embedding_model) values ($1, $2, $3, $4, $5, $6::float8[], $7)",
          [f.documento_id, f.orden, f.pagina, f.seccion, f.contenido, f.embedding, f.embedding_model]
        );
      }
    },
    async eliminar(id) {
      await db.query("delete from documentos where id = $1", [id]);
    },
    archivos: {
      async subir(ruta, data) {
        archivosEnMemoria.set(ruta, data);
      },
      async descargar(ruta) {
        const d = archivosEnMemoria.get(ruta);
        if (!d) throw new Error(`Archivo no encontrado: ${ruta}`);
        return d;
      },
      async borrar(rutas) {
        rutas.forEach((r) => archivosEnMemoria.delete(r));
      },
    },
  };
}
