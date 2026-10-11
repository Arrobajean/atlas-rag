import { diasRelativos } from "@/lib/format";
import type { ItemAgenda } from "@/lib/types";

/** Texto corto del plazo de una tarea de la agenda según su tipo. */
export function plazoAgenda(i: ItemAgenda): string {
  switch (i.tipo) {
    case "impago":
      return `${i.dias} días de retraso`;
    case "contrato_vence":
      return `Vence ${diasRelativos(i.dias)}`;
    case "certificado_energetico":
      return `Caducado hace ${-i.dias} días`;
    case "fianza_pendiente":
      return `${i.dias} días sin depositar`;
    case "incidencia":
      return `Abierta hace ${i.dias} días`;
    default:
      return diasRelativos(i.dias);
  }
}

/** Qué se le pide a Atlas para resolver cada tarea: una acción concreta, no solo información. */
export function preguntaAgenda(i: ItemAgenda): string {
  const contrato = i.contrato_referencia ?? "";
  const unidad = i.unidad_referencia ?? "";
  switch (i.tipo) {
    case "impago":
      return `Consulta el impago del contrato ${contrato} y redáctame un mensaje de reclamación amable y firme para el inquilino, con la deuda exacta y los recibos pendientes.`;
    case "contrato_vence":
      return `El contrato ${contrato} vence ${diasRelativos(i.dias)}. Dame su situación (renta, inquilino, pagos) y redacta una propuesta de renovación para el inquilino.`;
    case "certificado_energetico":
      return `El certificado energético de ${unidad} ha caducado. Explícame qué implica para alquilarlo o venderlo y qué pasos debo dar.`;
    case "fianza_pendiente":
      return `La fianza del contrato ${contrato} sigue sin depositar. Dime importe y fechas, y qué debo hacer para regularizarla.`;
    case "incidencia":
      return `Resume la incidencia abierta en ${unidad || i.ubicacion || "esa propiedad"} (${i.titulo}) y propón qué proveedor y qué siguiente paso conviene.`;
    default:
      return `Cuéntame más sobre: ${i.titulo}`;
  }
}

export const preguntaOportunidad = (referencia: string) =>
  `¿Qué clientes encajan con ${referencia} y a cuál debería llamar primero? Dame el motivo de cada coincidencia.`;

export const PREGUNTA_RENOVACIONES =
  "De los contratos que vencen en los próximos 90 días, ¿cuáles me conviene renovar primero por la renta que representan? Ordénalos por importe.";

export const PREGUNTA_VACIOS = "¿Qué pisos libres para alquilar llevan más tiempo vacíos y qué clientes con demanda activa encajan con ellos?";

export const PREGUNTA_SIN_OFERTA =
  "¿Qué clientes con demanda activa no tienen ahora ninguna propiedad que encaje y qué podría ofrecerles que se acerque?";

export const PREGUNTA_CLAUSULAS =
  "Resume las cláusulas de riesgo alto detectadas en los contratos vigentes y dime en cuáles debería actuar primero.";

/** Diferencia de cierres frente al periodo anterior, con el sentido para colorearla. */
export function deltaCierres(actual: number, anterior: number): { texto: string; sube: boolean | null } {
  const d = actual - anterior;
  if (d === 0) return { texto: "igual que el periodo anterior", sube: null };
  return { texto: `${d > 0 ? "+" : "−"}${Math.abs(d)} vs. periodo anterior`, sube: d > 0 };
}
