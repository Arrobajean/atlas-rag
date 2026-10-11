import type { ChatMessage } from "@/lib/types";

/** Pregunta del usuario que originó la respuesta `mensajeId` (el último mensaje de usuario anterior a ella). */
export function preguntaPrevia(mensajes: ChatMessage[], mensajeId: string): string | undefined {
  const idx = mensajes.findIndex((m) => m.id === mensajeId);
  if (idx <= 0) return undefined;
  return mensajes.slice(0, idx).findLast((m) => m.role === "user")?.content;
}
