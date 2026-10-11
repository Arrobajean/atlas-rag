"use client";

import { ArrowDownIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { ChatComposer } from "@/components/chat/chat-composer";
import { ChatBienvenida } from "@/components/chat/chat-bienvenida";
import { ChatMessage } from "@/components/chat/chat-message";
import { useAutoscroll } from "@/hooks/use-autoscroll";
import { useChatAcciones, useChatEstado } from "@/components/chat-provider";
import { conversacionAMarkdown } from "@/lib/chat-export";

export function RagChat() {
  const { messages, loading, contexto } = useChatEstado();
  const { send, stop, clear, reintentar, confirmarAccion, cancelarAccion, valorar } = useChatAcciones();
  const { ref, alScroll, mostrarBajar, bajar } = useAutoscroll<HTMLDivElement>(messages);
  const vacio = messages.length === 0;

  const copiar = () => {
    void navigator.clipboard.writeText(conversacionAMarkdown(messages));
    toast.success("Conversación copiada");
  };
  const descargar = () => {
    const url = URL.createObjectURL(new Blob([conversacionAMarkdown(messages)], { type: "text/markdown;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `conversacion-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      {/* Único scroll de la pantalla: los mensajes. El campo de texto queda fijo abajo. */}
      <div ref={ref} onScroll={alScroll} className={vacio ? "hidden" : "min-h-0 flex-1 overflow-y-auto scroll-smooth"}>
        <div className="mx-auto w-full max-w-3xl space-y-6 px-3 pt-4 pb-6 sm:space-y-8 sm:px-4 sm:pt-6 sm:pb-8">
          {messages.map((m, idx) => (
            <ChatMessage
              key={m.id}
              message={m}
              puedeReintentar={!loading && idx > 0}
              onReintentar={reintentar}
              onValorar={valorar}
              onConfirmarAccion={confirmarAccion}
              onCancelarAccion={cancelarAccion}
            />
          ))}
        </div>
      </div>

      <AnimatePresence>
        {mostrarBajar && !vacio && (
          <motion.button
            type="button"
            onClick={() => bajar()}
            aria-label="Ir al final"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            whileTap={{ scale: 0.92 }}
            className="absolute bottom-28 left-1/2 z-10 flex size-9 -translate-x-1/2 items-center justify-center rounded-full border bg-background shadow-md hover:bg-muted"
          >
            <ArrowDownIcon className="size-4" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sin mensajes el campo se centra; al enviar el primero baja a su sitio con una transición suave. */}
      {/* layout="position" mueve el bloque sin deformarlo (con `layout` a secas el contenido se estira durante la animación) */}
      <div className={vacio ? "flex flex-1 flex-col justify-center px-3 pb-10 sm:px-4 sm:pb-16" : "shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-4"}>
        <motion.div layout="position" transition={{ type: "spring", bounce: 0, duration: 0.5 }} className="mx-auto w-full max-w-3xl">
          <AnimatePresence initial={false}>{vacio && <ChatBienvenida key="bienvenida" />}</AnimatePresence>
          <ChatComposer loading={loading} hayConversacion={!vacio} contexto={contexto} onSend={send} onStop={stop} onNueva={clear} onCopiar={copiar} onDescargar={descargar} />
          {!vacio && <p className="mt-2 text-center text-[11px] text-muted-foreground">El asistente puede cometer errores. Verifica los datos importantes antes de actuar.</p>}
        </motion.div>
      </div>
    </div>
  );
}
