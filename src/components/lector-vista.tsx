"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VisorPdf } from "@/components/documentos/visor-pdf-lazy";
import { BarraAccionesLector } from "@/components/lector/barra-acciones";
import { ComparacionLector } from "@/components/lector/comparacion-lector";
import { FormularioLector } from "@/components/lector/formulario-lector";
import { HallazgosLector } from "@/components/lector/hallazgos-lector";
import { ResolucionLector } from "@/components/lector/resolucion-lector";
import { CargandoBloques, ErrorCarga } from "@/components/panel/estado-carga";
import { useLector } from "@/hooks/use-lector";

/** Pantalla dividida: el PDF a la izquierda; a la derecha los datos leídos, listos para verificar y corregir. */
export function LectorVista({ id }: { id: number }) {
  const l = useLector(id);
  const [total, setTotal] = React.useState(0);
  const [pestana, setPestana] = React.useState("datos");

  if (l.carga.loading && !l.base) return <CargandoBloques n={3} />;
  if (l.carga.error || !l.base) return <ErrorCarga mensaje={l.carga.error ?? "Extracción no encontrada"} onReintentar={l.carga.recargar} />;

  const { base } = l;
  const cita = l.activo ? l.datos[l.activo]?.texto : null;
  const altas = l.hallazgos.filter((h) => h.severidad === "alta").length;
  const nErrores = Object.keys(l.errores).length;
  const motivo = !l.editable ? `Este borrador está «${base.extraccion.estado}»` : l.faltaUnidad ? "Elige la unidad en «Vincular»" : nErrores ? `Faltan o son inválidos ${nErrores} campo${nErrores > 1 ? "s" : ""}` : null;

  return (
    <div className="flex h-[calc(100dvh-8.5rem)] min-h-[520px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link href="/dashboard/lector" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-3" /> Lector
        </Link>
        <h1 className="truncate text-base font-semibold">{base.documento?.titulo ?? "Contrato"}</h1>
        <Badge variant="outline" className="capitalize">{base.extraccion.estado}</Badge>
        {base.extraccion.modelo && <span className="text-[11px] text-muted-foreground">leído con {base.extraccion.modelo}</span>}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <div className="min-h-72">
          {base.archivo_url ? (
            <VisorPdf url={base.archivo_url} pagina={l.pagina} onPagina={l.setPagina} onTotal={setTotal} total={total} resaltar={cita} />
          ) : (
            <p className="rounded-lg border p-6 text-sm text-muted-foreground">No se puede mostrar el archivo original.</p>
          )}
        </div>

        <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border">
          <Tabs value={pestana} onValueChange={(v) => setPestana(String(v))} className="flex min-h-0 flex-1 flex-col">
            <TabsList className="m-2 grid grid-cols-4">
              <TabsTrigger value="datos">Datos</TabsTrigger>
              <TabsTrigger value="vincular">Vincular{l.faltaUnidad && <span className="ml-1 size-1.5 rounded-full bg-destructive" aria-label="pendiente" />}</TabsTrigger>
              <TabsTrigger value="comparar">Comparar</TabsTrigger>
              <TabsTrigger value="revision">Revisión{l.hallazgos.length > 0 && <Badge variant={altas ? "destructive" : "secondary"} className="ml-1.5 h-4 px-1">{l.hallazgos.length}</Badge>}</TabsTrigger>
            </TabsList>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              <TabsContent value="datos" className="mt-2">
                <FormularioLector
                  grupos={l.grupos}
                  disponibles={l.disponibles}
                  valores={l.valores}
                  datos={l.datos}
                  estados={l.estados}
                  erroresServidor={l.erroresServidor}
                  activo={l.activo}
                  editable={l.editable}
                  onCambiar={l.cambiarValor}
                  onSeleccionar={l.seleccionar}
                  onRestaurar={l.restaurar}
                  onAnadir={l.anadirCampo}
                />
              </TabsContent>
              <TabsContent value="vincular" className="mt-2">
                <ResolucionLector
                  resolucion={l.resolucion}
                  unidades={base.sugerencias?.unidades ?? []}
                  inquilinos={base.sugerencias?.inquilinos ?? []}
                  contexto={l.contexto.contexto}
                  disabled={!l.editable}
                  onUnidad={l.elegirUnidad}
                  onInquilino={l.elegirInquilino}
                />
              </TabsContent>
              <TabsContent value="comparar" className="mt-2">
                <ComparacionLector comparaciones={l.contexto.comparaciones} hayUnidad={!!l.resolucion.unidad_id} />
              </TabsContent>
              <TabsContent value="revision" className="mt-2">
                <HallazgosLector hallazgos={l.hallazgos} />
              </TabsContent>
            </div>
          </Tabs>

          {l.editable && (
            <BarraAccionesLector
              cambios={l.cambios}
              sucio={l.sucio}
              ocupado={l.ocupado}
              puedeConfirmar={l.puedeConfirmar}
              motivoBloqueo={motivo}
              onGuardar={() => void l.guardar()}
              onConfirmar={() => void l.confirmar()}
              onDescartar={() => window.confirm("¿Descartar este borrador? No se guardará nada en la base de datos.") && void l.descartar()}
            />
          )}
        </div>
      </div>
    </div>
  );
}
