import { z } from "zod";
import { supabaseDb } from "@/lib/db";
import { resolverSolicitud } from "@/lib/lector/campos";
import { exigirAdmin, sesionDe } from "@/lib/auth";
import { idDe, manejar } from "@/lib/api-server";

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const denegado = await exigirAdmin(req);
  if (denegado) return denegado;
  return manejar(async () => {
    const { accion, motivo } = z.object({ accion: z.enum(["aprobar", "rechazar"]), motivo: z.string().max(300).optional() }).parse(await req.json());
    const campoId = await resolverSolicitud(supabaseDb(), idDe((await ctx.params).id), accion, (await sesionDe(req))?.rol ?? null, motivo);
    return { success: true, campo_id: campoId };
  });
}
