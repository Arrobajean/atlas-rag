"use client";

import { AccionesRapidas } from "@/components/panel/acciones-rapidas";
import { AlertasResumen } from "@/components/panel/alertas-resumen";
import { AtlasSugiere } from "@/components/panel/atlas-sugiere";
import { DocumentosIA } from "@/components/panel/documentos-ia";
import { EmbudoCartera } from "@/components/panel/embudo-cartera";
import { CargandoPanel, ErrorCarga } from "@/components/panel/estado-carga";
import { GraficaCobros } from "@/components/panel/grafica-cobros";
import { HoyCard } from "@/components/panel/hoy-card";
import { IngresosRiesgo } from "@/components/panel/ingresos-riesgo";
import { KpiCards } from "@/components/panel/kpi-cards";
import { Oportunidades } from "@/components/panel/oportunidades";
import { PanelCabecera } from "@/components/panel/panel-cabecera";
import { RepartoZonas } from "@/components/panel/reparto-zonas";
import { SaludAsistente } from "@/components/panel/salud-asistente";
import { Skeleton } from "@/components/ui/skeleton";
import { usePanelCorredor } from "@/hooks/use-panel-corredor";
import { useResumen } from "@/hooks/use-resumen";

const DOS_COLUMNAS = "grid gap-6 lg:grid-cols-[2fr_1fr] 2xl:grid-cols-[3fr_2fr]";

export function PanelResumen() {
  const { datos, loading, error, recargar } = useResumen();
  const corredor = usePanelCorredor();
  if (loading && !datos) return <CargandoPanel />;
  if (error || !datos) return <ErrorCarga mensaje={error ?? "Sin datos"} onReintentar={recargar} />;

  const c = corredor.datos;
  const cargandoCorredor = corredor.loading && !c;
  const serie = datos.serieCobros && datos.serieCobros.length > 1 ? datos.serieCobros : null;

  return (
    <div className="space-y-6">
      <PanelCabecera />

      {/* Lo que pide acción ya. Sin la migración 0014 se muestran las ideas genéricas de antes. */}
      {cargandoCorredor ? (
        <div className={DOS_COLUMNAS} aria-busy="true">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : (
        // Segunda columna: los ingresos en riesgo si existen; si no, accesos rápidos para que la fila no quede a medias
        <div className={DOS_COLUMNAS}>
          {c?.agenda ? <HoyCard agenda={c.agenda} /> : <AtlasSugiere resumen={datos} />}
          {c?.riesgo ? <IngresosRiesgo riesgo={c.riesgo} /> : <AccionesRapidas />}
        </div>
      )}

      <KpiCards resumen={datos} />

      {(c?.oportunidades || c?.embudo) && (
        <div className={DOS_COLUMNAS}>
          {c.oportunidades && <Oportunidades datos={c.oportunidades} />}
          {c.embudo && <EmbudoCartera datos={c.embudo} />}
        </div>
      )}

      <div className={DOS_COLUMNAS}>
        {serie ? <GraficaCobros serie={serie} /> : <RepartoZonas zonas={datos.ocupacionPorZona} />}
        <AlertasResumen alertas={datos.alertas} />
      </div>
      {serie && <RepartoZonas zonas={datos.ocupacionPorZona} />}

      {(c?.documentos || c?.salud) && (
        <div className={DOS_COLUMNAS}>
          {c.documentos && <DocumentosIA datos={c.documentos} />}
          {c.salud && <SaludAsistente datos={c.salud} />}
        </div>
      )}
    </div>
  );
}
