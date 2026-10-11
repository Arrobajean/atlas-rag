import { AlertCircleIcon, CheckIcon, DatabaseIcon, FileSearchIcon, Loader2Icon, ShieldCheckIcon } from "lucide-react";
import AIReasoning from "@/components/smoothui/ai-reasoning";
import type { EjecucionHerramienta } from "@/lib/chat/types";

const DE_DOCUMENTOS = new Set(["buscar_en_documentos"]);

function Icono({ paso }: { paso: EjecucionHerramienta }) {
  if (paso.estado === "ejecutando") return <Loader2Icon className="size-3 animate-spin text-primary" />;
  if (paso.estado === "error") return <AlertCircleIcon className="size-3 text-destructive" />;
  return <CheckIcon className="size-3 text-emerald-500" />;
}

/** Razonamiento del asistente: qué consultó (base de datos o documentos). Plegado al terminar; se puede desplegar. */
export function ToolSteps({ pasos, enCurso }: { pasos: EjecucionHerramienta[]; enCurso: boolean }) {
  if (pasos.length === 0) return null;
  return (
    <AIReasoning isStreaming={enCurso}>
      <ul className="space-y-2 py-1" aria-label="Consultas realizadas">
        {pasos.map((p) => {
          const Tipo = p.nombre === "revisar_adjuntos" ? ShieldCheckIcon : DE_DOCUMENTOS.has(p.nombre) ? FileSearchIcon : DatabaseIcon;
          return (
            <li key={p.id} className="flex items-start gap-2 text-xs leading-snug">
              <Tipo className="mt-0.5 size-3 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-medium text-foreground/80">{p.descripcion}</p>
                {p.resumen && <p>{p.resumen}</p>}
              </div>
              <span className="mt-0.5">
                <Icono paso={p} />
              </span>
            </li>
          );
        })}
      </ul>
    </AIReasoning>
  );
}
