"use client";

import * as React from "react";
import { toast } from "sonner";
import { ejecutarAccionApi, enviarValoracion, errorMessage, streamChat } from "@/lib/api";
import type { AccionUI, ChatEvent, EjecucionHerramienta } from "@/lib/chat/types";
import { aplicarUso, CONTEXTO_INICIAL, iniciarTurno, type ContextoChat } from "@/lib/chat-contexto";
import { guardarConversacion, leerConversacion } from "@/lib/chat-almacen";
import { liberarPrevisualizacion, type AdjuntoCliente } from "@/lib/adjuntos-cliente";
import { preguntaPrevia } from "@/lib/chat-mensajes";
import type { MensajeEntrada } from "@/lib/chat/types";
import type { ChatMessage } from "@/lib/types";

/** Las acciones ya confirmadas se cuentan al modelo en el turno siguiente (no aparecen como texto en pantalla). */
const notasDeAcciones = (m: ChatMessage) =>
  (m.acciones ?? []).filter((a) => a.estado === "hecha").map((a) => `\n[Acción confirmada por el usuario: ${a.resultado ?? a.resumen}]`).join("") +
  (m.acciones ?? []).filter((a) => a.estado === "cancelada").map((a) => `\n[Acción cancelada por el usuario: ${a.resumen}]`).join("");

const hora = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function nuevo(role: ChatMessage["role"], content: string, extra?: Partial<ChatMessage>): ChatMessage {
  return { id: crypto.randomUUID(), role, content, timestamp: hora(), ...extra };
}

/** Aplica un evento del servidor al mensaje del asistente que se está construyendo. */
function aplicar(m: ChatMessage, e: ChatEvent): ChatMessage {
  switch (e.type) {
    case "text":
      return { ...m, content: m.content + e.delta };
    case "tool_start": {
      const paso: EjecucionHerramienta = { id: e.id, nombre: e.nombre, descripcion: e.descripcion, estado: "ejecutando" };
      return { ...m, herramientas: [...(m.herramientas ?? []), paso] };
    }
    case "tool_end":
      return {
        ...m,
        herramientas: (m.herramientas ?? []).map((h) =>
          h.id === e.id ? { ...h, estado: e.ok ? "hecha" : "error", resumen: e.resumen, presentacion: e.presentacion } : h
        ),
      };
    case "accion":
      return { ...m, acciones: [...(m.acciones ?? []), { ...e.accion, estado: "pendiente" }] };
    case "usage":
      return m; // el uso de tokens se contabiliza aparte (contexto)
    case "sources":
      return { ...m, fuentes: e.fuentes };
    case "error":
      return { ...m, error: true, content: m.content || `No he podido completar la consulta: ${e.message}` };
    case "done":
      return { ...m, enCurso: false };
  }
}

/**
 * Estado de la conversación + acciones. Las acciones son ESTABLES (no cambian entre renders): leen el estado
 * actual por referencia, así los mensajes ya pintados no se vuelven a renderizar mientras llega otro por streaming.
 */
