"use client";

import * as React from "react";
import { ChevronDownIcon, DatabaseIcon, MessageSquareQuoteIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { timeAgo } from "@/lib/format";
import type { Valoracion } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Una valoración: pregunta y voto a la vista; al abrirla, la respuesta, las consultas que hizo y el comentario. */
export function ValoracionItem({ v, ahora }: { v: Valoracion; ahora: number }) {
  const [abierta, setAbierta] = React.useState(false);
  const positivo = v.voto === "up";
  return (
    <li className={cn("rounded-lg border", !positivo && "border-red-500/30")}>
      <button type="button" onClick={() => setAbierta((a) => !a)} aria-expanded={abierta} className="flex w-full items-start gap-3 p-3 text-left hover:bg-muted/40">
        <span className={cn("mt-0.5 rounded-full p-1.5", positivo ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600")}>
          {positivo ? <ThumbsUpIcon className="size-3.5" /> : <ThumbsDownIcon className="size-3.5" />}
        </span>
        <span className="min-w-0 flex-1 space-y-1">
          <span className="line-clamp-2 text-sm font-medium">{v.pregunta}</span>
          {v.comentario && (
            <span className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
              <MessageSquareQuoteIcon className="mt-0.5 size-3 shrink-0" /> {v.comentario}
            </span>
          )}
          <span className="block text-[11px] text-muted-foreground">
            {timeAgo(new Date(v.created_at), ahora)} · {v.herramientas.length} consultas · {v.fuentes} fragmentos{v.modelo ? ` · ${v.modelo}` : ""}
          </span>
        </span>
        <ChevronDownIcon className={cn("mt-1 size-4 shrink-0 text-muted-foreground transition-transform", abierta && "rotate-180")} />
      </button>

      {abierta && (
        <div className="space-y-3 border-t p-3 text-sm">
          <section>
            <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Respuesta del asistente</h3>
            <p className="rounded-md bg-muted/40 p-3 leading-relaxed whitespace-pre-wrap">{v.respuesta}</p>
          </section>
          {v.herramientas.length > 0 && (
            <section>
              <h3 className="mb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">Consultas que hizo</h3>
              <ul className="space-y-1">
                {v.herramientas.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs">
                    <DatabaseIcon className="mt-0.5 size-3 shrink-0 text-muted-foreground" />
                    <span>
                      {h.descripcion}
                      {h.resumen && <span className="text-muted-foreground"> → {h.resumen}</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {v.usuario && <Badge variant="outline" className="capitalize">{v.usuario}</Badge>}
        </div>
      )}
    </li>
  );
}
