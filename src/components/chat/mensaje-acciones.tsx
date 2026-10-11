"use client";

import * as React from "react";
import { CheckIcon, CopyIcon, RotateCcwIcon, SendIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface Props {
  texto: string;
  onReintentar?: () => void;
  /** Guarda la valoración (y el comentario opcional en 👎). Devuelve true si se guardó. */
  onVoto?: (voto: "up" | "down", comentario?: string) => Promise<boolean> | void;
}

function Accion({ etiqueta, activo, onClick, children }: { etiqueta: string; activo?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <motion.button
            type="button"
            onClick={onClick}
            aria-label={etiqueta}
            aria-pressed={activo}
            whileTap={{ scale: 0.85 }}
            className={cn("flex size-9 items-center justify-center rounded-full md:size-8 text-muted-foreground outline-none transition-colors hover:bg-foreground/10 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring", activo && "text-foreground")}
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent>{etiqueta}</TooltipContent>
    </Tooltip>
  );
}

/** Acciones bajo cada respuesta: copiar, valorar (con comentario opcional si no fue útil) y volver a generar. */
export function MensajeAcciones({ texto, onReintentar, onVoto }: Props) {
  const [copiado, setCopiado] = React.useState(false);
  const [voto, setVoto] = React.useState<"up" | "down" | null>(null);
  const [pidiendoComentario, setPidiendoComentario] = React.useState(false);
  const [comentario, setComentario] = React.useState("");

  const copiar = async () => {
    await navigator.clipboard.writeText(texto).catch(() => undefined);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1600);
  };

  const votar = async (v: "up" | "down") => {
    if (voto === v) return;
    if (v === "down") {
      setVoto("down");
      setPidiendoComentario(true);
      return;
    }
    setPidiendoComentario(false);
    if ((await onVoto?.("up")) !== false) setVoto("up");
  };

  const enviarNegativo = async (conComentario: boolean) => {
    const ok = await onVoto?.("down", conComentario ? comentario : undefined);
    if (ok === false) setVoto(null);
    setPidiendoComentario(false);
  };

  return (
    <div className="space-y-2">
      <div className="-ml-2 flex items-center gap-0.5 opacity-70 transition-opacity focus-within:opacity-100 hover:opacity-100">
        <Accion etiqueta={copiado ? "Copiado" : "Copiar respuesta"} onClick={copiar}>
          {copiado ? <CheckIcon className="size-4 text-emerald-500" /> : <CopyIcon className="size-4" />}
        </Accion>
        {onVoto && (
          <>
            <Accion etiqueta="Respuesta útil" activo={voto === "up"} onClick={() => void votar("up")}>
              <ThumbsUpIcon className={cn("size-4", voto === "up" && "fill-current")} />
            </Accion>
            <Accion etiqueta="Respuesta mejorable" activo={voto === "down"} onClick={() => void votar("down")}>
              <ThumbsDownIcon className={cn("size-4", voto === "down" && "fill-current")} />
            </Accion>
          </>
        )}
        {onReintentar && (
          <Accion etiqueta="Volver a generar" onClick={onReintentar}>
            <RotateCcwIcon className="size-4" />
          </Accion>
        )}
      </div>

      <AnimatePresence initial={false}>
        {pidiendoComentario && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              void enviarNegativo(true);
            }}
          >
            <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1 rounded-2xl border bg-muted/40 py-1.5 pr-1.5 pl-3">
              <input
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                maxLength={1000}
                autoFocus
                aria-label="¿Qué ha fallado? (opcional)"
                placeholder="¿Qué ha fallado? (opcional)"
                className="min-w-[60%] flex-1 bg-transparent text-base outline-none md:text-sm placeholder:text-muted-foreground/70"
              />
              <Button type="button" variant="ghost" size="sm" className="h-8" onClick={() => void enviarNegativo(false)}>
                Omitir
              </Button>
              <Button type="submit" size="sm" className="h-8">
                <SendIcon className="mr-1.5 size-3.5" /> Enviar
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
