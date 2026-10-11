import { z } from "zod";
import { supabaseDb } from "@/lib/db";
import { supabaseRepo } from "@/lib/documents/repo";
import { urlDeLectura } from "@/lib/documents/storage";
import { estadoLector, guardarBorrador } from "@/lib/lector/servicio";
import { idDe, manejar } from "@/lib/api-server";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    const id = idDe((await ctx.params).id);
    const unidad = new URL(req.url).searchParams.get("unidad_id");
    const repo = supabaseRepo();
    const estado = await estadoLector(supabaseDb(), repo, id, unidad ? Number(unidad) : null);
    const doc = estado.documento ? await repo.obtener(estado.documento.id) : null;
    const archivo_url = doc?.storage_path ? await urlDeLectura(doc.storage_path).catch(() => null) : null;
    return { ...estado, archivo_url };
  }, "No se pudo abrir la extracción");
}

const CuerpoLector = z.object({
  valores: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  resolucion: z.object({
    unidad_id: z.number().int().nullable(),
    inquilino: z.object({ modo: z.enum(["crear", "existente"]), id: z.number().int().nullable().optional() }),
  }),
});

/** Guarda el borrador editado; no toca las tablas reales. */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    const id = idDe((await ctx.params).id);
    const b = CuerpoLector.parse(await req.json());
    await guardarBorrador(supabaseDb(), id, b.valores, b.resolucion);
    return { success: true };
  });
}
