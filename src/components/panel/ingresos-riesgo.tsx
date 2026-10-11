import { BotonAtlas } from "@/components/panel/boton-atlas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { eur, num } from "@/lib/format";
import { PREGUNTA_RENOVACIONES, PREGUNTA_VACIOS } from "@/lib/panel-corredor";
import type { IngresosRiesgo as Datos } from "@/lib/types";

const TRAMOS = [
  { clave: "d30", etiqueta: "30 días" },
  { clave: "d60", etiqueta: "60 días" },
  { clave: "d90", etiqueta: "90 días" },
] as const;

/** Dinero que dejaría de entrar: renta de contratos que vencen y coste mensual de los pisos vacíos. */
export function IngresosRiesgo({ riesgo }: { riesgo: Datos }) {
  const { vacios } = riesgo;
  const total90 = riesgo.renta_en_riesgo.d90;
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">Ingresos en riesgo</CardTitle>
        <CardDescription>Renta que dejarías de cobrar si no se renueva</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1">
          <p className="text-3xl font-semibold tabular-nums tracking-tight">{eur(total90.renta)}<span className="text-base font-normal text-muted-foreground"> /mes</span></p>
          <p className="text-xs text-muted-foreground">{num(total90.contratos)} contratos vencen en 90 días · {eur(total90.renta * 12)} al año</p>
        </div>

        <ul className="space-y-1.5 text-sm">
          {TRAMOS.map((t) => (
            <li key={t.clave} className="flex items-center justify-between">
              <span className="text-muted-foreground">En {t.etiqueta}</span>
              <span className="tabular-nums">
                {eur(riesgo.renta_en_riesgo[t.clave].renta)} <span className="text-xs text-muted-foreground">· {num(riesgo.renta_en_riesgo[t.clave].contratos)}</span>
              </span>
            </li>
          ))}
        </ul>
        <BotonAtlas pregunta={PREGUNTA_RENOVACIONES} etiqueta="Qué renovar primero" />

        <div className="space-y-2 border-t pt-4">
          <p className="text-sm">
            <span className="font-medium tabular-nums">{num(vacios.unidades)} pisos vacíos</span>
            <span className="text-muted-foreground"> · {eur(vacios.renta_mensual)}/mes sin ingresar</span>
          </p>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {vacios.items.map((v) => (
              <li key={v.id} className="flex justify-between gap-3">
                <span className="truncate">{v.ubicacion}</span>
                <span className="shrink-0 tabular-nums">{v.dias_vacio ? `${v.dias_vacio} d · ` : ""}{eur(v.precio)}</span>
              </li>
            ))}
          </ul>
          <BotonAtlas pregunta={PREGUNTA_VACIOS} etiqueta="Buscar inquilino" />
        </div>
      </CardContent>
    </Card>
  );
}
