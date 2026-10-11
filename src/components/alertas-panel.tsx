"use client";

import * as React from "react";
import { CheckCircle2Icon } from "lucide-react";
import { AlertaItem } from "@/components/alertas/alerta-item";
import { CargandoBloques, ErrorCarga } from "@/components/panel/estado-carga";
import { FichaSheet } from "@/components/propiedades/ficha-sheet";
import { SelectCampo } from "@/components/ui/select-campo";
import { useAlertas } from "@/hooks/use-alertas";
import { OPCIONES_TIPO_ALERTA, tipoAlerta } from "@/lib/etiquetas";

export function AlertasPanel({ tipoInicial = "" }: { tipoInicial?: string }) {
  const { datos, loading, error, recargar, tipo, setTipo, severidad, setSeveridad, resolver, posponer } = useAlertas(tipoInicial);
  const [abierta, setAbierta] = React.useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <SelectCampo aria-label="Tipo de alerta" className="w-56" value={tipo} placeholder="Todos los tipos" opciones={OPCIONES_TIPO_ALERTA} onChange={setTipo} />
        <SelectCampo
          aria-label="Nivel"
          className="w-40"
          value={severidad}
          placeholder="Todos los niveles"
          opciones={[["alta", "Alta"], ["media", "Media"], ["baja", "Baja"]]}
          onChange={setSeveridad}
        />
        {datos && (
          <p className="ml-auto self-center text-xs text-muted-foreground">
            {datos.total} alertas
            {Object.keys(datos.por_tipo).length > 1 && ` · ${Object.entries(datos.por_tipo).map(([t, n]) => `${tipoAlerta(t)}: ${n}`).join(" · ")}`}
          </p>
        )}
      </div>

      {error ? (
        <ErrorCarga mensaje={error} onReintentar={recargar} />
      ) : loading && !datos ? (
        <CargandoBloques n={4} />
      ) : datos && datos.items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-14 text-center text-sm text-muted-foreground">
          <CheckCircle2Icon className="size-6 text-emerald-500" />
          Todo al día: no hay alertas con estos filtros.
        </div>
      ) : (
        <ul className={`space-y-2 ${loading ? "opacity-60" : ""}`}>
          {datos?.items.map((a) => (
            <AlertaItem key={a.clave} alerta={a} onResolver={() => resolver(a.clave)} onPosponer={() => posponer(a.clave, 7)} onAbrirUnidad={setAbierta} />
          ))}
        </ul>
      )}
      <FichaSheet referencia={abierta} onClose={() => setAbierta(null)} />
    </div>
  );
}
