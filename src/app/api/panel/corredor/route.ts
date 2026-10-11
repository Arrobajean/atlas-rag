import { supabaseDb } from "@/lib/db";
import { manejar } from "@/lib/api-server";
import { sesionDe } from "@/lib/auth";
import type { PanelCorredor } from "@/lib/types";

/**
 * Bloques del panel pensados para un corredor: agenda de hoy, oportunidades, ingresos en riesgo, embudo y
 * documentos con IA. Cada uno es independiente: si falta su función SQL (migración 0014) o falla, queda en null
 * y el panel simplemente no lo muestra.
 */
export async function GET(req: Request) {
  return manejar(async (): Promise<PanelCorredor> => {
    const db = supabaseDb();
    const esAdmin = (await sesionDe(req))?.rol === "admin";
    const bloque = <T>(nombre: string, args: Record<string, unknown> = {}) => db.rpc<T>(nombre, args).catch(() => null);
    const [agenda, oportunidades, riesgo, embudo, documentos, salud] = await Promise.all([
      bloque<PanelCorredor["agenda"]>("rpc_agenda_hoy", { p_limite: 8 }),
      bloque<PanelCorredor["oportunidades"]>("rpc_oportunidades", { p_limite: 5 }),
      bloque<PanelCorredor["riesgo"]>("rpc_ingresos_riesgo", { p_limite: 3 }),
      bloque<PanelCorredor["embudo"]>("rpc_embudo", { p_dias: 30 }),
      bloque<PanelCorredor["documentos"]>("rpc_panel_documentos"),
      esAdmin ? bloque<PanelCorredor["salud"]>("rpc_salud_asistente", { p_dias: 7 }) : Promise.resolve(null),
    ]);
    return { agenda, oportunidades, riesgo, embudo, documentos, salud };
  });
}
