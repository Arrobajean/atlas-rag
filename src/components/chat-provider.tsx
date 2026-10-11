"use client";

import * as React from "react";
import { useRagChat } from "@/hooks/use-rag-chat";

type Chat = ReturnType<typeof useRagChat>;
type EstadoChat = Pick<Chat, "messages" | "loading" | "contexto">;
type AccionesChat = Omit<Chat, keyof EstadoChat>;

// Tres contextos para que cada consumidor se re-renderice solo por lo que usa:
//  · acciones: estables, no cambian nunca (botones, diálogos)
//  · cantidad: cambia al añadir o borrar mensajes, no con cada trozo de texto del streaming
//  · estado: mensajes, carga y contexto (solo la pantalla del asistente)
const EstadoContext = React.createContext<EstadoChat | null>(null);
const AccionesContext = React.createContext<AccionesChat | null>(null);
const CantidadContext = React.createContext(0);

/**
 * La conversación vive en el layout del panel, no en la pantalla del asistente: así no se pierde al cambiar de
 * vista y una respuesta en curso sigue llegando aunque estés en otra pantalla.
 */
export function ChatProvider({ children }: { children: React.ReactNode }) {
  const { messages, loading, contexto, send, stop, clear, reintentar, confirmarAccion, cancelarAccion, valorar } = useRagChat();
  const estado = React.useMemo(() => ({ messages, loading, contexto }), [messages, loading, contexto]);
  const accionesEstables = React.useMemo(
    () => ({ send, stop, clear, reintentar, confirmarAccion, cancelarAccion, valorar }),
    [send, stop, clear, reintentar, confirmarAccion, cancelarAccion, valorar]
  );

  return (
    <AccionesContext.Provider value={accionesEstables}>
      <CantidadContext.Provider value={messages.length}>
        <EstadoContext.Provider value={estado}>{children}</EstadoContext.Provider>
      </CantidadContext.Provider>
    </AccionesContext.Provider>
  );
}

function useContextoObligatorio<T>(ctx: React.Context<T | null>, nombre: string): T {
  const valor = React.useContext(ctx);
  if (!valor) throw new Error(`${nombre} debe usarse dentro de ChatProvider`);
  return valor;
}

export const useChatEstado = () => useContextoObligatorio(EstadoContext, "useChatEstado");
export const useChatAcciones = () => useContextoObligatorio(AccionesContext, "useChatAcciones");
export const useChatCantidad = () => React.useContext(CantidadContext);
