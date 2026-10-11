import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Esqueleto con la misma forma que el panel: evita el salto de diseño al llegar los datos. */
export function CargandoPanel() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando">
      <div className="space-y-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-8 w-full max-w-md" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-36" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export function CargandoBloques({ n = 3 }: { n?: number }) {
  return (
    <div className="space-y-3" aria-busy="true" aria-label="Cargando">
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} className="h-24 w-full" />
      ))}
    </div>
  );
}

export function ErrorCarga({ mensaje, onReintentar }: { mensaje: string; onReintentar?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
      <AlertCircleIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
      <div className="flex-1 space-y-2">
        <p className="font-medium">No se pudieron cargar los datos</p>
        <p className="text-muted-foreground">{mensaje}</p>
        {onReintentar && (
          <Button size="sm" variant="outline" onClick={onReintentar}>
            Reintentar
          </Button>
        )}
      </div>
    </div>
  );
}
