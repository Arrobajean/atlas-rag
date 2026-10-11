import Link from "next/link";
import { ArrowRightIcon, CheckCircle2Icon } from "lucide-react";
import { BotonAtlas } from "@/components/panel/boton-atlas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { eur, num } from "@/lib/format";
import { plazoAgenda, preguntaAgenda } from "@/lib/panel-corredor";
import type { AgendaHoy, ItemAgenda } from "@/lib/types";
import { cn } from "@/lib/utils";

const COLOR_NIVEL: Record<ItemAgenda["nivel"], string> = {
  1: "bg-destructive",
  2: "bg-amber-500",
  3: "bg-muted-foreground/50",
};
const ETIQUETA_NIVEL: Record<ItemAgenda["nivel"], string> = { 1: "Hoy", 2: "Esta semana", 3: "Cuando se pueda" };

/** Cola de tareas por prioridad: lo primero que un corredor necesita ver por la mañana. */
export function HoyCard({ agenda }: { agenda: AgendaHoy }) {
  const { hoy, semana } = agenda.por_nivel;
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">Para hoy</CardTitle>
        <CardDescription>
          {agenda.total === 0
            ? "Nada urgente: todo al día."
            : `${num(hoy)} para hoy · ${num(semana)} esta semana · ${eur(agenda.importe_en_juego)} en juego`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {agenda.items.length === 0 && (
          <p className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <CheckCircle2Icon className="size-4 text-emerald-500" /> Sin impagos, vencimientos inminentes ni incidencias urgentes.
          </p>
        )}
        {agenda.items.map((i) => (
          <div key={i.clave} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
            <span className={cn("size-2 shrink-0 rounded-full", COLOR_NIVEL[i.nivel])} title={ETIQUETA_NIVEL[i.nivel]} role="img" aria-label={ETIQUETA_NIVEL[i.nivel]} />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate text-sm font-medium">{i.titulo}</p>
              <p className="truncate text-xs text-muted-foreground">
                {[plazoAgenda(i), i.ubicacion].filter(Boolean).join(" · ")}
              </p>
            </div>
            {i.importe !== null && i.importe > 0 && <p className="hidden shrink-0 text-sm font-medium tabular-nums sm:block">{eur(i.importe)}</p>}
            <BotonAtlas pregunta={preguntaAgenda(i)} />
          </div>
        ))}
        {agenda.total > agenda.items.length && (
          <Link href="/dashboard/alertas" className="flex items-center gap-1 pt-1 text-xs text-primary hover:underline">
            Ver las {num(agenda.total)} tareas y alertas <ArrowRightIcon className="size-3" />
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
