import { z } from "zod";
import type { Db } from "@/lib/db";

export const SolicitudCampoSchema = z.object({
  etiqueta: z.string().trim().min(3, "Indica un nombre para el campo").max(80),
  tipo_dato: z.enum(["texto", "numero", "moneda", "fecha", "booleano"]),
  descripcion: z.string().trim().max(300).optional().nullable(),
  ejemplo: z.string().trim().max(200).optional().nullable(),
});

/**
 * Un agente PROPONE un campo nuevo: queda pendiente hasta que un administrador lo aprueba.
 * Nunca se crea un campo ni una columna desde la pantalla del lector.
 */
export async function proponerCampo(db: Db, datos: z.infer<typeof SolicitudCampoSchema>, usuario: string | null) {
  const clave = datos.etiqueta.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
  return db.insertar<{ id: number }>("solicitudes_campo", {
    tipo_documento: "contrato",
    etiqueta: datos.etiqueta,
    clave_sugerida: clave,
    tipo_dato: datos.tipo_dato,
    descripcion: datos.descripcion ?? null,
    ejemplo: datos.ejemplo ?? null,
    propuesto_por: usuario,
  });
}

export async function resolverSolicitud(db: Db, id: number, accion: "aprobar" | "rechazar", usuario: string | null, motivo?: string | null) {
  if (accion === "aprobar") {
    return db.rpc<number>("rpc_aprobar_solicitud_campo", { p_solicitud: id, p_clave: null, p_usuario: usuario });
  }
  await db.actualizar("solicitudes_campo", id, { estado: "rechazada", revisado_por: usuario, motivo_revision: motivo ?? null });
  return null;
}
