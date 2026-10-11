import { VENTANA_CONTEXTO, type ChatEvent } from "@/lib/chat/types";

/** Estado del contexto de la conversación, medido con los tokens reales que devuelve el modelo. */
export interface ContextoChat {
  /** Tokens del contexto tras la última llamada (entrada + salida). */
  usados: number;
  limite: number;
  /** Instrucciones + definición de herramientas: medido en el primer turno. */
  base: number;
  /** Tokens de la primera llamada del turno actual (base + historial + pregunta). */
  primera: number | null;
  ultima: number;
  salida: number;
  /** Acumulado de la sesión (lo que se ha enviado y recibido en total). */
  totalEntrada: number;
  totalSalida: number;
  llamadas: number;
  /** Tokens estimados de la pregunta del turno actual. */
  pregunta: number;
}

export const CONTEXTO_INICIAL: ContextoChat = {
  usados: 0, limite: VENTANA_CONTEXTO, base: 0, primera: null, ultima: 0, salida: 0, totalEntrada: 0, totalSalida: 0, llamadas: 0, pregunta: 0,
};

/** ~4 caracteres por token en español: solo para separar la pregunta del resto. */
export const estimarTokens = (texto: string) => Math.ceil(texto.length / 4);

/** Al enviar una pregunta: empieza un turno nuevo (conserva el acumulado y la base medida). */
export function iniciarTurno(c: ContextoChat, pregunta: string): ContextoChat {
  return { ...c, primera: null, salida: 0, pregunta: estimarTokens(pregunta) };
}

export function aplicarUso(c: ContextoChat, e: Extract<ChatEvent, { type: "usage" }>): ContextoChat {
  const salida = c.salida + e.salida + e.razonamiento;
  const primera = c.primera ?? e.entrada;
  // En el primer turno no hay historial: lo que no es pregunta son instrucciones y herramientas
  const base = c.base || Math.max(0, e.entrada - c.pregunta);
  return {
    ...c,
    primera,
    base,
    ultima: e.entrada,
    salida,
    usados: e.entrada + e.salida + e.razonamiento,
    totalEntrada: c.totalEntrada + e.entrada,
    totalSalida: c.totalSalida + e.salida + e.razonamiento,
    llamadas: c.llamadas + 1,
  };
}

/** Qué llena la ventana (aproximado): instrucciones/herramientas, conversación previa y resultados de consultas. */
export function desgloseContexto(c: ContextoChat): { label: string; tokens: number }[] {
  if (c.llamadas === 0) return [];
  const primera = c.primera ?? c.ultima;
  const historial = Math.max(0, primera - c.base - c.pregunta);
  const resultados = Math.max(0, c.ultima - primera);
  return [
    { label: "Instrucciones y herramientas", tokens: c.base },
    { label: "Conversación previa", tokens: historial },
    { label: "Tu pregunta", tokens: Math.min(c.pregunta, primera) },
    { label: "Resultados de consultas", tokens: resultados },
    { label: "Respuesta", tokens: c.salida },
  ].filter((x) => x.tokens > 0);
}
