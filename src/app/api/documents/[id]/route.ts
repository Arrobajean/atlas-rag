import { NextResponse } from "next/server";
import { z, ZodError } from "zod";
import { describeError, getSupabaseClient } from "@/lib/rag";
import { eliminarDocumento, TIPOS_DOCUMENTO } from "@/lib/documents/ingest";
import { urlDeLectura } from "@/lib/documents/storage";

const idNumerico = (v: string) => {
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

function respuestaError(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues.map((i) => i.message).join(" · ") }, { status: 400 });
  }
  const { message, status } = describeError(error, fallback);
  return NextResponse.json({ error: message }, { status });
}

/** Documento + URL temporal del archivo. Con ?chunks=1 incluye sus fragmentos en orden. */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = idNumerico((await ctx.params).id);
    if (!id) return NextResponse.json({ error: "Id no válido" }, { status: 400 });

    const supabase = getSupabaseClient();
    const { data: doc, error } = await supabase.from("documentos").select("*").eq("id", id).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

    const archivo_url = doc.storage_path ? await urlDeLectura(doc.storage_path).catch(() => null) : null;
    let chunks: unknown[] | undefined;
    if (new URL(req.url).searchParams.get("chunks")) {
      const r = await supabase.from("document_chunks").select("id, orden, pagina, seccion, contenido").eq("documento_id", id).order("orden");
      chunks = r.data ?? [];
    }
    const { storage_path, ...publico } = doc;
    return NextResponse.json({ documento: { ...publico, tiene_archivo: !!storage_path }, archivo_url, chunks });
  } catch (error) {
    return respuestaError(error, "Error al leer el documento");
  }
}

const idOpc = z.number().int().positive().nullable();
const CambiosSchema = z
  .object({
    titulo: z.string().trim().min(1).max(200),
    tipo: z.enum(TIPOS_DOCUMENTO),
    edificio_id: idOpc,
    unidad_id: idOpc,
    contrato_id: idOpc,
    vigente: z.boolean(),
    fecha_documento: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  })
  .partial();

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = idNumerico((await ctx.params).id);
    if (!id) return NextResponse.json({ error: "Id no válido" }, { status: 400 });
    const cambios = CambiosSchema.parse(await req.json());
    if (Object.keys(cambios).length === 0) return NextResponse.json({ error: "Sin cambios" }, { status: 400 });

    const { error } = await getSupabaseClient().from("documentos").update(cambios).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return respuestaError(error, "Error al actualizar el documento");
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    const id = idNumerico((await ctx.params).id);
    if (!id) return NextResponse.json({ error: "Id no válido" }, { status: 400 });
    await eliminarDocumento(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return respuestaError(error, "Error al eliminar el documento");
  }
}
