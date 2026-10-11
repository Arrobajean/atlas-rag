import { CONTEXTO_INICIAL, type ContextoChat } from "@/lib/chat-contexto";
import type { ChatMessage } from "@/lib/types";

// Conversación guardada en el navegador para que sobreviva a cambiar de pantalla y a recargar la página.
const CLAVE = "asistente:conversacion:v1";
const MAX_MENSAJES = 60;

export interface ConversacionGuardada {
  mensajes: ChatMessage[];
  contexto: ContextoChat;
}

/** Deja el mensaje en un estado estable: lo que estaba en curso al guardar ya no lo está al restaurar. */
function estabilizar(m: ChatMessage): ChatMessage {
  const herramientas = m.herramientas?.map((h) => (h.estado === "ejecutando" ? { ...h, estado: "error" as const, resumen: "Interrumpida" } : h));
  const acciones = m.acciones?.map((a) => (a.estado === "ejecutando" ? { ...a, estado: "pendiente" as const } : a));
  return { ...m, enCurso: false, herramientas, acciones, content: m.enCurso && !m.content ? "" : m.content };
}

export function leerConversacion(): ConversacionGuardada | null {
  try {
    const bruto = localStorage.getItem(CLAVE);
    if (!bruto) return null;
    const d = JSON.parse(bruto) as Partial<ConversacionGuardada>;
    if (!Array.isArray(d.mensajes)) return null;
    // Un mensaje del asistente que quedó vacío (petición interrumpida) no se restaura
    const mensajes = d.mensajes.map(estabilizar).filter((m) => m.role === "user" || m.content || m.acciones?.length);
    return { mensajes, contexto: { ...CONTEXTO_INICIAL, ...d.contexto } };
  } catch {
    return null;
  }
}

export function guardarConversacion(mensajes: ChatMessage[], contexto: ContextoChat): void {
  try {
    if (mensajes.length === 0) {
      localStorage.removeItem(CLAVE);
      return;
    }
    // Las miniaturas son blob: de esta sesión: no sobreviven a recargar, así que no se guardan
    const sinMiniaturas = mensajes.slice(-MAX_MENSAJES).map((m) => (m.adjuntos ? { ...m, adjuntos: m.adjuntos.map(({ nombre, mime }) => ({ nombre, mime })) } : m));
    localStorage.setItem(CLAVE, JSON.stringify({ mensajes: sinMiniaturas, contexto }));
  } catch {
    // almacenamiento lleno o bloqueado: la conversación sigue funcionando en memoria
  }
}

export function borrarConversacionGuardada(): void {
  try {
    localStorage.removeItem(CLAVE);
  } catch {
    // sin almacenamiento
  }
}
