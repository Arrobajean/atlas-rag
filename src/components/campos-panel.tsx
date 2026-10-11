"use client";

import * as React from "react";
import { CheckIcon, XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CargandoBloques, ErrorCarga } from "@/components/panel/estado-carga";
import { useCampos } from "@/hooks/use-campos";
import { useSesion } from "@/hooks/use-sesion";
import { fecha } from "@/lib/format";

const ESCRITURA: Record<string, string> = { columna: "Columna de la BD", atributo: "Atributo tipado", solo_lectura: "Solo verificación" };

export function CamposPanel() {
  const { datos, loading, error, recargar, resolver } = useCampos();
  const { esAdmin } = useSesion();
  if (loading && !datos) return <CargandoBloques n={3} />;
  if (error || !datos) return <ErrorCarga mensaje={error ?? "Sin datos"} onReintentar={recargar} />;
  const pendientes = datos.solicitudes.filter((s) => s.estado === "pendiente");

  return (
    <div className="space-y-8">
      <section className="space-y-3" aria-label="Solicitudes de campos">
        <h2 className="text-sm font-semibold">Solicitudes pendientes ({pendientes.length})</h2>
        {datos.solicitudes.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nadie ha propuesto campos nuevos.</p>
        ) : (
          <ul className="space-y-2">
            {datos.solicitudes.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
                <div className="min-w-0 space-y-0.5">
                  <p className="text-sm font-medium">{s.etiqueta} <span className="font-normal text-muted-foreground">· {s.tipo_dato}</span></p>
                  {s.descripcion && <p className="text-xs text-muted-foreground">{s.descripcion}</p>}
                  <p className="text-[11px] text-muted-foreground">{fecha(s.created_at)}{s.propuesto_por ? ` · propuesto por ${s.propuesto_por}` : ""}</p>
                </div>
                {s.estado === "pendiente" ? (
                  esAdmin ? (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void resolver(s.id, "rechazar")}><XIcon className="mr-1 size-3.5" /> Rechazar</Button>
                      <Button size="sm" onClick={() => void resolver(s.id, "aprobar")}><CheckIcon className="mr-1 size-3.5" /> Aprobar</Button>
                    </div>
                  ) : (
                    <Badge variant="secondary">Pendiente de un administrador</Badge>
                  )
                ) : (
                  <Badge variant={s.estado === "aprobada" ? "default" : "outline"} className="capitalize">{s.estado}</Badge>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="text-xs text-muted-foreground">Un campo aprobado se añade siempre como atributo tipado del contrato; nunca crea columnas nuevas (eso requiere una migración).</p>
      </section>

      <section className="space-y-3" aria-label="Catálogo">
        <h2 className="text-sm font-semibold">Catálogo de campos del contrato ({datos.campos.length})</h2>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Campo</TableHead>
                <TableHead className="hidden sm:table-cell">Grupo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Destino</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {datos.campos.map((c) => (
                <TableRow key={c.clave}>
                  <TableCell>
                    <span className="font-medium">{c.etiqueta}</span>{c.obligatorio && <span className="ml-1 text-destructive">*</span>}
                    <span className="block font-mono text-[11px] text-muted-foreground">{c.clave}</span>
                  </TableCell>
                  <TableCell className="hidden text-xs sm:table-cell">{c.grupo}</TableCell>
                  <TableCell className="text-xs">{c.tipo_dato}{c.opciones ? ` (${c.opciones.join(", ")})` : ""}</TableCell>
                  <TableCell className="hidden text-xs md:table-cell">
                    <Badge variant="outline">{ESCRITURA[c.escritura]}</Badge>
                    {c.tabla_destino && <span className="ml-2 font-mono text-[11px] text-muted-foreground">{c.tabla_destino}.{c.columna_destino}</span>}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
