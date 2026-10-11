"use client";

import { AlertCircleIcon, BellRingIcon, CheckCircle2Icon, HomeIcon, Loader2Icon, UserPlusIcon, WrenchIcon, XCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AccionUI, TipoAccion } from "@/lib/chat/types";
import { cn } from "@/lib/utils";

const TIPOS: Record<TipoAccion, { titulo: string; icono: React.ComponentType<{ className?: string }> }> = {
  crear_incidencia: { titulo: "Nueva incidencia", icono: WrenchIcon },
  crear_cliente_demanda: { titulo: "Nuevo cliente y demanda", icono: UserPlusIcon },
  resolver_alerta: { titulo: "Alerta", icono: BellRingIcon },
  cambiar_estado_unidad: { titulo: "Cambio de estado", icono: HomeIcon },
};

interface Props {
  accion: AccionUI;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Propuesta del asistente que modifica datos. No se ejecuta hasta pulsar «Confirmar»;
 * el texto mostrado es el que genera la propia base de datos al validarla.
 */
export function AccionCard({ accion: a, onConfirmar, onCancelar }: Props) {
  const { titulo, icono: Icono } = TIPOS[a.tipo];
  const cerrada = a.estado === "hecha" || a.estado === "cancelada";

  return (
    <section
      aria-label={`Acción propuesta: ${titulo}`}
      className={cn(
        "rounded-2xl border p-4 transition-colors",
        a.estado === "hecha" && "border-emerald-500/40 bg-emerald-500/5",
        a.estado === "error" && "border-destructive/40 bg-destructive/5",
        a.estado === "cancelada" && "opacity-60",
        (a.estado === "pendiente" || a.estado === "ejecutando") && "border-primary/30 bg-primary/[0.03]"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-muted p-2">
          <Icono className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <p className="text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">{titulo}</p>
          <p className="text-sm leading-relaxed">{a.resumen}</p>

          {a.estado === "hecha" && (
            <p className="flex items-center gap-1.5 pt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <CheckCircle2Icon className="size-3.5" /> Hecho
            </p>
          )}
          {a.estado === "cancelada" && (
            <p className="flex items-center gap-1.5 pt-1 text-xs text-muted-foreground">
              <XCircleIcon className="size-3.5" /> Cancelada: no se ha modificado nada
            </p>
          )}
          {a.estado === "error" && (
            <p role="alert" className="flex items-start gap-1.5 pt-1 text-xs text-destructive">
              <AlertCircleIcon className="mt-0.5 size-3.5 shrink-0" /> {a.error}
            </p>
          )}
        </div>
      </div>

      {!cerrada && (
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancelar} disabled={a.estado === "ejecutando"}>
            Cancelar
          </Button>
          <Button size="sm" onClick={onConfirmar} disabled={a.estado === "ejecutando"}>
            {a.estado === "ejecutando" && <Loader2Icon className="mr-1.5 size-3.5 animate-spin" />}
            {a.estado === "error" ? "Reintentar" : "Confirmar"}
          </Button>
        </div>
      )}
    </section>
  );
}
