"use client";

import * as React from "react";
import Link from "next/link";
import { FileClockIcon, ScanTextIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { DocumentsEmpty } from "@/components/documents/documents-empty";
import { SubidaDialog } from "@/components/documentos/subida-dialog";
import { CargandoBloques, ErrorCarga } from "@/components/panel/estado-carga";
import { useBandejaLector } from "@/hooks/use-bandeja-lector";
import { timeAgo } from "@/lib/format";

const ESTADOS: Record<string, string> = {
  borrador: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  confirmado: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  descartado: "bg-muted text-muted-foreground",
  error: "bg-destructive/10 text-destructive",
  procesando: "bg-sky-500/10 text-sky-600",
};

export function LectorBandeja() {
  const { datos, loading, error, recargar, leerNuevo } = useBandejaLector();
  const [abierto, setAbierto] = React.useState(false);
  const [ahora] = React.useState(() => Date.now());
  const extracciones = datos?.extracciones ?? [];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SubidaDialog open={abierto} onOpenChange={setAbierto} onSubido={leerNuevo} tipoInicial="contrato" etiqueta="Subir contrato y leer" />
      </div>
      {error ? (
        <ErrorCarga mensaje={error} onReintentar={recargar} />
      ) : loading && !datos ? (
        <CargandoBloques n={3} />
      ) : extracciones.length === 0 ? (
        <DocumentsEmpty
          icon={<ScanTextIcon />}
          title="No hay contratos leídos"
          description="Sube un contrato en PDF: la IA lo lee y rellena los datos para que los verifiques antes de guardarlos. También puedes lanzar la lectura desde «Documentos»."
        />
      ) : (
        <ul className="space-y-2">
          {extracciones.map((e) => (
            <li key={e.id}>
              <Link href={`/dashboard/lector/${e.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-muted/50">
                <span className="flex min-w-0 items-center gap-3">
                  <FileClockIcon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{e.titulo}</span>
                    <span className="block text-xs text-muted-foreground">{timeAgo(new Date(e.created_at), ahora)}{e.error ? ` · ${e.error}` : ""}</span>
                  </span>
                </span>
                <Badge className={`border-transparent capitalize ${ESTADOS[e.estado] ?? ""}`}>{e.estado}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
