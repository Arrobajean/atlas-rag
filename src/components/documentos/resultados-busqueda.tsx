import Link from "next/link";
import { XIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { extracto } from "@/lib/citations";
import { tipoDocumento } from "@/lib/etiquetas";
import type { ResultadoBusqueda } from "@/lib/types";

export function ResultadosBusqueda({ resultados, onCerrar }: { resultados: ResultadoBusqueda[]; onCerrar: () => void }) {
  return (
    <section aria-label="Resultados de la búsqueda" className="space-y-2 rounded-lg border bg-muted/20 p-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {resultados.length} fragmentos relevantes (búsqueda híbrida: significado + palabras)
        </h2>
        <Button variant="ghost" size="icon" className="size-7" onClick={onCerrar} aria-label="Cerrar resultados">
          <XIcon className="size-4" />
        </Button>
      </div>
      {resultados.length === 0 && <p className="text-sm text-muted-foreground">Sin resultados para esa consulta.</p>}
      <ul className="space-y-2">
        {resultados.map((r) => (
          <li key={r.chunk_id} className="rounded-md border bg-background p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={`/dashboard/documentos/${r.documento_id}${r.pagina ? `?pagina=${r.pagina}` : ""}`} className="text-sm font-medium hover:underline">
                {r.titulo}
                {r.pagina ? <span className="font-normal text-muted-foreground"> · pág. {r.pagina}</span> : null}
              </Link>
              <div className="flex gap-1">
                <Badge variant="outline">{tipoDocumento(r.tipo)}</Badge>
                {!r.vigente && <Badge variant="destructive">Sustituido</Badge>}
                {r.similitud !== null && <Badge variant="secondary">{(r.similitud * 100).toFixed(0)} %</Badge>}
              </div>
            </div>
            {r.seccion && <p className="mt-1 text-[11px] font-medium text-primary">{r.seccion}</p>}
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{extracto(r.contenido, 340)}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
