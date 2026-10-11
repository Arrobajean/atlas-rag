"use client";

import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CargandoBloques, ErrorCarga } from "@/components/panel/estado-carga";
import { VisorPdf } from "@/components/documentos/visor-pdf-lazy";
import { useDocumentoDetalle } from "@/hooks/use-documento-detalle";
import { tipoDocumento } from "@/lib/etiquetas";
import { fecha } from "@/lib/format";
import { cn } from "@/lib/utils";

export function DocumentoDetalle({ id, paginaInicial }: { id: number; paginaInicial: number }) {
  const { datos, loading, error, recargar, pagina, setPagina, total, setTotal } = useDocumentoDetalle(id, paginaInicial);

  if (loading && !datos) return <CargandoBloques n={3} />;
  if (error || !datos) return <ErrorCarga mensaje={error ?? "Documento no encontrado"} onReintentar={recargar} />;

  const { documento: d, archivo_url, chunks = [] } = datos;
  const esPdf = !!archivo_url && !!d.mime?.includes("pdf");

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Link href="/dashboard/documentos" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="size-3" /> Documentos
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{d.titulo}</h1>
          <Badge variant="outline">{tipoDocumento(d.tipo)}</Badge>
          {!d.vigente && <Badge variant="destructive">Sustituido</Badge>}
        </div>
        <p className="text-xs text-muted-foreground">
          {fecha(d.fecha_documento ?? d.created_at)} · {d.paginas ?? "?"} páginas · {chunks.length} fragmentos
        </p>
      </div>

      <div className={cn("grid gap-4", esPdf && "lg:grid-cols-2")}>
        {esPdf && (
          <div className="h-[75dvh] min-h-96">
            <VisorPdf url={archivo_url!} pagina={pagina} onPagina={setPagina} onTotal={setTotal} total={total} />
          </div>
        )}
        <ol className="max-h-[75dvh] space-y-2 overflow-y-auto pr-1" aria-label="Fragmentos indexados">
          {chunks.map((c) => (
            <li
              key={c.id}
              className={cn("rounded-lg border p-3", c.pagina === pagina && esPdf ? "border-primary/50 bg-primary/5" : "bg-muted/20")}
            >
              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-medium text-foreground/80">{c.seccion ?? `Fragmento ${c.orden}`}</span>
                {c.pagina && (
                  <button type="button" className="hover:text-primary" onClick={() => setPagina(c.pagina!)}>
                    pág. {c.pagina}
                  </button>
                )}
              </div>
              <p className="text-xs leading-relaxed whitespace-pre-wrap">{c.contenido}</p>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
