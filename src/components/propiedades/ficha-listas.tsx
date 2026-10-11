import Link from "next/link";
import { FileTextIcon, UserRoundIcon, WrenchIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { eur, fecha } from "@/lib/format";
import { tipoDocumento } from "@/lib/etiquetas";
import type { FichaPropiedad } from "@/lib/types";

function Titulo({ icono: Icono, children }: { icono: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase">
      <Icono className="size-3.5" />
      {children}
    </h3>
  );
}

export function FichaDocumentos({ documentos }: { documentos: FichaPropiedad["documentos"] }) {
  return (
    <section className="space-y-2" aria-label="Documentos">
      <Titulo icono={FileTextIcon}>Documentos ({documentos.length})</Titulo>
      {documentos.length === 0 && <p className="text-sm text-muted-foreground">Sin documentos vinculados.</p>}
      <ul className="space-y-1">
        {documentos.map((d) => (
          <li key={d.id}>
            <Link href={`/dashboard/documentos/${d.id}`} className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
              <span className="truncate">{d.titulo}</span>
              <span className="flex shrink-0 gap-1">
                <Badge variant="outline">{tipoDocumento(d.tipo)}</Badge>
                {!d.vigente && <Badge variant="destructive">Sustituido</Badge>}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FichaIncidencias({ incidencias }: { incidencias: FichaPropiedad["incidencias"] }) {
  if (incidencias.length === 0) return null;
  return (
    <section className="space-y-2" aria-label="Incidencias">
      <Titulo icono={WrenchIcon}>Incidencias recientes</Titulo>
      <ul className="space-y-1 text-sm">
        {incidencias.map((i, n) => (
          <li key={n} className="flex items-center justify-between gap-2 rounded-md border px-3 py-1.5">
            <span className="truncate">{String(i.descripcion)}</span>
            <span className="shrink-0 text-xs text-muted-foreground">{String(i.estado)} · {fecha(String(i.apertura))}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FichaClientes({ clientes }: { clientes: FichaPropiedad["clientes_interesados"] }) {
  if (clientes.length === 0) return null;
  return (
    <section className="space-y-2" aria-label="Clientes interesados">
      <Titulo icono={UserRoundIcon}>Clientes a los que encaja ({clientes.length})</Titulo>
      <ul className="space-y-1">
        {clientes.map((c) => (
          <li key={c.cliente_id} className="rounded-md border px-3 py-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="font-medium">{c.cliente}</span>
              <Badge variant="secondary" className="tabular-nums">{c.puntuacion} / 100</Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {c.telefono} · hasta {eur(c.presupuesto_max)} · {c.motivos.join(" · ")}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
