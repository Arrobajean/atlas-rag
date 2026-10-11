import Link from "next/link";
import { ArrowRightIcon, CheckCircle2Icon, FileSearchIcon, ScaleIcon, DatabaseZapIcon } from "lucide-react";
import { BotonAtlas } from "@/components/panel/boton-atlas";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { num } from "@/lib/format";
import { PREGUNTA_CLAUSULAS } from "@/lib/panel-corredor";
import type { PanelDocumentos } from "@/lib/types";

function Fila({ icono: Icono, children, accion }: { icono: React.ComponentType<{ className?: string }>; children: React.ReactNode; accion?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-lg border px-3 py-2.5">
      <Icono className="mt-0.5 size-4 shrink-0 text-primary" />
      <div className="min-w-0 flex-1 space-y-1 text-sm">{children}</div>
      {accion}
    </div>
  );
}

/** Lo que la IA ha leído o revisado y espera a una persona: borradores del lector, cláusulas de riesgo e indexado. */
export function DocumentosIA({ datos }: { datos: PanelDocumentos }) {
  const indexado = datos.indexado_error + datos.indexado_pendiente;
  const todoAlDia = datos.por_confirmar === 0 && datos.clausulas_alta === 0 && indexado === 0;
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">Documentos con IA</CardTitle>
        <CardDescription>Lo que el lector y el revisor han dejado esperando · {num(datos.documentos)} documentos vigentes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {todoAlDia && (
          <p className="flex items-center gap-2 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <CheckCircle2Icon className="size-4 text-emerald-500" /> Nada pendiente: contratos confirmados y sin cláusulas de riesgo.
          </p>
        )}

        {datos.por_confirmar > 0 && (
          <Fila
            icono={FileSearchIcon}
            accion={
              <Link href="/dashboard/lector" className="flex shrink-0 items-center gap-1 pt-0.5 text-xs text-primary hover:underline">
                Revisar <ArrowRightIcon className="size-3" />
              </Link>
            }
          >
            <p className="font-medium">
              {num(datos.por_confirmar)} {datos.por_confirmar === 1 ? "contrato leído espera" : "contratos leídos esperan"} confirmación
            </p>
            <p className="text-xs text-muted-foreground">
              {datos.con_dudas > 0 ? `${num(datos.con_dudas)} con campos de baja confianza` : "Todos con confianza alta"}
              {datos.borradores[0] ? ` · el más antiguo: ${datos.borradores[0].titulo}` : ""}
            </p>
          </Fila>
        )}

        {datos.clausulas_alta > 0 && (
          <Fila icono={ScaleIcon} accion={<BotonAtlas pregunta={PREGUNTA_CLAUSULAS} etiqueta="Qué hacer" />}>
            <p className="font-medium">{num(datos.clausulas_alta)} cláusulas de riesgo alto en contratos vigentes</p>
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {datos.clausulas.map((c) => (
                <li key={`${c.contrato}-${c.titulo}`} className="truncate">
                  {c.contrato} · {c.titulo}
                </li>
              ))}
            </ul>
          </Fila>
        )}

        {indexado > 0 && (
          <Fila
            icono={DatabaseZapIcon}
            accion={
              <Link href="/dashboard/documentos" className="flex shrink-0 items-center gap-1 pt-0.5 text-xs text-primary hover:underline">
                Ver <ArrowRightIcon className="size-3" />
              </Link>
            }
          >
            <p className="font-medium">{num(indexado)} documentos sin indexar</p>
            <p className="text-xs text-muted-foreground">
              {datos.indexado_error > 0 ? `${num(datos.indexado_error)} con error` : ""}
              {datos.indexado_error > 0 && datos.indexado_pendiente > 0 ? " · " : ""}
              {datos.indexado_pendiente > 0 ? `${num(datos.indexado_pendiente)} en cola` : ""}
              {" · el asistente aún no los puede citar"}
            </p>
          </Fila>
        )}
      </CardContent>
    </Card>
  );
}
