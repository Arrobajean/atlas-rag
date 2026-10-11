// Nombres legibles de los valores de la base de datos (puro, sin React).

const TIPOS: Record<string, string> = {
  piso: "Piso", atico: "Ático", duplex: "Dúplex", estudio: "Estudio", chalet: "Chalé", habitacion: "Habitación",
  local: "Local", oficina: "Oficina", garaje: "Garaje", trastero: "Trastero",
};
const OPERACIONES: Record<string, string> = { alquiler: "Alquiler", venta: "Venta", temporada: "Temporada", habitaciones: "Habitaciones" };
const ESTADOS: Record<string, string> = { disponible: "Disponible", alquilada: "Alquilada", reservada: "Reservada", reforma: "En reforma", vendida: "Vendida" };
const TIPOS_DOC: Record<string, string> = {
  contrato: "Contrato", normas_comunidad: "Normas de comunidad", acta_junta: "Acta de junta", estatutos: "Estatutos",
  inventario: "Inventario", certificado_energetico: "Certificado energético", factura: "Factura", legal: "Normativa",
  procedimiento_interno: "Procedimiento interno", general: "General",
};
const TIPOS_ALERTA: Record<string, string> = {
  contrato_vence: "Contratos que vencen", actualizacion_renta: "Actualización de renta", certificado_energetico: "Certificados energéticos",
  fianza_pendiente: "Fianzas sin depositar", impago: "Impagos",
};
const TIPOS_CONTRATO: Record<string, string> = {
  vivienda_habitual: "Vivienda habitual", temporada: "Temporada", habitacion: "Habitación", local: "Local / uso distinto", compraventa: "Compraventa",
};

const de = (mapa: Record<string, string>) => (k: string | null | undefined) => (k ? mapa[k] ?? k.replace(/_/g, " ") : "—");

export const tipoUnidad = de(TIPOS);
export const operacion = de(OPERACIONES);
export const estadoUnidad = de(ESTADOS);
export const tipoDocumento = de(TIPOS_DOC);
export const tipoAlerta = de(TIPOS_ALERTA);
export const tipoContrato = de(TIPOS_CONTRATO);

export const OPCIONES_TIPO = Object.entries(TIPOS);
export const OPCIONES_OPERACION = Object.entries(OPERACIONES);
export const OPCIONES_ESTADO = Object.entries(ESTADOS);
export const OPCIONES_TIPO_DOC = Object.entries(TIPOS_DOC);
export const OPCIONES_TIPO_ALERTA = Object.entries(TIPOS_ALERTA);

export const ZONAS = [
  "Madrid Centro", "Madrid Norte", "Madrid Oeste", "Madrid Sur", "Madrid Este",
  "Corredor del Henares", "Sur metropolitano", "Norte metropolitano", "Noroeste y Sierra", "Sureste",
];

/** Estado de una unidad → variante visual (clave semántica; el color lo decide la UI). */
export const tonoEstado = (e: string): "ok" | "warn" | "muted" | "info" =>
  e === "alquilada" || e === "vendida" ? "ok" : e === "disponible" ? "info" : e === "reforma" || e === "reservada" ? "warn" : "muted";
