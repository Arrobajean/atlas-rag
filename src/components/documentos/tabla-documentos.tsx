import Link from "next/link";
import { Loader2Icon, ScanTextIcon, Trash2Icon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileKindIcon } from "@/components/documents/file-kind";
import { fecha } from "@/lib/format";
import { tipoDocumento } from "@/lib/etiquetas";
import type { Documento } from "@/lib/types";

const ESTADO_INDEXADO: Record<Documento["estado_indexado"], { texto: string; clase: string }> = {
  indexado: { texto: "Indexado", clase: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
  procesando: { texto: "Procesando", clase: "bg-sky-500/10 text-sky-600" },
  pendiente: { texto: "Pendiente", clase: "bg-muted text-muted-foreground" },
  error: { texto: "Error", clase: "bg-destructive/10 text-destructive" },
};

function vinculo(d: Documento) {
  return [d.contrato_ref, d.unidad_ref, d.edificio?.direccion].filter(Boolean)[0] ?? "General";
}

interface Props {
  documentos: Documento[];
  leyendo: number | null;
  esAdmin?: boolean;
  onLeer: (id: number) => void;
  onAbrirLector: (extraccionId: number) => void;
  onEliminar: (d: Documento) => void;
}

export function TablaDocumentos({ documentos, leyendo, onLeer, onAbrirLector, onEliminar }: Props) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Documento</TableHead>
            <TableHead className="hidden sm:table-cell">Tipo</TableHead>
            <TableHead className="hidden lg:table-cell">Vinculado a</TableHead>
            <TableHead className="hidden md:table-cell">Fecha</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-24 text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentos.map((d) => {
            const estado = ESTADO_INDEXADO[d.estado_indexado];
            return (
              <TableRow key={d.id}>
                <TableCell className="max-w-72">
                  <Link href={`/dashboard/documentos/${d.id}`} className="flex items-center gap-2 font-medium hover:underline">
                    <FileKindIcon source={d.mime?.includes("pdf") ? "x.pdf" : d.mime?.includes("markdown") ? "x.md" : "x.txt"} />
                    <span className="truncate">{d.titulo}</span>
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {d.fragmentos} fragmentos{d.paginas ? ` · ${d.paginas} pág.` : ""}
                  </p>
                </TableCell>
                <TableCell className="hidden sm:table-cell">
                  <Badge variant="outline">{tipoDocumento(d.tipo)}</Badge>
                </TableCell>
                <TableCell className="hidden max-w-48 truncate text-xs text-muted-foreground lg:table-cell">{vinculo(d)}</TableCell>
                <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{fecha(d.fecha_documento ?? d.created_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    <Badge className={`border-transparent ${estado.clase}`} title={d.error ?? undefined}>{estado.texto}</Badge>
                    {!d.vigente && <Badge variant="destructive">Sustituido</Badge>}
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {d.tipo === "contrato" && d.tiene_archivo && d.estado_indexado === "indexado" && (
                      <Button variant="ghost" size="icon" className="size-8" disabled={leyendo !== null} onClick={() => (d.extraccion ? onAbrirLector(d.extraccion.id) : onLeer(d.id))} aria-label={d.extraccion ? "Abrir en el lector" : "Leer con IA"} title={d.extraccion ? "Abrir en el lector" : "Leer con IA"}>
                        {leyendo === d.id ? <Loader2Icon className="size-4 animate-spin" /> : <ScanTextIcon className="size-4" />}
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="size-8 hover:text-destructive" onClick={() => onEliminar(d)} aria-label={`Eliminar ${d.titulo}`}>
                      <Trash2Icon className="size-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
