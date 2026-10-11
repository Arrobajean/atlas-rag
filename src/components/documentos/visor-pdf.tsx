"use client";

import * as React from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import { ChevronLeftIcon, ChevronRightIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAncho } from "@/hooks/use-ancho";
import { htmlDeTrozo } from "@/lib/resaltado";

// El worker se sirve desde /public (lo copia scripts/copy-pdf-worker.mjs para que coincida con la versión instalada)
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

interface Props {
  url: string;
  pagina: number;
  onPagina: (p: number) => void;
  onTotal: (n: number) => void;
  total: number;
  /** Cita literal a resaltar en la página actual. */
  resaltar?: string | null;
}

/** Visor de PDF con navegación por páginas y resaltado del texto que respalda un dato. */
export default function VisorPdf({ url, pagina, onPagina, onTotal, total, resaltar }: Props) {
  const { ref, ancho } = useAncho<HTMLDivElement>();
  const [error, setError] = React.useState<string | null>(null);
  const renderer = React.useCallback(({ str }: { str: string }) => htmlDeTrozo(str, resaltar), [resaltar]);

  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg border bg-muted/30">
      <div className="flex items-center justify-between border-b bg-background px-3 py-1.5 text-xs">
        <Button variant="ghost" size="icon" className="size-7" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)} aria-label="Página anterior">
          <ChevronLeftIcon className="size-4" />
        </Button>
        <span className="tabular-nums">
          Página {pagina}
          {total ? ` de ${total}` : ""}
        </span>
        <Button variant="ghost" size="icon" className="size-7" disabled={total > 0 && pagina >= total} onClick={() => onPagina(pagina + 1)} aria-label="Página siguiente">
          <ChevronRightIcon className="size-4" />
        </Button>
      </div>

      <div ref={ref} className="min-h-0 flex-1 overflow-auto p-2">
        {error ? (
          <p role="alert" className="p-4 text-sm text-destructive">{error}</p>
        ) : (
          <Document
            file={url}
            onLoadSuccess={({ numPages }) => onTotal(numPages)}
            onLoadError={(e) => setError(`No se pudo mostrar el PDF: ${e.message}`)}
            loading={<div className="flex justify-center py-16"><Loader2Icon className="size-5 animate-spin text-primary" /></div>}
          >
            {ancho > 0 && (
              <Page
                pageNumber={pagina}
                width={Math.max(280, ancho - 16)}
                renderAnnotationLayer={false}
                customTextRenderer={renderer}
                className="mx-auto overflow-hidden rounded bg-white shadow"
              />
            )}
          </Document>
        )}
      </div>
    </div>
  );
}
