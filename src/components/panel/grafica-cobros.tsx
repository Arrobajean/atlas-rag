"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { eur, pct } from "@/lib/format";
import { mesCorto, mesLargo, morosidadMes } from "@/lib/panel";
import type { PuntoCobro } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Cobros de los últimos 12 meses: cada barra es lo emitido; la parte ámbar, lo que sigue sin cobrar. */
export function GraficaCobros({ serie }: { serie: PuntoCobro[] }) {
  const [activo, setActivo] = React.useState<number | null>(null);
  const max = Math.max(1, ...serie.map((p) => p.emitido));
  const enCurso = serie.length - 1;
  const seleccion = activo ?? enCurso;
  const punto = serie[seleccion];

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">Cobros por mes</CardTitle>
        <CardDescription>Lo emitido cada mes y la parte que sigue sin cobrar</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <div aria-live="polite" className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
          <p className="text-sm font-medium first-letter:uppercase">
            {mesLargo(punto.mes)}
            {seleccion === enCurso && <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">en curso</span>}
          </p>
          <p className="text-sm tabular-nums">
            <span className="text-muted-foreground">Emitido </span>
            {eur(punto.emitido)}
          </p>
          <p className="text-sm tabular-nums">
            <span className="text-muted-foreground">Sin cobrar </span>
            {eur(punto.impagado)} <span className="text-muted-foreground">({pct(Math.round(morosidadMes(punto) * 10) / 10)})</span>
          </p>
        </div>

        <div className="flex min-h-44 flex-1 items-end gap-1.5 sm:gap-2" onMouseLeave={() => setActivo(null)}>
          {serie.map((p, i) => {
            const alto = (p.emitido / max) * 100;
            const parteImpagada = p.emitido ? (p.impagado / p.emitido) * 100 : 0;
            const seleccionado = seleccion === i;
            return (
              <button
                key={p.mes}
                type="button"
                onMouseEnter={() => setActivo(i)}
                onFocus={() => setActivo(i)}
                onBlur={() => setActivo(null)}
                aria-label={`${mesLargo(p.mes)}: emitido ${eur(p.emitido)}, sin cobrar ${eur(p.impagado)}`}
                className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="flex w-full flex-1 items-end">
                  <div
                    className={cn(
                      "flex w-full flex-col justify-end overflow-hidden rounded-t-md transition-colors duration-150",
                      seleccionado ? "bg-primary" : "bg-primary/35 group-hover:bg-primary/60",
                      i === enCurso && "opacity-70",
                    )}
                    style={{ height: `${alto}%` }}
                  >
                    <div className="w-full bg-amber-500" style={{ height: `${Math.min(100, Math.max(parteImpagada, p.impagado > 0 ? 3 : 0))}%` }} />
                  </div>
                </div>
                <span className={cn("text-[11px] capitalize", seleccionado ? "font-medium text-foreground" : "text-muted-foreground")}>{mesCorto(p.mes)}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
