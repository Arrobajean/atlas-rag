import { NextResponse } from "next/server";
import { describeError, getSupabaseClient } from "@/lib/rag";
import { eliminarDocumento, indexarDocumento } from "@/lib/documents/ingest";
import { supabaseRepo } from "@/lib/documents/repo";
import { sha256 } from "@/lib/documents/storage";

export const maxDuration = 300;

/** Indexa un documento cuyo archivo ya está en Storage (subida directa desde el navegador). */
export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = Number((await ctx.params).id);
    if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ error: "Id no válido" }, { status: 400 });

    const supabase = getSupabaseClient();
    const { data: doc } = await supabase.from("documentos").select("id, storage_path, hash_sha256").eq("id", id).maybeSingle();
    if (!doc?.storage_path) return NextResponse.json({ error: "El documento no tiene archivo" }, { status: 404 });

    const repo = supabaseRepo();
    const bytes = await repo.archivos.descargar(doc.storage_path);

    // Deduplicación: si el mismo archivo ya estaba subido, se descarta este registro
    if (!doc.hash_sha256) {
      const hash = await sha256(bytes);
      const { data: otro } = await supabase.from("documentos").select("id, paginas").eq("hash_sha256", hash).neq("id", id).maybeSingle();
      if (otro) {
        await eliminarDocumento(id);
        return NextResponse.json({ success: true, documento_id: otro.id, fragmentos: 0, paginas: otro.paginas ?? 0, ocr: false, duplicado: true });
      }
      await supabase.from("documentos").update({ hash_sha256: hash }).eq("id", id);
    }

    const r = await indexarDocumento(id, bytes);
    return NextResponse.json({ success: true, ...r });
  } catch (error) {
    const { message, status } = describeError(error, "Error al procesar el documento");
    return NextResponse.json({ error: message }, { status });
  }
}
