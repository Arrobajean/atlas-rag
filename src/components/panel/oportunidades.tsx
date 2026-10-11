import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { BotonAtlas } from "@/components/panel/boton-atlas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { eur, num } from "@/lib/format";
import { PREGUNTA_SIN_OFERTA, preguntaOportunidad } from "@/lib/panel-corredor";
import type { Oportunidades as Datos } from "@/lib/types";

/** Cruce demanda ↔ oferta: pisos libres con más clientes interesados y clientes sin nada que ofrecerles. */
export function Oportunidades({ datos }: { datos: Datos }) {
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">Oportunidades</CardTitle>
        <CardDescription>
          {num(datos.unidades_con_interesados)} pisos libres tienen clientes que encajan · {num(datos.demandas_activas)} demandas activas
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-2">
          {datos.items.map((o) => (
            <li key={o.unidad_id} className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate text-sm font-medium">{o.ubicacion}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{num(o.clientes)} clientes</span> encajan · mejor: {o.mejor_cliente} ({o.mejor_puntuacion} %)
                </p>
              </div>
              {o.precio !== null && (
                <p className="hidden shrink-0 text-sm tabular-nums sm:block">
                  {eur(o.precio)}
                  {o.operacion !== "venta" && <span className="text-xs text-muted-foreground">/mes</span>}
                </p>
              )}
              <BotonAtlas pregunta={preguntaOportunidad(o.referencia)} etiqueta="A quién llamar" />
            </li>
          ))}
        </ul>

        {datos.demandas_sin_oferta > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm">
              <span className="font-medium tabular-nums">{num(datos.demandas_sin_oferta)} demandas</span>
              <span className="text-muted-foreground"> no tienen ninguna propiedad que encaje</span>
            </p>
            <ul className="space-y-1 text-xs text-muted-foreground">
              {datos.sin_oferta.map((s) => (
                <li key={s.id} className="flex justify-between gap-3">
                  <span className="truncate">{s.cliente} · {s.tipo}</span>
                  <span className="shrink-0 tabular-nums">{s.presupuesto_max ? `hasta ${eur(s.presupuesto_max)}` : "sin tope"}</span>
                </li>
              ))}
            </ul>
            <div className="flex items-center justify-between gap-3">
              <BotonAtlas pregunta={PREGUNTA_SIN_OFERTA} etiqueta="Qué ofrecerles" />
              <Link href="/dashboard/clientes" className="flex items-center gap-1 text-xs text-primary hover:underline">
                Ver clientes <ArrowRightIcon className="size-3" />
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
