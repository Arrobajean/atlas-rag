import { Badge } from "@/components/ui/badge";
import { eur } from "@/lib/format";
import { operacion } from "@/lib/etiquetas";
import type { Cliente } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ListaClientes({ clientes, seleccionado, onElegir }: { clientes: Cliente[]; seleccionado: number | null; onElegir: (id: number) => void }) {
  if (clientes.length === 0) return <p className="py-8 text-center text-sm text-muted-foreground">Sin clientes.</p>;
  return (
    <ul className="divide-y rounded-lg border">
      {clientes.map((c) => {
        const d = c.demandas.find((x) => x.activa) ?? c.demandas[0];
        return (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => onElegir(c.id)}
              aria-pressed={seleccionado === c.id}
              className={cn("flex w-full flex-col gap-1 px-3 py-2.5 text-left hover:bg-muted/50", seleccionado === c.id && "bg-muted")}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="truncate text-sm font-medium">{c.nombre}</span>
                <Badge variant="outline" className="shrink-0 capitalize">{c.tipo}</Badge>
              </span>
              <span className="truncate text-xs text-muted-foreground">
                {d ? `${operacion(d.operacion)} · hasta ${eur(d.presupuesto_max)}${d.activa ? "" : " · inactiva"}` : "Sin demanda"}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
