import { CheckIcon, Loader2Icon, SaveIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  cambios: number;
  sucio: boolean;
  ocupado: "guardar" | "confirmar" | "descartar" | null;
  puedeConfirmar: boolean;
  motivoBloqueo: string | null;
  onGuardar: () => void;
  onConfirmar: () => void;
  onDescartar: () => void;
}

export function BarraAccionesLector({ cambios, sucio, ocupado, puedeConfirmar, motivoBloqueo, onGuardar, onConfirmar, onDescartar }: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-background p-3">
      <div className="text-xs text-muted-foreground" aria-live="polite">
        {motivoBloqueo ? <span className="text-destructive">{motivoBloqueo}</span> : cambios > 0 ? `${cambios} campo${cambios > 1 ? "s" : ""} corregido${cambios > 1 ? "s" : ""} por ti` : "Sin correcciones"}
        {sucio && " · cambios sin guardar"}
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" size="sm" onClick={onDescartar} disabled={ocupado !== null} className="text-destructive hover:text-destructive">
          {ocupado === "descartar" ? <Loader2Icon className="mr-1.5 size-3.5 animate-spin" /> : <Trash2Icon className="mr-1.5 size-3.5" />} Descartar
        </Button>
        <Button variant="outline" size="sm" onClick={onGuardar} disabled={ocupado !== null || !sucio}>
          {ocupado === "guardar" ? <Loader2Icon className="mr-1.5 size-3.5 animate-spin" /> : <SaveIcon className="mr-1.5 size-3.5" />} Guardar borrador
        </Button>
        <Button size="sm" onClick={onConfirmar} disabled={!puedeConfirmar}>
          {ocupado === "confirmar" ? <Loader2Icon className="mr-1.5 size-3.5 animate-spin" /> : <CheckIcon className="mr-1.5 size-3.5" />} Confirmar y guardar
        </Button>
      </div>
    </div>
  );
}
