import { supabaseDb } from "@/lib/db";
import { cargarCatalogo } from "@/lib/lector/catalogo";
import { proponerCampo, SolicitudCampoSchema } from "@/lib/lector/campos";
import { manejar } from "@/lib/api-server";
import { sesionDe } from "@/lib/auth";

/** Catálogo cerrado de campos y solicitudes de campos nuevos. */
export async function GET() {
  return manejar(async () => {
    const db = supabaseDb();
    const [campos, solicitudes] = await Promise.all([
      cargarCatalogo(db, "contrato"),
      db.seleccionar("solicitudes_campo", { orden: { columna: "created_at", ascendente: false }, limite: 100 }),
    ]);
    return { campos, solicitudes };
  });
}

/** Cualquier agente puede PROPONER un campo; solo un admin lo aprueba. */
export async function POST(req: Request) {
  return manejar(async () => {
    const datos = SolicitudCampoSchema.parse(await req.json());
    const s = await proponerCampo(supabaseDb(), datos, (await sesionDe(req))?.rol ?? null);
    return { success: true, id: s.id };
  });
}
