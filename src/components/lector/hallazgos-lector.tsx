import { AlertOctagonIcon, InfoIcon, ShieldCheckIcon, TriangleAlertIcon } from "lucide-react";
import type { Hallazgo } from "@/lib/types";
import { cn } from "@/lib/utils";

const ESTILO = {
  alta: { icono: AlertOctagonIcon, clase: "border-red-500/40 bg-red-500/5", texto: "text-red-600 dark:text-red-400" },
  media: { icono: TriangleAlertIcon, clase: "border-amber-500/40 bg-amber-500/5", texto: "text-amber-600 dark:text-amber-400" },
  info: { icono: InfoIcon, clase: "border-sky-500/30 bg-sky-500/5", texto: "text-sky-600 dark:text-sky-400" },
} as const;

/** Revisor de cláusulas: reglas legales deterministas con su referencia. Orientativo, no es asesoramiento jurídico. */
export function HallazgosLector({ hallazgos }: { hallazgos: Hallazgo[] }) {
  if (hallazgos.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">
        <ShieldCheckIcon className="size-4" /> Sin hallazgos con los datos actuales.
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {hallazgos.map((h) => {
          const e = ESTILO[h.severidad];
          return (
            <li key={h.regla} className={cn("rounded-lg border p-3", e.clase)}>
              <p className={cn("flex items-start gap-2 text-sm font-medium", e.texto)}>
                <e.icono className="mt-0.5 size-4 shrink-0" /> {h.titulo}
              </p>
              <p className="mt-1 pl-6 text-xs leading-relaxed text-foreground/80">{h.detalle}</p>
              {h.referencia_legal && <p className="mt-1 pl-6 text-[11px] font-medium text-muted-foreground">{h.referencia_legal}</p>}
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted-foreground">Revisión orientativa según reglas de la LAU y la Ley 12/2023; no constituye asesoramiento jurídico.</p>
    </div>
  );
}
