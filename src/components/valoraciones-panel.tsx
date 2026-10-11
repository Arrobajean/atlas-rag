"use client";

import * as React from "react";
import { ChevronLeftIcon, ChevronRightIcon, ShieldAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SelectCampo } from "@/components/ui/select-campo";
import { CargandoBloques, ErrorCarga } from "@/components/panel/estado-carga";
import { ValoracionItem } from "@/components/valoraciones/valoracion-item";
import { useSesion } from "@/hooks/use-sesion";
import { useValoraciones } from "@/hooks/use-valoraciones";
import { fecha, pct } from "@/lib/format";

const MOTIVOS = {
  manipulacion: "Manipulación", formato: "Cambio de formato", fuera_de_alcance: "Fuera de alcance", demasiado_largo: "Muy largo",
  adjunto_sospechoso: "Archivo sospechoso", adjunto_invalido: "Archivo no válido",
} as const;

function Cifra({ titulo, valor, detalle }: { titulo: string; valor: string; detalle?: string }) {
  return (
    <Card className="shadow-xs">
      <CardContent className="space-y-1 p-4">
        <p className="text-xs font-medium text-muted-foreground">{titulo}</p>
        <p className="text-2xl font-semibold tabular-nums">{valor}</p>
        {detalle && <p className="text-xs text-muted-foreground">{detalle}</p>}
      </CardContent>
    </Card>
  );
}

export function ValoracionesPanel() {
  const { esAdmin, rol } = useSesion();
  const v = useValoraciones();
  const [ahora] = React.useState(() => Date.now());

  // Mientras se conoce el rol no se muestra nada; un gestor no ve estos datos (la API también lo impide)
  if (rol && !esAdmin) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        <ShieldAlertIcon className="size-5" /> Esta pantalla es solo para administradores.
      </div>
    );
  }
  if (v.loading && !v.datos) return <CargandoBloques n={3} />;
  if (v.error || !v.datos) return <ErrorCarga mensaje={v.error ?? "Sin datos"} onReintentar={v.recargar} />;

  const { resumen, items, acciones, bloqueos, total } = v.datos;
  const porcentajeUtil = resumen.total ? (100 * resumen.utiles) / resumen.total : null;

  return (
    <div className="space-y-8">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Cifra titulo="Valoraciones" valor={String(resumen.total)} />
        <Cifra titulo="Respuestas útiles" valor={pct(porcentajeUtil)} detalle={`${resumen.utiles} 👍`} />
        <Cifra titulo="Mejorables" valor={String(resumen.mejorables)} detalle="👎 a revisar" />
        <Cifra titulo="Con comentario" valor={String(resumen.con_comentario)} detalle="dicen qué falló" />
      </div>

      <section className="space-y-3" aria-label="Respuestas valoradas">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold">Respuestas valoradas</h2>
          <SelectCampo aria-label="Filtrar por voto" className="w-48" value={v.voto} placeholder="Todas" opciones={[["down", "Solo mejorables 👎"], ["up", "Solo útiles 👍"]]} onChange={v.cambiarVoto} />
        </div>
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">Todavía no hay valoraciones. Aparecerán cuando alguien pulse 👍 o 👎 bajo una respuesta del asistente.</p>
        ) : (
          <ul className={`space-y-2 ${v.loading ? "opacity-60" : ""}`}>
            {items.map((i) => (
              <ValoracionItem key={i.id} v={i} ahora={ahora} />
            ))}
          </ul>
        )}
        {total > 25 && (
          <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
            <Button variant="outline" size="icon" className="size-8" disabled={v.pagina <= 1} onClick={() => v.setPagina(v.pagina - 1)} aria-label="Página anterior">
              <ChevronLeftIcon className="size-4" />
            </Button>
            <span className="tabular-nums">Página {v.pagina} de {v.totalPaginas}</span>
            <Button variant="outline" size="icon" className="size-8" disabled={v.pagina >= v.totalPaginas} onClick={() => v.setPagina(v.pagina + 1)} aria-label="Página siguiente">
              <ChevronRightIcon className="size-4" />
            </Button>
          </div>
        )}
      </section>

      <section className="space-y-3" aria-label="Acciones del asistente">
        <h2 className="text-sm font-semibold">Acciones que ha ejecutado el asistente (tras confirmación)</h2>
        {acciones.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no se ha confirmado ninguna acción.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {acciones.map((a) => (
              <li key={a.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                <span>{a.valor_nuevo?.resumen ?? a.tabla}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{fecha(a.created_at)}{a.usuario ? ` · ${a.usuario}` : ""}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-label="Intentos bloqueados">
        <h2 className="text-sm font-semibold">Intentos bloqueados por las barreras del asistente</h2>
        {bloqueos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Ningún mensaje ha sido bloqueado.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {bloqueos.map((b) => (
              <li key={b.id} className="flex items-start justify-between gap-3 p-3 text-sm">
                <span className="min-w-0">
                  <span className="mr-2 rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium">{MOTIVOS[b.motivo]}</span>
                  <span className="break-words">{b.mensaje}</span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{fecha(b.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
