import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { describeError, getSupabaseClient } from "@/lib/rag";
import { DatosDocumentoSchema, datosDeFormulario } from "@/lib/documents/api";
import { crearDocumento, indexarTexto, subirEIndexar, type DatosDocumento } from "@/lib/documents/ingest";
import { MAX_BYTES, rutaNueva, urlDeSubida } from "@/lib/documents/storage";

export const maxDuration = 300;

const SELECCION = `
  id, titulo, tipo, edificio_id, unidad_id, contrato_id, mime, paginas, vigente, fecha_documento,
  estado_indexado, error, storage_path, sustituye_a, created_at,
  document_chunks(count),
  edificios(referencia, direccion),
  unidades(referencia),
  contratos:contratos!documentos_contrato_id_fkey(referencia),
  extracciones(id, estado)
`;

interface FilaDocumento {
  id: number;
  titulo: string;
  tipo: string;
  edificio_id: number | null;
  unidad_id: number | null;
  contrato_id: number | null;
  mime: string | null;
  paginas: number | null;
  vigente: boolean;
  fecha_documento: string | null;
  estado_indexado: string;
  error: string | null;
  storage_path: string | null;
  sustituye_a: number | null;
  created_at: string;
  document_chunks: { count: number }[];
  edificios: { referencia: string; direccion: string } | null;
  unidades: { referencia: string } | null;
  contratos: { referencia: string } | null;
  extracciones: { id: number; estado: string }[];
}

function respuestaError(error: unknown, fallback: string) {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: error.issues.map((i) => i.message).join(" · ") }, { status: 400 });
  }
  const { message, status } = describeError(error, fallback);
  return NextResponse.json({ error: message }, { status });
}

/** Lista documentos con sus vínculos. Filtros: tipo, estado, edificio_id, unidad_id, q. */
export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    let q = getSupabaseClient().from("documentos").select(SELECCION, { count: "exact" }).order("created_at", { ascending: false }).limit(500);
    if (p.get("tipo")) q = q.eq("tipo", p.get("tipo")!);
    if (p.get("estado")) q = q.eq("estado_indexado", p.get("estado")!);
    if (p.get("edificio_id")) q = q.eq("edificio_id", Number(p.get("edificio_id")));
    if (p.get("unidad_id")) q = q.eq("unidad_id", Number(p.get("unidad_id")));
    if (p.get("q")) q = q.ilike("titulo", `%${p.get("q")!.replace(/[%,]/g, " ")}%`);

    const { data, error, count } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const documentos = ((data ?? []) as unknown as FilaDocumento[]).map((d) => {
      const { document_chunks, edificios, unidades, contratos, extracciones, storage_path, ...resto } = d;
      return {
        ...resto,
        fragmentos: document_chunks?.[0]?.count ?? 0,
        edificio: edificios,
        unidad_ref: unidades?.referencia ?? null,
        contrato_ref: contratos?.referencia ?? null,
        tiene_archivo: !!storage_path,
        extraccion: extracciones?.length ? extracciones[extracciones.length - 1] : null,
      };
    });

    return NextResponse.json({
      documentos,
      total: count ?? documentos.length,
      fragmentos: documentos.reduce((suma, d) => suma + d.fragmentos, 0),
    });
  } catch (error) {
    return respuestaError(error, "Error al obtener documentos");
  }
}

/**
 * Tres formas de crear un documento:
 *  · multipart/form-data con `file` (+ metadatos): se guarda en Storage y se indexa.
 *  · JSON { accion: "preparar", nombre, mime, tamano, …metadatos }: devuelve una URL firmada para subir
 *    directamente desde el navegador (sin pasar por la función) y luego se llama a /[id]/procesar.
 *  · JSON { contenido, titulo, …metadatos }: texto pegado.
 */
export async function POST(req: Request) {
  try {
    if (req.headers.get("content-type")?.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "No se recibió ningún archivo" }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "El archivo supera los 25 MB" }, { status: 413 });
      }
      const datos = datosDeFormulario(form, file.name.replace(/\.[^.]+$/, ""));
      const r = await subirEIndexar(
        { nombre: file.name, mime: file.type || "application/octet-stream", data: new Uint8Array(await file.arrayBuffer()) },
        datos
      );
      return NextResponse.json({ success: true, ...r });
    }

    const body = await req.json();

    if (body.accion === "preparar") {
      const datos = DatosDocumentoSchema.parse({ ...body, titulo: body.titulo || String(body.nombre ?? "").replace(/\.[^.]+$/, "") }) as DatosDocumento;
      if (Number(body.tamano) > MAX_BYTES) {
        return NextResponse.json({ error: "El archivo supera los 25 MB" }, { status: 413 });
      }
      const ruta = rutaNueva(datos.tipo, String(body.nombre ?? "documento"));
      const id = await crearDocumento(datos, { storage_path: ruta, mime: String(body.mime ?? "application/pdf") });
      const firmada = await urlDeSubida(ruta);
      return NextResponse.json({
        documento_id: id,
        ruta,
        signedUrl: firmada.signedUrl,
        // La pasarela de Supabase exige la clave pública en la cabecera; se comparte solo si está configurada.
        apikey: process.env.SUPABASE_ANON_KEY ?? null,
      });
    }

    if (typeof body.contenido === "string") {
      const datos = DatosDocumentoSchema.parse(body) as DatosDocumento;
      const r = await indexarTexto(body.contenido, datos);
      return NextResponse.json({ success: true, ...r });
    }

    return NextResponse.json({ error: "Petición no reconocida" }, { status: 400 });
  } catch (error) {
    return respuestaError(error, "Error al indexar documento");
  }
}