export function useRagChat() {
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [contexto, setContexto] = React.useState<ContextoChat>(CONTEXTO_INICIAL);
  const [restaurado, setRestaurado] = React.useState(false);
  const abortRef = React.useRef<AbortController | null>(null);
  const actual = React.useRef({ messages, loading });

  React.useEffect(() => {
    actual.current = { messages, loading };
  });

  // Restaura la conversación guardada tras montar (no antes: el servidor no tiene acceso al almacenamiento del navegador)
  React.useEffect(() => {
    let cancelado = false;
    Promise.resolve().then(() => {
      if (cancelado) return;
      const guardada = leerConversacion();
      if (guardada) {
        setMessages(guardada.mensajes);
        setContexto(guardada.contexto);
      }
      setRestaurado(true);
    });
    return () => {
      cancelado = true;
    };
  }, []);

  // Guarda al cambiar la conversación; durante el streaming se agrupa en un guardado cada 600 ms
  React.useEffect(() => {
    if (!restaurado) return;
    const t = setTimeout(() => guardarConversacion(messages, contexto), loading ? 600 : 0);
    return () => clearTimeout(t);
  }, [messages, contexto, loading, restaurado]);

  const send = React.useCallback(async (question: string, adjuntos: AdjuntoCliente[] = []) => {
    const q = question.trim();
    const { messages: previos, loading: ocupado } = actual.current;
    if (!q || ocupado) return;

    // En pantalla y en el historial solo se conservan nombre y tipo; los bytes viajan una vez y no se guardan
    const vistas = adjuntos.map(({ nombre, mime, previewUrl }) => ({ nombre, mime, previewUrl }));
    const historial = [...previos.filter((m) => !m.error), nuevo("user", q, vistas.length ? { adjuntos: vistas } : undefined)];
    const respuesta = nuevo("assistant", "", { enCurso: true, herramientas: [] });
    setMessages((prev) => [...prev, historial[historial.length - 1], respuesta]);
    setLoading(true);
    setContexto((c) => iniciarTurno(c, q));
    actual.current.loading = true; // evita un segundo envío antes del siguiente render

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const entrada: MensajeEntrada[] = historial.map((m, i): MensajeEntrada => {
        const base: MensajeEntrada = { role: m.role, content: m.content + notasDeAcciones(m) };
        if (i === historial.length - 1 && adjuntos.length > 0) return { ...base, adjuntos: adjuntos.map(({ nombre, mime, data }) => ({ nombre, mime, data })) };
        return m.adjuntos?.length ? { ...base, adjuntoNombres: m.adjuntos.map((a) => a.nombre) } : base;
      });
      await streamChat(
        entrada,
        (e) => {
          if (e.type === "usage") setContexto((c) => aplicarUso(c, e));
          setMessages((prev) => prev.map((m) => (m.id === respuesta.id ? aplicar(m, e) : m)));
        },
        controller.signal
      );
    } catch (err: unknown) {
      if (!controller.signal.aborted) {
        const message = errorMessage(err, "Error inesperado");
        toast.error(message);
        setMessages((prev) => prev.map((m) => (m.id === respuesta.id ? aplicar(m, { type: "error", message }) : m)));
      }
    } finally {
      setMessages((prev) => prev.map((m) => (m.id === respuesta.id ? { ...m, enCurso: false } : m)));
      setLoading(false);
      abortRef.current = null;
    }
  }, []);

  /** Vuelve a generar la respuesta de `mensajeId` repitiendo la pregunta que la originó. */
  const reintentar = React.useCallback(
    (mensajeId: string) => {
      const todos = actual.current.messages;
      const pregunta = preguntaPrevia(todos, mensajeId);
      if (!pregunta) return;
      // Los archivos no se guardan: para repetir una consulta con archivos hay que volver a adjuntarlos
      const idx = todos.findIndex((m) => m.id === mensajeId);
      if (todos.slice(0, idx).findLast((m) => m.role === "user")?.adjuntos?.length) {
        toast.info("Esa pregunta llevaba archivos adjuntos. Vuelve a adjuntarlos para repetirla.");
        return;
      }
      void send(pregunta);
    },
    [send]
  );

  const stop = React.useCallback(() => abortRef.current?.abort(), []);

  const clear = React.useCallback(() => {
    abortRef.current?.abort();
    actual.current.messages.forEach((m) => m.adjuntos?.forEach(liberarPrevisualizacion));
    setMessages([]);
    setContexto(CONTEXTO_INICIAL);
  }, []);

  const cambiarAccion = React.useCallback((mensajeId: string, accionId: string, cambios: Partial<AccionUI>) => {
    setMessages((prev) => prev.map((m) => (m.id === mensajeId ? { ...m, acciones: (m.acciones ?? []).map((a) => (a.id === accionId ? { ...a, ...cambios } : a)) } : m)));
  }, []);

  /** Ejecuta la acción propuesta tras la confirmación explícita del usuario. */
  const confirmarAccion = React.useCallback(
    async (mensajeId: string, accion: AccionUI) => {
      cambiarAccion(mensajeId, accion.id, { estado: "ejecutando", error: undefined });
      try {
        const r = await ejecutarAccionApi(accion.tipo, accion.datos);
        cambiarAccion(mensajeId, accion.id, { estado: "hecha", resultado: r.resumen });
        toast.success("Hecho", { description: r.resumen });
      } catch (err) {
        cambiarAccion(mensajeId, accion.id, { estado: "error", error: errorMessage(err, "No se pudo ejecutar") });
      }
    },
    [cambiarAccion]
  );

  const cancelarAccion = React.useCallback((mensajeId: string, accion: AccionUI) => cambiarAccion(mensajeId, accion.id, { estado: "cancelada" }), [cambiarAccion]);

  /** Guarda la valoración de una respuesta para que el administrador la vea. */
  const valorar = React.useCallback(async (mensajeId: string, voto: "up" | "down", comentario?: string): Promise<boolean> => {
    const { messages: todos } = actual.current;
    const m = todos.find((x) => x.id === mensajeId);
    const pregunta = preguntaPrevia(todos, mensajeId);
    if (!m || !pregunta) return false;
    try {
      await enviarValoracion({
        voto, pregunta, respuesta: m.content, comentario: comentario?.trim() || undefined, fuentes: m.fuentes?.length ?? 0,
        herramientas: (m.herramientas ?? []).map((h) => ({ nombre: h.nombre, descripcion: h.descripcion, resumen: h.resumen })),
      });
      toast.success(voto === "up" ? "Gracias por tu valoración" : "Gracias: lo revisaremos");
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "No se pudo guardar la valoración"));
      return false;
    }
  }, []);

  return { messages, loading, contexto, send, stop, clear, reintentar, confirmarAccion, cancelarAccion, valorar };
}
