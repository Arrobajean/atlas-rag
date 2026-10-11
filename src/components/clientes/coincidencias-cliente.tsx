import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CargandoBloques, ErrorCarga } from "@/components/panel/estado-carga";
import { dec, eur } from "@/lib/format";
import { tipoUnidad } from "@/lib/etiquetas";
import type { Cliente, Coincidencia } from "@/lib/types";

interface Props {
  cliente: Cliente | null;
  coincidencias: Coincidencia[] | null;
  loading: boolean;
  error: string | null;
  onAbrir: (ref: string) => void;
}

export function CoincidenciasCliente({ cliente, coincidencias, loading, error, onAbrir }: Props) {
  if (!cliente) return <div className="flex h-full min-h-48 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">Elige un cliente para ver qué propiedades le encajan.</div>;
  return (
    <div className="space-y-4">
      <div className="space-y-1 rounded-lg border p-4">
        <p className="font-medium">{cliente.nombre}</p>
        <p className="text-xs text-muted-foreground">{[cliente.telefono, cliente.email].filter(Boolean).join(" · ")}</p>
        {cliente.notas && <p className="pt-1 text-sm leading-relaxed">{cliente.notas}</p>}
      </div>

      <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Propiedades disponibles que encajan</h3>
      {error ? (
        <ErrorCarga mensaje={error} />
      ) : loading ? (
        <CargandoBloques n={2} />
      ) : coincidencias && coincidencias.length > 0 ? (
        <ul className="space-y-2">
          {coincidencias.map((m) => (
            <li key={`${m.demanda_id}-${m.unidad_id}`}>
              <button type="button" onClick={() => onAbrir(m.referencia)} className="w-full rounded-lg border p-3 text-left hover:bg-muted/50">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium">{m.ubicacion}</span>
                  <span className="shrink-0 text-sm font-semibold tabular-nums">{eur(m.precio)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  {m.referencia} · {tipoUnidad(m.tipo)} · {dec(m.superficie_m2)} m² · {m.habitaciones ?? 0} hab. · {m.distrito ?? m.municipio}
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Progress value={m.puntuacion} className="h-1.5 flex-1" aria-label={`Encaje ${m.puntuacion} de 100`} />
                  <span className="text-xs font-medium tabular-nums">{m.puntuacion}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {m.motivos.map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px]">{t}</Badge>
                  ))}
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Ninguna propiedad disponible encaja ahora con su demanda.</p>
      )}
    </div>
  );
}
