import { AlertCircleIcon, CheckCircle2Icon, PencilIcon, QuoteIcon, RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectCampo } from "@/components/ui/select-campo";
import type { EstadoCampo } from "@/lib/lector-form";
import type { CampoCatalogo, DatoExtraido } from "@/lib/types";
import { cn } from "@/lib/utils";

type Valor = string | number | boolean | null | undefined;

const INSIGNIA: Record<EstadoCampo, { texto: string; clase: string; icono: React.ComponentType<{ className?: string }> } | null> = {
  ok: { texto: "Leído", clase: "text-emerald-600 dark:text-emerald-400", icono: CheckCircle2Icon },
  baja: { texto: "Revisar", clase: "text-amber-600 dark:text-amber-400", icono: TriangleAlertIcon },
  editado: { texto: "Editado", clase: "text-sky-600 dark:text-sky-400", icono: PencilIcon },
  error: { texto: "Error", clase: "text-destructive", icono: AlertCircleIcon },
  vacio: null,
};

interface Props {
  campo: CampoCatalogo;
  valor: Valor;
  dato: DatoExtraido | undefined;
  estado: EstadoCampo;
  error?: string;
  activo: boolean;
  disabled: boolean;
  onCambiar: (v: string | number | boolean | null) => void;
  onSeleccionar: () => void;
  onRestaurar: () => void;
}

function Entrada({ campo, valor, disabled, invalido, onCambiar, id }: Pick<Props, "campo" | "valor" | "disabled" | "onCambiar"> & { id: string; invalido: boolean }) {
  const comun = { id, disabled, "aria-invalid": invalido || undefined, "aria-describedby": `${id}-ayuda` };
  switch (campo.tipo_dato) {
    case "opcion":
      return <SelectCampo {...comun} value={String(valor ?? "")} placeholder="—" opciones={(campo.opciones ?? []).map((o) => [o, o.replace(/_/g, " ")] as const)} onChange={(v) => onCambiar(v || null)} />;
    case "booleano":
      return <SelectCampo {...comun} value={valor === true ? "true" : valor === false ? "false" : ""} placeholder="—" opciones={[["true", "Sí"], ["false", "No"]]} onChange={(v) => onCambiar(v === "" ? null : v === "true")} />;
    case "fecha":
      return <Input {...comun} type="date" value={String(valor ?? "")} onChange={(e) => onCambiar(e.target.value || null)} />;
    case "numero":
    case "moneda":
      return <Input {...comun} type="number" step="any" inputMode="decimal" value={valor === null || valor === undefined ? "" : String(valor)} onChange={(e) => onCambiar(e.target.value === "" ? null : Number(e.target.value))} />;
    default:
      return <Input {...comun} value={String(valor ?? "")} onChange={(e) => onCambiar(e.target.value || null)} />;
  }
}

/** Un dato del contrato: valor editable, confianza de la IA y cita del PDF que lo respalda. */
export function CampoLector({ campo, valor, dato, estado, error, activo, disabled, onCambiar, onSeleccionar, onRestaurar }: Props) {
  const id = `campo-${campo.clave}`;
  const insignia = INSIGNIA[estado];
  const puedeRestaurar = dato?.encontrado && estado === "editado";
  return (
    <div
      className={cn("space-y-1.5 rounded-lg border p-3 transition-colors", activo && "border-primary/60 bg-primary/5", estado === "baja" && "border-amber-500/40", estado === "error" && "border-destructive/50")}
      onFocusCapture={onSeleccionar}
    >
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-semibold">
          {campo.etiqueta}
          {campo.obligatorio && <span aria-label="obligatorio" className="ml-0.5 text-destructive">*</span>}
        </Label>
        <div className="flex items-center gap-1.5">
          {insignia && (
            <Badge variant="outline" className={cn("gap-1 border-transparent px-1.5", insignia.clase)}>
              <insignia.icono className="size-3" />
              {insignia.texto}
              {dato?.encontrado && estado !== "editado" && estado !== "error" && <span className="tabular-nums opacity-70">{Math.round(dato.confianza * 100)} %</span>}
            </Badge>
          )}
          {puedeRestaurar && (
            <Button type="button" variant="ghost" size="icon" className="size-6" onClick={onRestaurar} disabled={disabled} aria-label="Volver al valor leído por la IA" title="Volver al valor leído por la IA">
              <RotateCcwIcon className="size-3" />
            </Button>
          )}
        </div>
      </div>

      <Entrada campo={campo} valor={valor} disabled={disabled} invalido={estado === "error"} onCambiar={onCambiar} id={id} />

      <div id={`${id}-ayuda`} className="min-h-4 text-[11px]">
        {error ? (
          <p role="alert" className="text-destructive">{error}</p>
        ) : dato?.encontrado && dato.texto ? (
          <button type="button" onClick={onSeleccionar} className="flex w-full items-start gap-1 text-left text-muted-foreground hover:text-foreground">
            <QuoteIcon className="mt-0.5 size-3 shrink-0" />
            <span className="line-clamp-2">
              {dato.pagina ? <b className="font-medium">pág. {dato.pagina}: </b> : null}
              {dato.texto}
            </span>
          </button>
        ) : !dato?.encontrado && estado === "vacio" ? (
          <span className="text-muted-foreground">No aparece en el documento</span>
        ) : campo.ayuda ? (
          <span className="text-muted-foreground">{campo.ayuda}</span>
        ) : null}
      </div>
    </div>
  );
}
