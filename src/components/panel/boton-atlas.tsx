"use client";

import { SparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePreguntarAtlas } from "@/hooks/use-preguntar-atlas";
import { NOMBRE_ASISTENTE } from "@/lib/asistente";
import { cn } from "@/lib/utils";

interface BotonAtlasProps {
  pregunta: string;
  /** Texto visible; por defecto, el nombre del asistente */
  etiqueta?: string;
  className?: string;
}

/** Atajo para que el asistente resuelva algo: envía la pregunta y abre el chat. */
export function BotonAtlas({ pregunta, etiqueta = NOMBRE_ASISTENTE, className }: BotonAtlasProps) {
  const preguntar = usePreguntarAtlas();
  return (
    <Button type="button" variant="outline" size="sm" onClick={() => preguntar(pregunta)} className={cn("h-7 shrink-0 gap-1.5 px-2.5 text-xs", className)}>
      <SparklesIcon className="size-3.5 text-primary" />
      {etiqueta}
    </Button>
  );
}
