import { CheckIcon, ClockIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { diasRelativos, fecha } from "@/lib/format";
import { tipoAlerta } from "@/lib/etiquetas";
import type { Alerta } from "@/lib/types";
import { cn } from "@/lib/utils";

const NIVEL = {
  alta: "border-l-red-500 bg-red-500/[0.03]",
  media: "border-l-amber-500",
  baja: "border-l-sky-500",
} as const;

const BADGE = {
  alta: "bg-red-500/10 text-red-600 dark:text-red-400",
  media: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  baja: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
} as const;

interface Props {
  alerta: Alerta;
  onResolver: () => void;
  onPosponer: () => void;
  onAbrirUnidad?: (ref: string) => void;
}

export function AlertaItem({ alerta: a, onResolver, onPosponer, onAbrirUnidad }: Props) {
  return (
    <li className={cn("flex flex-wrap items-start justify-between gap-3 rounded-lg border border-l-4 p-3", NIVEL[a.severidad])}>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn("border-transparent capitalize", BADGE[a.severidad])}>{a.severidad}</Badge>
          <span className="text-[11px] text-muted-foreground">{tipoAlerta(a.tipo)}</span>
        </div>
        <p className="text-sm font-medium">{a.titulo}</p>
        <p className="text-xs text-muted-foreground">{a.detalle}</p>
        <p className="text-xs text-muted-foreground">
          {fecha(a.fecha_evento)} ({a.tipo === "fianza_pendiente" || a.tipo === "impago" ? `hace ${a.dias} días` : diasRelativos(a.dias)})
          {a.ubicacion && (
            <>
              {" · "}
              {a.unidad_referencia && onAbrirUnidad ? (
                <button type="button" className="text-primary hover:underline" onClick={() => onAbrirUnidad(a.unidad_referencia!)}>
                  {a.ubicacion}
                </button>
              ) : (
                a.ubicacion
              )}
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 gap-1.5">
        <Button size="sm" variant="outline" onClick={onPosponer} className="h-8 text-xs">
          <ClockIcon className="mr-1 size-3.5" /> 7 días
        </Button>
        <Button size="sm" variant="outline" onClick={onResolver} className="h-8 text-xs">
          <CheckIcon className="mr-1 size-3.5" /> Resuelta
        </Button>
      </div>
    </li>
  );
}
