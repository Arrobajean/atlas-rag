import { getSupabaseClient } from "@/lib/rag";
import { BUCKET } from "./storage";

export interface NuevoDocumento {
  titulo: string;
  tipo: string;
  edificio_id: number | null;
  unidad_id: number | null;
  contrato_id: number | null;
  fecha_documento: string | null;
  sustituye_a: number | null;
  storage_path: string | null;
  mime: string | null;
  hash_sha256: string | null;
}

export interface FilaDocumento {
  id: number;
  titulo: string;
  tipo: string;
  storage_path: string | null;
  mime: string | null;
  hash_sha256: string | null;
  paginas: number | null;
  sustituye_a: number | null;
}

export interface NuevoFragmento {
  documento_id: number;
  orden: number;
  pagina: number | null;
  seccion: string | null;
  contenido: string;
  embedding: number[];
  embedding_model: string;
}

/** Almacenamiento de documentos: Supabase en producción, PGlite en las pruebas. */
export interface RepoDocumentos {
  crear(d: NuevoDocumento): Promise<number>;
  obtener(id: number): Promise<FilaDocumento | null>;
  actualizar(id: number, cambios: Record<string, unknown>): Promise<void>;
  porHash(hash: string, excluirId?: number): Promise<{ id: number; paginas: number | null } | null>;
  reemplazarFragmentos(documentoId: number, filas: NuevoFragmento[]): Promise<void>;
  eliminar(id: number): Promise<void>;
  archivos: {
    subir(ruta: string, data: Uint8Array, contentType: string): Promise<void>;
    descargar(ruta: string): Promise<Uint8Array>;
    borrar(rutas: string[]): Promise<void>;
  };
}

export function supabaseRepo(): RepoDocumentos {
  const supabase = getSupabaseClient();
  return {
    async crear(d) {
      const { data, error } = await supabase
        .from("documentos")
        .insert({ ...d, estado_indexado: "pendiente" })
        .select("id")
        .single();
      if (error) throw new Error(`No se pudo registrar el documento: ${error.message}`);
      return data.id as number;
    },
    async obtener(id) {
      const { data, error } = await supabase
        .from("documentos")
        .select("id, titulo, tipo, storage_path, mime, hash_sha256, paginas, sustituye_a")
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(error.message);
      return (data as FilaDocumento | null) ?? null;
    },
    async actualizar(id, cambios) {
      const { error } = await supabase.from("documentos").update(cambios).eq("id", id);
      if (error) throw new Error(`No se pudo actualizar el documento: ${error.message}`);
    },
    async porHash(hash, excluirId) {
      let q = supabase.from("documentos").select("id, paginas").eq("hash_sha256", hash);
      if (excluirId) q = q.neq("id", excluirId);
      const { data } = await q.maybeSingle();
      return data ?? null;
    },
    async reemplazarFragmentos(documentoId, filas) {
      await supabase.from("document_chunks").delete().eq("documento_id", documentoId);
      const payload = filas.map((f) => ({ ...f, embedding: `[${f.embedding.join(",")}]` }));
      for (let i = 0; i < payload.length; i += 100) {
        const { error } = await supabase.from("document_chunks").insert(payload.slice(i, i + 100));
        if (error) throw new Error(`No se pudieron guardar los fragmentos: ${error.message}`);
      }
    },
    async eliminar(id) {
      const { error } = await supabase.from("documentos").delete().eq("id", id);
      if (error) throw new Error(`No se pudo eliminar el documento: ${error.message}`);
    },
    archivos: {
      async subir(ruta, data, contentType) {
        const { error } = await supabase.storage.from(BUCKET).upload(ruta, data, { contentType, upsert: false });
        if (error) throw new Error(`No se pudo guardar el archivo: ${error.message}`);
      },
      async descargar(ruta) {
        const { data, error } = await supabase.storage.from(BUCKET).download(ruta);
        if (error || !data) throw new Error(`No se pudo leer el archivo: ${error?.message ?? "no existe"}`);
        return new Uint8Array(await data.arrayBuffer());
      },
      async borrar(rutas) {
        if (rutas.length === 0) return;
        const { error } = await supabase.storage.from(BUCKET).remove(rutas);
        if (error) throw new Error(`No se pudo borrar el archivo: ${error.message}`);
      },
    },
  };
}
