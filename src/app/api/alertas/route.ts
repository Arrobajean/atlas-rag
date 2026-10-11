import { z } from "zod";
import { getSupabaseClient } from "@/lib/rag";
import { supabaseDb } from "@/lib/db";
import { manejar } from "@/lib/api-server";
import { sesionDe } from "@/lib/auth";

export async function GET(req: Request) {
  return manejar(async () => {
    const p = new URL(req.url).searchParams;
    return supabaseDb().rpc("rpc_alertas", {
      p_tipo: p.get("tipo") || null,
      p_severidad: p.get("severidad") || null,
      p_limite: Math.min(Number(p.get("limite")) || 50, 100),
    });
  });
}

/** Marca una alerta como resuelta o la pospone N días. */
export async function POST(req: Request) {
  return manejar(async () => {
    const { clave, accion, dias } = z
      .object({ clave: z.string().min(3).max(120), accion: z.enum(["resolver", "posponer"]), dias: z.number().int().min(1).max(90).optional() })
      .parse(await req.json());
    const hasta = accion === "posponer" ? new Date(Date.now() + (dias ?? 7) * 86_400_000).toISOString() : null;
    const { error } = await getSupabaseClient().from("alertas_estado").upsert({
      clave,
      estado: accion === "resolver" ? "resuelta" : "pospuesta",
      hasta,
      usuario: (await sesionDe(req))?.rol ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return { success: true };
  });
}
