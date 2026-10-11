import type { ChatMessage } from "@/lib/types";

export interface FaseChat {
  etiqueta: string;
  detalle?: string;
}

const ETIQUETA_HERRAMIENTA: Record<string, string> = {
  buscar_en_documentos: "Buscando en los documentos",
  buscar_propiedades_por_descripcion: "Buscando propiedades parecidas",
  resolver_lugar: "Identificando el lugar",
};

/**
 * En qué está el asistente ahora mismo (como el «pensando…» de las IAs actuales):
 * pensando → consultando datos o documentos → redactando. Devuelve null cuando ya hay texto o ha terminado.
 */
export function faseDelMensaje(m: ChatMessage): FaseChat | null {
  if (!m.enCurso) return null;
  const pasos = m.herramientas ?? [];
  const activo = pasos.find((p) => p.estado === "ejecutando");
  if (activo) return { etiqueta: ETIQUETA_HERRAMIENTA[activo.nombre] ?? "Consultando la base de datos", detalle: activo.descripcion };
  if (m.content) return null;
  return { etiqueta: pasos.length > 0 ? "Redactando la respuesta" : "Pensando" };
}
