import { ArrowDownIcon, ArrowUpIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EstadoBadge } from "@/components/propiedades/estado-badge";
import { dec, eur, num } from "@/lib/format";
import { operacion, tipoUnidad } from "@/lib/etiquetas";
import type { FiltrosPropiedades, PropiedadResumen } from "@/lib/types";

const COLUMNAS_ORDEN: { clave: string; etiqueta: string }[] = [
  { clave: "superficie", etiqueta: "m²" },
  { clave: "precio", etiqueta: "Precio" },
];

interface Props {
  items: PropiedadResumen[];
  total: number;
  filtros: FiltrosPropiedades;
  pagina: number;
  totalPaginas: number;
  onAbrir: (referencia: string) => void;
  onOrdenar: (orden: string) => void;
  onPagina: (p: number) => void;
}

export function TablaPropiedades({ items, total, filtros, pagina, totalPaginas, onAbrir, onOrdenar, onPagina }: Props) {
  const Flecha = filtros.direccion === "desc" ? ArrowDownIcon : ArrowUpIcon;
  const cabeceraOrden = (clave: string, etiqueta: string) => (
    <button type="button" onClick={() => onOrdenar(clave)} className="inline-flex items-center gap-1 hover:text-foreground" aria-label={`Ordenar por ${etiqueta}`}>
      {etiqueta}
      {filtros.orden === clave && <Flecha className="size-3" />}
    </button>
  );

  return (
    <div className="space-y-3">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref.</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead className="hidden md:table-cell">Zona</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">{cabeceraOrden(COLUMNAS_ORDEN[0].clave, COLUMNAS_ORDEN[0].etiqueta)}</TableHead>
              <TableHead className="text-right">{cabeceraOrden(COLUMNAS_ORDEN[1].clave, COLUMNAS_ORDEN[1].etiqueta)}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                  No hay propiedades con esos filtros.
                </TableCell>
              </TableRow>
            )}
            {items.map((p) => (
              <TableRow key={p.id} onClick={() => onAbrir(p.referencia)} className="cursor-pointer" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onAbrir(p.referencia)}>
                <TableCell className="font-mono text-xs">{p.referencia}</TableCell>
                <TableCell>
                  <div className="font-medium">{p.ubicacion}</div>
                  <div className="text-xs text-muted-foreground">{[p.barrio, p.municipio].filter(Boolean).join(" · ")}</div>
                </TableCell>
                <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{p.zona}</TableCell>
                <TableCell>
                  <div>{tipoUnidad(p.tipo)}</div>
                  <div className="text-xs text-muted-foreground">{operacion(p.operacion)}</div>
                </TableCell>
                <TableCell><EstadoBadge estado={p.estado} /></TableCell>
                <TableCell className="text-right tabular-nums">{dec(p.superficie_m2)}</TableCell>
                <TableCell className="text-right tabular-nums">
                  {eur(p.precio)}
                  {p.operacion !== "venta" && p.precio !== null && <span className="text-xs text-muted-foreground">/mes</span>}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{num(total)} propiedades</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" className="size-8" disabled={pagina <= 1} onClick={() => onPagina(pagina - 1)} aria-label="Página anterior">
            <ChevronLeftIcon className="size-4" />
          </Button>
          <span className="tabular-nums">Página {pagina} de {totalPaginas}</span>
          <Button variant="outline" size="icon" className="size-8" disabled={pagina >= totalPaginas} onClick={() => onPagina(pagina + 1)} aria-label="Página siguiente">
            <ChevronRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
