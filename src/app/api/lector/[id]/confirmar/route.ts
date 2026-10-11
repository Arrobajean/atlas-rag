import { z } from "zod";
import { supabaseDb } from "@/lib/db";
import { confirmarExtraccion } from "@/lib/lector/servicio";
import { idDe, manejar } from "@/lib/api-server";
import { sesionDe } from "@/lib/auth";

const Cuerpo = z.object({
  valores: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])),
  resolucion: z.object({
    unidad_id: z.number().int().nullable(),
    inquilino: z.object({ modo: z.enum(["crear", "existente"]), id: z.number().int().nullable().optional() }),
  }),
});

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  return manejar(async () => {
    const id = idDe((await ctx.params).id);
    const b = Cuerpo.parse(await req.json());
    const sesion = await sesionDe(req);
    const r = await confirmarExtraccion(supabaseDb(), id, b.valores, b.resolucion, sesion?.rol ?? null);
    return { success: true, ...r };
  }, "No se pudo confirmar el contrato");
}
