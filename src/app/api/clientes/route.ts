import { getSupabaseClient } from "@/lib/rag";
import { manejar } from "@/lib/api-server";

/** Clientes del CRM con su demanda. */
export async function GET(req: Request) {
  return manejar(async () => {
    const q = new URL(req.url).searchParams.get("q");
    let query = getSupabaseClient()
      .from("clientes")
      .select("id, nombre, tipo, telefono, email, notas, demandas(id, operacion, presupuesto_max, activa)")
      .order("nombre")
      .limit(200);
    if (q) query = query.ilike("nombre", `%${q.replace(/[%,]/g, " ")}%`);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return { clientes: data ?? [] };
  });
}
