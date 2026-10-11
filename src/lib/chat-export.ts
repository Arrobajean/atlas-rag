import type { ChatMessage } from "@/lib/types";

/** Conversación en Markdown (para copiar o descargar), con las consultas realizadas y las fuentes citadas. */
export function conversacionAMarkdown(mensajes: ChatMessage[]): string {
  const partes: string[] = [`# Conversación con el asistente\n`];
  for (const m of mensajes) {
    if (m.role === "user") {
      const adjuntos = m.adjuntos?.length ? `\n_Archivos adjuntos: ${m.adjuntos.map((a) => a.nombre).join(", ")}_\n` : "";
      partes.push(`**Tú** (${m.timestamp})\n\n${m.content}\n${adjuntos}`);
      continue;
    }
    const pasos = (m.herramientas ?? []).map((h) => `- ${h.descripcion}${h.resumen ? ` → ${h.resumen}` : ""}`);
    const fuentes = (m.fuentes ?? []).map((f) => `- [${f.id}] ${f.titulo}${f.pagina ? ` · pág. ${f.pagina}` : ""}`);
    partes.push(
      `**Asistente** (${m.timestamp})\n\n${m.content}\n` +
        (pasos.length ? `\n_Consultas realizadas:_\n${pasos.join("\n")}\n` : "") +
        (fuentes.length ? `\n_Fuentes:_\n${fuentes.join("\n")}\n` : "")
    );
  }
  return partes.join("\n---\n\n");
}
