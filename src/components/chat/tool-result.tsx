import { celda } from "@/lib/format";
import type { Presentacion } from "@/lib/chat/types";

function Barras({ p }: { p: Extract<Presentacion, { tipo: "barras" }> }) {
  const max = Math.max(1, ...p.datos.map((d) => d.valor));
  return (
    <div className="space-y-1.5">
      {p.datos.map((d) => (
        <div key={d.etiqueta} className="grid grid-cols-[minmax(90px,150px)_1fr_auto] items-center gap-2 text-xs">
          <span className="truncate text-muted-foreground">{d.etiqueta}</span>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(d.valor / max) * 100}%` }} />
          </div>
          <span className="tabular-nums font-medium">{d.valor}</span>
        </div>
      ))}
    </div>
  );
}

function Tabla({ p }: { p: Extract<Presentacion, { tipo: "tabla" }> }) {
  if (p.filas.length === 0) return <p className="text-xs text-muted-foreground">Sin resultados.</p>;
  return (
    <div className="-ml-6 overflow-x-auto">
      <table className="w-full border-separate border-spacing-x-6 text-sm">
        <thead>
          <tr>
            {p.columnas.map((c) => (
              <th key={c.clave} className="border-b border-foreground/15 py-2.5 text-left font-normal whitespace-nowrap text-muted-foreground">{c.etiqueta}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.filas.map((f, i) => (
            <tr key={i}>
              {p.columnas.map((c) => (
                <td key={c.clave} className={`border-b border-foreground/15 py-3 align-top first:font-semibold ${c.formato === "moneda" || c.formato === "numero" ? "tabular-nums text-right" : ""}`}>
                  {celda(f[c.clave], c.formato)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {p.total !== undefined && p.total > p.filas.length && (
        <p className="ml-6 pt-2 text-xs text-muted-foreground">
          Mostrando {p.filas.length} de {p.total}
        </p>
      )}
    </div>
  );
}

/** Resultado de una consulta a la base de datos: tabla o barras, con título. */
export function ToolResult({ presentacion }: { presentacion: Presentacion }) {
  return (
    <figure className="space-y-2">
      <figcaption className="text-lg font-medium tracking-tight">{presentacion.titulo}</figcaption>
      {presentacion.tipo === "barras" ? <Barras p={presentacion} /> : <Tabla p={presentacion} />}
    </figure>
  );
}
