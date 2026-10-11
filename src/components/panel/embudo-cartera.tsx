import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { num } from "@/lib/format";
import { deltaCierres } from "@/lib/panel-corredor";
import type { Embudo as Datos } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Fase {
  titulo: string;
  valor: number;
  nota: string;
  /** true/false si la cifra sube/baja respecto al periodo anterior; null si no se compara */
  sube?: boolean | null;
}

function Delta({ sube }: { sube: boolean | null | undefined }) {
  if (sube === undefined) return null;
  if (sube === null) return <MinusIcon className="size-3.5 text-muted-foreground" />;
  const Flecha = sube ? ArrowUpRightIcon : ArrowDownRightIcon;
  return <Flecha className={cn("size-3.5", sube ? "text-emerald-500" : "text-amber-500")} />;
}

/** Cómo se mueve la cartera: lo que hay en cada fase y lo cerrado en el último periodo. */
export function EmbudoCartera({ datos }: { datos: Datos }) {
  const alq = deltaCierres(datos.alquileres.actual, datos.alquileres.anterior);
  const ven = deltaCierres(datos.ventas.actual, datos.ventas.anterior);
  const fases: Fase[] = [
    { titulo: "Disponibles", valor: datos.disponibles, nota: "Alquiler y venta, listos para ofrecer" },
    { titulo: "Reservadas", valor: datos.reservadas, nota: "A punto de cerrarse" },
    { titulo: `Alquileres · ${datos.dias} d`, valor: datos.alquileres.actual, nota: alq.texto, sube: alq.sube },
    { titulo: `Ventas · ${datos.dias} d`, valor: datos.ventas.actual, nota: ven.texto, sube: ven.sube },
  ];
  const max = Math.max(1, ...fases.map((f) => f.valor));
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">Embudo de cartera</CardTitle>
        <CardDescription>De lo que hay para ofrecer a lo que se cierra</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {fases.map((f, i) => (
          <div key={f.titulo} className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-3">
              <p className="text-sm text-muted-foreground">{f.titulo}</p>
              <p className="flex items-center gap-1.5 text-lg font-semibold tabular-nums">
                <Delta sube={f.sube} />
                {num(f.valor)}
              </p>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-muted" role="presentation">
              <div className={cn("h-full rounded-full", i < 2 ? "bg-primary/50" : "bg-primary")} style={{ width: `${Math.max(2, (f.valor / max) * 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">{f.nota}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
