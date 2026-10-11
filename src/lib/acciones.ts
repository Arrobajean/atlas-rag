import { z } from "zod";
import type { DataAccess } from "@/lib/chat/data";
import { TIPOS_ACCION, type PropuestaAccion, type TipoAccion } from "@/lib/chat/types";

const lista = z.array(z.string());

/**
 * Parámetros que el modelo rellena para proponer una acción. Es un objeto plano (los esquemas con `oneOf`
 * los interpretan peor los modelos); cada acción usa solo sus campos y la base de datos valida el resto.
 */
export const AccionInputSchema = z.object({
  tipo: z.enum(TIPOS_ACCION).describe(
    "crear_incidencia · crear_cliente_demanda · resolver_alerta · cambiar_estado_unidad"
  ),
  // crear_incidencia
  unidad_ref: z.string().optional().describe("crear_incidencia / cambiar_estado_unidad: referencia U-00000"),
  edificio_ref: z.string().optional().describe("crear_incidencia: referencia E-00000 si la incidencia es de zonas comunes"),
  categoria: z.string().optional().describe("crear_incidencia: fontaneria, electricidad, calefaccion, ascensor, cerrajeria, humedades, electrodomesticos, plagas, pintura u otros"),
  prioridad: z.string().optional().describe("crear_incidencia: baja, media, alta o urgente"),
  descripcion: z.string().optional().describe("crear_incidencia: qué ocurre (5-500 caracteres)"),
  // crear_cliente_demanda
  cliente_id: z.number().int().optional().describe("crear_cliente_demanda: id de un cliente existente al que solo se añade la demanda"),
  nombre: z.string().optional(),
  telefono: z.string().optional(),
  email: z.string().optional(),
  tipo_cliente: z.string().optional().describe("inquilino, comprador o inversor"),
  operacion: z.string().optional().describe("alquiler, venta, temporada o habitaciones"),
  presupuesto_max: z.number().optional().describe("€/mes en alquiler, € totales en venta"),
  presupuesto_min: z.number().optional(),
  habitaciones_min: z.number().int().optional(),
  tipos_unidad: lista.optional().describe("piso, atico, duplex, estudio, chalet, habitacion, local, oficina, garaje, trastero"),
  zonas: lista.optional().describe("Nombres de zona exactos (Madrid Sur, Corredor del Henares…)"),
  municipios: lista.optional(),
  distritos: lista.optional(),
  necesita_mascotas: z.boolean().optional(),
  necesita_amueblado: z.boolean().optional(),
  necesita_terraza: z.boolean().optional(),
  fecha_entrada: z.string().optional().describe("AAAA-MM-DD"),
  notas: z.string().optional().describe("Lo que busca el cliente, con sus palabras (se usa para afinidad semántica)"),
  // resolver_alerta
  clave_alerta: z.string().optional().describe("resolver_alerta: la `clave` que devuelve alertas_pendientes"),
  accion_alerta: z.enum(["resolver", "posponer"]).optional(),
  dias: z.number().int().optional().describe("resolver_alerta con posponer: 1-90 (7 por defecto)"),
  // cambiar_estado_unidad
  estado: z.string().optional().describe("cambiar_estado_unidad: disponible, reservada o reforma"),
  fecha_disponible: z.string().optional().describe("cambiar_estado_unidad: AAAA-MM-DD"),
});

export type AccionInput = z.infer<typeof AccionInputSchema>;

/** Traduce los nombres del modelo a las claves que espera rpc_accion y descarta vacíos. */
export function datosDeAccion(input: AccionInput): Record<string, unknown> {
  const { tipo: _tipo, clave_alerta, accion_alerta, ...resto } = input;
  void _tipo;
  const datos: Record<string, unknown> = { ...resto };
  if (clave_alerta !== undefined) datos.clave = clave_alerta;
  if (accion_alerta !== undefined) datos.accion = accion_alerta;
  return Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)));
}

export interface ResultadoAccion {
  ok: boolean;
  ejecutado: boolean;
  resumen: string;
  tabla?: string;
  registro_id?: number | null;
  cliente_id?: number;
  demanda_id?: number;
  notas?: string | null;
}

/** El error de Postgres viene como «rpc_accion: mensaje»: se deja solo el mensaje. */
export const mensajeDeAccion = (err: unknown) => (err instanceof Error ? err.message : String(err)).replace(/^rpc_accion:\s*/, "");

/** Valida y describe la acción SIN ejecutarla. Devuelve la propuesta o el motivo por el que no es válida. */
export async function proponerAccion(data: DataAccess, input: AccionInput): Promise<{ ok: true; propuesta: PropuestaAccion } | { ok: false; error: string }> {
  const datos = datosDeAccion(input);
  try {
    const r = await data.rpc<ResultadoAccion>("rpc_accion", { p_tipo: input.tipo, p_datos: datos, p_ejecutar: false, p_usuario: null });
    return { ok: true, propuesta: { id: crypto.randomUUID(), tipo: input.tipo, datos, resumen: r.resumen } };
  } catch (err) {
    return { ok: false, error: mensajeDeAccion(err) };
  }
}

const TIPOS = new Set<string>(TIPOS_ACCION);

/** Ejecuta una acción ya confirmada por una persona. La base de datos vuelve a validarlo todo. */
export async function ejecutarAccion(data: DataAccess, tipo: string, datos: Record<string, unknown>, usuario: string | null): Promise<ResultadoAccion> {
  if (!TIPOS.has(tipo)) throw new Error(`Acción no soportada: ${tipo}`);
  try {
    return await data.rpc<ResultadoAccion>("rpc_accion", { p_tipo: tipo as TipoAccion, p_datos: datos, p_ejecutar: true, p_usuario: usuario });
  } catch (err) {
    throw new Error(mensajeDeAccion(err));
  }
}
