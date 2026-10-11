"use client";

import * as React from "react";
import { ArrowUpIcon, CheckIcon, CopyIcon, DownloadIcon, PaperclipIcon, PlusIcon, SquarePenIcon, SquareIcon } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { AdjuntosChips } from "@/components/chat/adjuntos-chips";
import { ContextMeter } from "@/components/chat/context-meter";
import { useAdjuntos } from "@/hooks/use-adjuntos";
import type { AdjuntoCliente } from "@/lib/adjuntos-cliente";
import { MAX_ADJUNTOS, TEXTO_ADJUNTO_POR_DEFECTO, TIPOS_ADJUNTO } from "@/lib/chat/adjuntos-tipos";
import { NOMBRE_ASISTENTE } from "@/lib/asistente";
import type { ContextoChat } from "@/lib/chat-contexto";
import { cn } from "@/lib/utils";

interface Props {
  loading: boolean;
  hayConversacion: boolean;
  contexto?: ContextoChat;
  onSend: (question: string, adjuntos?: AdjuntoCliente[]) => void;
  onStop: () => void;
  onNueva: () => void;
  onCopiar: () => void;
  onDescargar: () => void;
}

const MAX_ALTO_PX = 200;

/** Campo de texto del asistente al estilo de los chats actuales: crece con el texto, Enter envía, Mayús+Enter salta de línea. */
export function ChatComposer({ loading, hayConversacion, contexto, onSend, onStop, onNueva, onCopiar, onDescargar }: Props) {
  const [texto, setTexto] = React.useState("");
  const [copiado, setCopiado] = React.useState(false);
  const [arrastrando, setArrastrando] = React.useState(false);
  const area = React.useRef<HTMLTextAreaElement>(null);
  const selector = React.useRef<HTMLInputElement>(null);
  const reducir = useReducedMotion();
  const { adjuntos, procesando, agregar, quitar, vaciar } = useAdjuntos();
  const puedeEnviar = (texto.trim().length > 0 || adjuntos.length > 0) && !loading && !procesando;

  // Ajusta el alto al contenido (hasta un máximo)
  React.useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_ALTO_PX)}px`;
  }, [texto]);

  const enviar = () => {
    if (!puedeEnviar) return;
    onSend(texto.trim() || TEXTO_ADJUNTO_POR_DEFECTO, adjuntos);
    setTexto("");
    vaciar();
  };

  const hayArchivos = (e: React.DragEvent) => Array.from(e.dataTransfer.types).includes("Files");

  const copiar = () => {
    onCopiar();
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1600);
  };

  return (
    <div
      onDragOver={(e) => {
        if (!hayArchivos(e)) return;
        e.preventDefault();
        setArrastrando(true);
      }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => {
        if (!hayArchivos(e)) return;
        e.preventDefault();
        setArrastrando(false);
        void agregar(Array.from(e.dataTransfer.files));
      }}
      className={cn(
        "group/composer flex flex-col rounded-[28px] border bg-muted/50 p-1.5 shadow-xs transition-all duration-200",
        "focus-within:border-foreground/20 focus-within:bg-muted/70 focus-within:shadow-md",
        arrastrando && "border-primary bg-primary/5"
      )}
    >
      {(adjuntos.length > 0 || procesando) && (
        <div className="flex items-center gap-2 px-2 pt-2 pb-1.5">
          <AdjuntosChips adjuntos={adjuntos} onQuitar={quitar} />
          {procesando && <span className="text-xs text-muted-foreground">Preparando…</span>}
        </div>
      )}
      <input
        ref={selector}
        type="file"
        multiple
        hidden
        accept={TIPOS_ADJUNTO.join(",")}
        onChange={(e) => {
          void agregar(Array.from(e.target.files ?? []));
          e.target.value = ""; // permite volver a elegir el mismo archivo
        }}
      />
      <div className="flex items-end gap-1.5">
      <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  aria-label="Más opciones"
                  className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors outline-none hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[popup-open]:bg-foreground/10 data-[popup-open]:text-foreground"
                />
              }
            >
              <PlusIcon className="size-5 transition-transform duration-200 group-has-[[data-popup-open]]/composer:rotate-45" />
            </TooltipTrigger>
            <TooltipContent>Más opciones</TooltipContent>
          </Tooltip>
          <DropdownMenuContent side="top" align="start" className="w-60">
            <DropdownMenuItem disabled={adjuntos.length >= MAX_ADJUNTOS} onClick={() => selector.current?.click()}>
              <PaperclipIcon /> Adjuntar imagen o PDF
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onNueva}>
              <SquarePenIcon /> Nueva conversación
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled={!hayConversacion} onClick={copiar}>
              {copiado ? <CheckIcon /> : <CopyIcon />} Copiar conversación
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!hayConversacion} onClick={onDescargar}>
              <DownloadIcon /> Descargar como Markdown
            </DropdownMenuItem>
          </DropdownMenuContent>
      </DropdownMenu>

      <textarea
        ref={area}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onPaste={(e) => {
          const archivos = Array.from(e.clipboardData.files);
          if (archivos.length === 0) return; // texto normal: el navegador lo pega solo
          e.preventDefault();
          void agregar(archivos);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            enviar();
          }
          if (e.key === "Escape" && loading) onStop();
        }}
        rows={1}
        placeholder={`Pregunta a ${NOMBRE_ASISTENTE}`}
        aria-label="Escribe tu pregunta"
        className="block max-h-[200px] min-w-0 flex-1 resize-none bg-transparent px-1 py-1.5 text-base leading-6 md:text-[15px] outline-none placeholder:text-muted-foreground/70"
      />

      <div className="flex items-center gap-2">
          {contexto && contexto.llamadas > 0 && <ContextMeter contexto={contexto} />}

          <AnimatePresence mode="wait" initial={false}>
            {loading ? (
              <motion.button
                key="parar"
                type="button"
                onClick={onStop}
                aria-label="Detener respuesta (Esc)"
                title="Detener (Esc)"
                initial={reducir ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={reducir ? undefined : { scale: 0.6, opacity: 0 }}
                whileTap={{ scale: 0.92 }}
                className="flex size-9 items-center justify-center rounded-full bg-foreground text-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SquareIcon className="size-3.5 fill-current" />
              </motion.button>
            ) : (
              <motion.button
                key="enviar"
                type="button"
                onClick={enviar}
                disabled={!puedeEnviar}
                aria-label="Enviar (Enter)"
                title="Enviar (Enter)"
                initial={reducir ? false : { scale: 0.6, opacity: 0 }}
                animate={{ scale: puedeEnviar ? 1 : 0.9, opacity: puedeEnviar ? 1 : 0.35 }}
                exit={reducir ? undefined : { scale: 0.6, opacity: 0 }}
                whileHover={puedeEnviar ? { scale: 1.08 } : undefined}
                whileTap={puedeEnviar ? { scale: 0.92 } : undefined}
                className="flex size-9 items-center justify-center rounded-full bg-foreground text-background outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ArrowUpIcon className="size-[18px]" strokeWidth={2.4} />
              </motion.button>
            )}
          </AnimatePresence>
      </div>
      </div>
    </div>
  );
}
