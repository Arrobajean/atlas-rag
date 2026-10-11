import { supabaseDb } from "@/lib/db";
import { idDe, manejar } from "@/lib/api-server";

/** Propiedades disponibles que encajan con las demandas activas del cliente. */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  return manejar(async () => ({
    coincidencias: await supabaseDb().rpc("rpc_coincidencias_cliente", { p_cliente: idDe((await ctx.params).id), p_limite: 12 }),
  }));
}
