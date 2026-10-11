import { getSupabaseClient } from "@/lib/rag";
import { supabaseDb } from "@/lib/db";
import { filtrosDeUrl, manejar } from "@/lib/api-server";

/** KPIs del panel: indicadores de cartera, reparto por zona/tipo, ocupación por zona y alertas. */
export async function GET(req: Request) {
  return manejar(async () => {
    const f = filtrosDeUrl(new URL(req.url).searchParams);
    const db = supabaseDb();
    const supabase = getSupabaseClient();
    const [indicadores, porZona, porTipo, ocupacion, alertas, documentos, serieCobros] = await Promise.all([
      db.rpc<Record<string, unknown>>("rpc_indicadores", { f }),
      db.rpc<Record<string, unknown>[]>("rpc_contar_agrupar", { f, agrupar: "zona" }),
      db.rpc<Record<string, unknown>[]>("rpc_contar_agrupar", { f, agrupar: "tipo" }),
      supabase.from("v_ocupacion_por_distrito").select("zona, unidades, alquiladas, disponibles"),
      db.rpc<{ total: number; por_tipo: Record<string, number> }>("rpc_alertas", { p_tipo: null, p_severidad: null, p_limite: 1 }),
      supabase.from("documentos").select("id", { count: "exact", head: true }),
      // La gráfica es un extra: si falta la migración 0013 el panel sigue funcionando sin ella
      db.rpc<{ mes: string; emitido: number; impagado: number }[]>("rpc_serie_cobros", { f, meses: 12 }).catch(() => null),
    ]);
    // Ocupación por zona: agrega la vista de distritos
    const zonas = new Map<string, { unidades: number; alquiladas: number; disponibles: number }>();
    for (const r of (ocupacion.data ?? []) as { zona: string; unidades: number; alquiladas: number; disponibles: number }[]) {
      const z = zonas.get(r.zona) ?? { unidades: 0, alquiladas: 0, disponibles: 0 };
      z.unidades += r.unidades;
      z.alquiladas += r.alquiladas;
      z.disponibles += r.disponibles;
      zonas.set(r.zona, z);
    }
    return {
      indicadores,
      porZona,
      porTipo,
      ocupacionPorZona: [...zonas.entries()].map(([zona, v]) => ({
        zona,
        ...v,
        ocupacion_pct: v.alquiladas + v.disponibles ? Math.round((1000 * v.alquiladas) / (v.alquiladas + v.disponibles)) / 10 : null,
      })),
      alertas: { total: alertas.total, porTipo: alertas.por_tipo },
      documentos: documentos.count ?? 0,
      serieCobros,
    };
  });
}
