import { Badge } from "@/components/ui/badge";
import { eur, fecha } from "@/lib/format";
import { tipoContrato } from "@/lib/etiquetas";
import type { FichaPropiedad } from "@/lib/types";

/** Contrato vigente con su inquilino, y cobros recientes. */
export function FichaContrato({ ficha }: { ficha: FichaPropiedad }) {
  const c = ficha.contrato_vigente as Record<string, unknown> | null;
  if (!c) return <p className="text-sm text-muted-foreground">Sin contrato de alquiler vigente.</p>;
  const inq = c.inquilino as Record<string, unknown> | null;
  return (
    <section aria-label="Contrato vigente" className="space-y-3">
      <div className="flex items-center justify-between rounded-lg border p-3">
        <div className="space-y-0.5">
          <p className="text-sm font-medium">
            {String(c.referencia)} · {tipoContrato(String(c.tipo))}
          </p>
          <p className="text-xs text-muted-foreground">
            {fecha(String(c.inicio))} → {fecha(String(c.fin))} · renta {eur(Number(c.renta_mensual))} · fianza {eur(Number(c.fianza))}
            {c.fianza_depositada ? "" : " (sin depositar)"}
          </p>
        </div>
        <Badge variant="outline" className="uppercase">{String(c.indice_actualizacion)}</Badge>
      </div>
      {inq && (
        <p className="text-sm">
          <span className="text-muted-foreground">Inquilino: </span>
          <strong>{String(inq.nombre)}</strong>
          <span className="text-muted-foreground"> · {String(inq.telefono ?? "")} · {String(inq.email ?? "")} · doc. {String(inq.documento)}</span>
        </p>
      )}
      {ficha.pagos_recientes.length > 0 && (
        <div className="flex flex-wrap gap-1.5" aria-label="Últimos recibos">
          {ficha.pagos_recientes.map((p, i) => {
            const estado = String(p.estado);
            const clase = estado === "pagado" ? (Number(p.dias_retraso) > 0 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600") : "bg-destructive/10 text-destructive";
            return (
              <span key={i} className={`rounded px-2 py-1 text-[11px] ${clase}`} title={`${estado}${p.dias_retraso ? ` · ${p.dias_retraso} días de retraso` : ""}`}>
                {String(p.periodo).slice(0, 7)} · {eur(Number(p.importe))}
              </span>
            );
          })}
        </div>
      )}
    </section>
  );
}
