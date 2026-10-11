import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { pct } from "@/lib/format";
import type { Resumen } from "@/lib/types";

/** Ocupación por zona: barra alquiladas / disponibles con enlace al explorador filtrado. */
export function RepartoZonas({ zonas }: { zonas: Resumen["ocupacionPorZona"] }) {
  const ordenadas = [...zonas].sort((a, b) => b.unidades - a.unidades);
  const max = Math.max(1, ...ordenadas.map((z) => z.unidades));
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">Ocupación por zona</CardTitle>
        <CardDescription>Unidades en alquiler por zona; en color intenso las alquiladas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {ordenadas.map((z) => (
          <Link key={z.zona} href={`/dashboard/propiedades?zona=${encodeURIComponent(z.zona)}`} className="grid grid-cols-[minmax(110px,170px)_1fr_auto] items-center gap-3 text-xs hover:opacity-80">
            <span className="truncate font-medium">{z.zona}</span>
            <div className="flex h-2.5 overflow-hidden rounded-full bg-muted" style={{ width: `${(z.unidades / max) * 100}%`, minWidth: "20%" }} aria-label={`${z.alquiladas} alquiladas de ${z.unidades}`}>
              <div className="h-full bg-primary" style={{ width: `${z.unidades ? (z.alquiladas / z.unidades) * 100 : 0}%` }} />
              <div className="h-full bg-primary/30" style={{ width: `${z.unidades ? (z.disponibles / z.unidades) * 100 : 0}%` }} />
            </div>
            <span className="tabular-nums text-muted-foreground">{pct(z.ocupacion_pct)}</span>
          </Link>
        ))}
        <div className="flex gap-4 pt-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary" /> Alquiladas</span>
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-primary/30" /> Disponibles</span>
        </div>
      </CardContent>
    </Card>
  );
}
