import { supabaseDb } from "@/lib/db";
import { filtrosDeUrl, manejar } from "@/lib/api-server";

const ORDENES = new Set(["precio", "superficie", "precio_m2", "habitaciones", "fecha_disponible", "referencia"]);

/** Explorador de propiedades: filtros, orden y paginación (todo por funciones SQL parametrizadas). */
export async function GET(req: Request) {
  return manejar(async () => {
    const p = new URL(req.url).searchParams;
    const orden = p.get("orden") ?? "referencia";
    const limite = Math.min(Math.max(Number(p.get("limite")) || 25, 1), 50);
    const pagina = Math.max(Number(p.get("pagina")) || 1, 1);
    return supabaseDb().rpc("rpc_listar_unidades", {
      f: filtrosDeUrl(p),
      orden: ORDENES.has(orden) ? orden : "referencia",
      direccion: p.get("direccion") === "desc" ? "desc" : "asc",
      limite,
      desplazamiento: (pagina - 1) * limite,
    });
  });
}
