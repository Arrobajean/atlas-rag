"use client";

import * as React from "react";
import { motion, useReducedMotion } from "motion/react";
import { MessageSources } from "@/components/chat/message-sources";
import { CitedMarkdown } from "@/components/chat/cited-markdown";
import { MensajeAcciones } from "@/components/chat/mensaje-acciones";
import { ToolSteps } from "@/components/chat/tool-steps";
import { ToolResult } from "@/components/chat/tool-result";
import { ChatThinking } from "@/components/chat/chat-thinking";
import { AccionCard } from "@/components/chat/accion-card";
import { AdjuntosChips } from "@/components/chat/adjuntos-chips";
import type { AccionUI } from "@/lib/chat/types";
import { faseDelMensaje } from "@/lib/chat-fase";
import type { ChatMessage as ChatMessageData } from "@/lib/types";

interface ChatMessageProps {
  message: ChatMessageData;
  /** Se puede volver a generar (hay pregunta previa y no hay otra respuesta en curso) */
  puedeReintentar: boolean;
  // Manejadores estables que reciben el id: así el mensaje se memoiza y no se repinta al llegar otro por streaming
  onReintentar: (mensajeId: string) => void;
  onValorar: (mensajeId: string, vote: "up" | "down", comentario?: string) => Promise<boolean>;
  onConfirmarAccion: (mensajeId: string, a: AccionUI) => void;
  onCancelarAccion: (mensajeId: string, a: AccionUI) => void;
}

/**
 * Mensaje al estilo de los chats actuales: el usuario en una píldora a la derecha; el asistente sin burbuja,
 * a todo el ancho de la columna, con sus consultas, resultados, fuentes y acciones debajo.
 */
export const ChatMessage = React.memo(function ChatMessage({ message, puedeReintentar, onReintentar, onValorar, onConfirmarAccion, onCancelarAccion }: ChatMessageProps) {
  const reducir = useReducedMotion();
  const id = message.id;
  const onRetry = React.useCallback(() => onReintentar(id), [onReintentar, id]);
  const onVote = React.useCallback((v: "up" | "down", comentario?: string) => onValorar(id, v, comentario), [onValorar, id]);
  const esUsuario = message.role === "user";
  const pasos = message.herramientas ?? [];
  const resultados = pasos.filter((p) => p.presentacion);
  const fase = faseDelMensaje(message);
  const animacion = reducir ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.22, ease: [0.23, 1, 0.32, 1] as const } };

  if (esUsuario) {
    return (
      <motion.div {...animacion} className="flex flex-col items-end gap-2">
        {message.adjuntos && message.adjuntos.length > 0 && <AdjuntosChips adjuntos={message.adjuntos} className="max-w-[85%] justify-end" />}
        <p className="max-w-[85%] break-words rounded-3xl bg-muted px-4 py-2.5 text-[15px] leading-6 whitespace-pre-wrap">{message.content}</p>
      </motion.div>
    );
  }

  return (
    <motion.div {...animacion} className="space-y-3">
      {pasos.length > 0 && <ToolSteps pasos={pasos} enCurso={!!message.enCurso} />}
      {fase && pasos.length === 0 && <ChatThinking />}
      {message.content && <CitedMarkdown text={message.content} fuentes={message.fuentes} />}
      {resultados.length > 0 && (
        <div className="space-y-2">
          {resultados.map((p) => (
            <ToolResult key={p.id} presentacion={p.presentacion!} />
          ))}
        </div>
      )}
      {message.fuentes && message.fuentes.length > 0 && <MessageSources fuentes={message.fuentes} />}
      {(message.acciones ?? []).map((a) => (
        <AccionCard key={a.id} accion={a} onConfirmar={() => onConfirmarAccion(id, a)} onCancelar={() => onCancelarAccion(id, a)} />
      ))}
      {!message.enCurso && message.content && (
        <MensajeAcciones texto={message.content} onReintentar={puedeReintentar ? onRetry : undefined} onVoto={message.error ? undefined : onVote} />
      )}
    </motion.div>
  );
});
