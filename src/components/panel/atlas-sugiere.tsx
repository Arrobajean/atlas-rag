"use client";

import { ArrowUpRightIcon } from "lucide-react";
import { AtlasOrb } from "@/components/chat/atlas-orb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePreguntarAtlas } from "@/hooks/use-preguntar-atlas";
import { NOMBRE_ASISTENTE } from "@/lib/asistente";
import { ideasAtlas } from "@/lib/panel";
import type { Resumen } from "@/lib/types";

/** Lo que merece una mirada hoy, con un clic para que el asistente lo detalle. */
export function AtlasSugiere({ resumen }: { resumen: Resumen }) {
  const preguntar = usePreguntarAtlas();
  const ideas = ideasAtlas(resumen);
  if (ideas.length === 0) return null;
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <div className="flex items-center gap-3">
          <AtlasOrb state="idle" size={52} etiqueta={`${NOMBRE_ASISTENTE} en reposo`} className="shrink-0" />
          <div className="space-y-0.5">
            <CardTitle className="text-base">{NOMBRE_ASISTENTE} sugiere</CardTitle>
            <CardDescription>Para mirar hoy; pulsa y te lo detalla</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {ideas.map((idea) => (
          <button
            key={idea.titulo}
            type="button"
            onClick={() => preguntar(idea.pregunta)}
            className="group flex w-full items-start justify-between gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="min-w-0 space-y-0.5">
              <span className="block text-sm font-medium">{idea.titulo}</span>
              <span className="block text-xs text-muted-foreground">{idea.detalle}</span>
            </span>
            <ArrowUpRightIcon className="mt-0.5 size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
          </button>
        ))}
      </CardContent>
    </Card>
  );
}
