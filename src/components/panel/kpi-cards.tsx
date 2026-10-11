import { AlertTriangleIcon, ArrowDownRightIcon, ArrowUpRightIcon, BanknoteIcon, Building2Icon, CalendarClockIcon, KeyRoundIcon, PercentIcon } from "lucide-react";
import { Sparkline } from "@/components/panel/sparkline";
import { Card, CardContent } from "@/components/ui/card";
import { dec, eur, num, pct } from "@/lib/format";
import { mesesCompletos, morosidadMes, variacion } from "@/lib/panel";
import { cn } from "@/lib/utils";
import type { Resumen } from "@/lib/types";

interface Kpi {
  titulo: string;
  valor: string;
  detalle: string;
  icono: React.ComponentType<{ className?: string }>;
  aviso?: boolean;
  /** Serie mensual para la mini-gráfica y la variación frente al mes anterior */
  tendencia?: { valores: number[]; subirEsBueno: boolean; etiqueta: string };
}

function kpis(r: Resumen): Kpi[] {
  const i = r.indicadores;
  const completos = r.serieCobros ? mesesCompletos(r.serieCobros) : [];
  const facturado = completos.map((p) => p.emitido);
  const morosidad = completos.map(morosidadMes);
  return [
    { titulo: "Propiedades", valor: num(i.unidades_total), detalle: `${num(i.en_venta)} en venta · ${num(i.disponibles_alquiler)} libres para alquilar`, icono: Building2Icon },
    { titulo: "Ocupación", valor: pct(i.ocupacion_pct), detalle: `${num(i.alquiladas)} alquiladas · ${num(i.en_reforma)} en reforma`, icono: KeyRoundIcon },
    {
      titulo: "Facturado en 12 meses", valor: eur(i.facturado_12m), detalle: `Renta media ${eur(i.renta_media)}`, icono: BanknoteIcon,
      tendencia: facturado.length > 2 ? { valores: facturado, subirEsBueno: true, etiqueta: "Facturación mensual de los últimos meses" } : undefined,
    },
    {
      titulo: "Morosidad", valor: pct(i.morosidad_pct), detalle: `${eur(i.impagado)} sin cobrar`, icono: PercentIcon, aviso: (i.morosidad_pct ?? 0) > 3,
      tendencia: morosidad.length > 2 ? { valores: morosidad, subirEsBueno: false, etiqueta: "Morosidad mensual de los últimos meses" } : undefined,
    },
    { titulo: "Vencen en 90 días", valor: num(i.contratos_vencen_90d), detalle: `${num(i.contratos_vencen_30d)} en los próximos 30 días`, icono: CalendarClockIcon },
    { titulo: "Alertas activas", valor: num(r.alertas.total), detalle: `${num(r.documentos)} documentos indexados`, icono: AlertTriangleIcon, aviso: r.alertas.total > 0 },
  ];
}

function Variacion({ valores, subirEsBueno }: { valores: number[]; subirEsBueno: boolean }) {
  const v = variacion(valores);
  if (v === null) return null;
  const sube = v >= 0;
  const bueno = sube === subirEsBueno;
  const Flecha = sube ? ArrowUpRightIcon : ArrowDownRightIcon;
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium tabular-nums", bueno ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400")}>
      <Flecha className="size-3.5" />
      {sube ? "+" : "−"}
      {dec(Math.abs(v))} %<span className="ml-1 font-normal text-muted-foreground">vs. mes anterior</span>
    </span>
  );
}

function KpiCard({ k }: { k: Kpi }) {
  return (
    <Card className="shadow-xs">
      <CardContent className="space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-muted-foreground">{k.titulo}</p>
          <k.icono className={cn("size-4", k.aviso ? "text-amber-500" : "text-primary")} />
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{k.valor}</p>
          {k.tendencia ? <Variacion valores={k.tendencia.valores} subirEsBueno={k.tendencia.subirEsBueno} /> : null}
          <p className="truncate text-xs text-muted-foreground">{k.detalle}</p>
        </div>
        {k.tendencia && <Sparkline valores={k.tendencia.valores} etiqueta={k.tendencia.etiqueta} className={k.aviso ? "text-amber-500" : "text-primary"} />}
      </CardContent>
    </Card>
  );
}

/** Cuatro cifras sueltas arriba y, debajo, las que tienen tendencia a mayor tamaño. */
export function KpiCards({ resumen }: { resumen: Resumen }) {
  const todos = kpis(resumen);
  const simples = todos.filter((k) => !k.tendencia);
  const conTendencia = todos.filter((k) => k.tendencia);
  return (
    <div className="space-y-4">
      <div className={cn("grid grid-cols-1 gap-4 sm:grid-cols-2", conTendencia.length > 0 ? "xl:grid-cols-4" : "xl:grid-cols-3")}>
        {simples.map((k) => (
          <KpiCard key={k.titulo} k={k} />
        ))}
      </div>
      {conTendencia.length > 0 && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {conTendencia.map((k) => (
            <KpiCard key={k.titulo} k={k} />
          ))}
        </div>
      )}
    </div>
  );
}
