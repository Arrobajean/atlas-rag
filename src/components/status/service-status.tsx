"use client";

import { RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { StatusDot, type DotTone } from "@/components/status/status-dot";
import { useNow, useServiceHealth, type OverallStatus } from "@/hooks/use-service-health";
import { timeAgo } from "@/lib/format";
import type { ServiceHealth } from "@/lib/types";

const OVERALL: Record<OverallStatus, { label: string; tone: DotTone }> = {
  checking: { label: "Comprobando", tone: "neutral" },
  operational: { label: "Operativo", tone: "ok" },
  degraded: { label: "Degradado", tone: "warn" },
  down: { label: "Sin conexión", tone: "down" },
};

export function ServiceStatus() {
  const { report, checking, status, refresh } = useServiceHealth();
  const now = useNow();
  const overall = OVERALL[status];

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            aria-label={`Estado de los servicios: ${overall.label}`}
          />
        }
      >
        <StatusDot tone={overall.tone} pulse={status === "operational"} />
        <span className="hidden sm:inline">{overall.label}</span>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-72 p-0">
        <div className="px-4 pt-3.5 pb-2">
          <p className="text-sm font-semibold">Estado de servicios</p>
          <p className="text-xs text-muted-foreground">Conexiones que usa el asistente RAG</p>
        </div>

        <ul className="px-2 pb-2">
          {report?.services.map((s) => <ServiceRow key={s.id} service={s} />)}
          {!report && (
            <li className="px-2 py-3 text-xs text-muted-foreground">
              {status === "down" ? "No se pudo contactar con el servidor." : "Comprobando servicios..."}
            </li>
          )}
        </ul>

        <Separator />

        <div className="flex items-center justify-between px-4 py-2">
          <span className="text-[11px] text-muted-foreground">
            {report ? `Comprobado ${timeAgo(new Date(report.checkedAt), now)}` : "—"}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            onClick={refresh}
            disabled={checking}
            aria-label="Volver a comprobar"
          >
            <RefreshCwIcon className={`size-3.5 ${checking ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ServiceRow({ service }: { service: ServiceHealth }) {
  return (
    <li className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
      <StatusDot tone={service.ok ? "ok" : "down"} />
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-tight">{service.name}</p>
        <p className="truncate text-[11px] text-muted-foreground" title={service.error}>
          {service.ok ? service.detail : service.error || "Sin respuesta"}
        </p>
      </div>
      <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
        {service.ok ? `${service.latencyMs} ms` : "—"}
      </span>
    </li>
  );
}
