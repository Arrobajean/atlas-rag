import { CheckIcon, MinusIcon, XIcon } from "lucide-react";
import type { Comparacion } from "@/lib/types";
import { cn } from "@/lib/utils";

const ICONO = { coincide: CheckIcon, difiere: XIcon, sin_dato: MinusIcon };
const CLASE = { coincide: "text-emerald-500", difiere: "text-destructive", sin_dato: "text-muted-foreground" };
const TEXTO = { coincide: "Coincide", difiere: "Difiere", sin_dato: "Sin dato" };

/** PDF frente a base de datos: sirve para detectar que el contrato no corresponde a la unidad elegida. */
export function ComparacionLector({ comparaciones, hayUnidad }: { comparaciones: Comparacion[]; hayUnidad: boolean }) {
  if (!hayUnidad) return <p className="text-sm text-muted-foreground">Elige la unidad en «Vincular» para comparar con lo que hay en la base de datos.</p>;
  const difieren = comparaciones.filter((c) => c.estado === "difiere").length;
  return (
    <div className="space-y-3">
      <p className={cn("rounded-md px-3 py-2 text-xs", difieren ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400")}>
        {difieren ? `${difieren} dato${difieren > 1 ? "s" : ""} del PDF no coinciden con la base de datos: comprueba que es la unidad correcta.` : "Los datos del PDF coinciden con la base de datos."}
      </p>
      <ul className="divide-y rounded-lg border">
        {comparaciones.map((c) => {
          const Icono = ICONO[c.estado];
          return (
            <li key={c.clave} className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 p-3 text-sm">
              <Icono className={cn("mt-0.5 size-4", CLASE[c.estado])} aria-label={TEXTO[c.estado]} />
              <div>
                <p className="text-xs font-medium">{c.etiqueta}</p>
                <p className="text-xs text-muted-foreground">PDF: <span className="text-foreground">{c.pdf ?? "—"}</span></p>
                <p className="text-xs text-muted-foreground">Base de datos: <span className="text-foreground">{c.bd ?? "—"}</span></p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
