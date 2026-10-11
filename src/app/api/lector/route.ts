import { z } from "zod";
import { supabaseDb } from "@/lib/db";
import { supabaseRepo } from "@/lib/documents/repo";
import { crearExtraccion } from "@/lib/lector/extraer";
import { manejar } from "@/lib/api-server";

export const maxDuration = 120;

/** Borradores pendientes de revisar (bandeja del lector). */
export async function GET() {
  return manejar(async () => {
    const db = supabaseDb();
    const filas = await db.seleccionar<{ id: number; documento_id: number; estado: string; created_at: string; modelo: string | null; error: string | null }>("extracciones", {
      columnas: "id, documento_id, estado, created_at, modelo, error",
      orden: { columna: "created_at", ascendente: false },
      limite: 100,
    });
    const docs = filas.length ? await db.seleccionar<{ id: number; titulo: string }>("documentos", { columnas: "id, titulo" }) : [];
    const titulos = new Map(docs.map((d) => [d.id, d.titulo]));
    return { extracciones: filas.map((f) => ({ ...f, titulo: titulos.get(f.documento_id) ?? `Documento ${f.documento_id}` })) };
  });
}

/** Lee un documento ya subido y crea su borrador de extracción. */
export async function POST(req: Request) {
  return manejar(async () => {
    const { documento_id } = z.object({ documento_id: z.number().int().positive() }).parse(await req.json());
    const r = await crearExtraccion(supabaseDb(), supabaseRepo(), documento_id);
    return { extraccion_id: r.id, avisos: r.avisos };
  }, "No se pudo leer el documento");
}
