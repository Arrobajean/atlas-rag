/* eslint-disable @next/next/no-img-element -- las miniaturas son blob: locales; next/image no aporta nada */
import { FileTextIcon, XIcon } from "lucide-react";
import { esImagen, type AdjuntoVista } from "@/lib/chat/adjuntos-tipos";
import { cn } from "@/lib/utils";

interface AdjuntosChipsProps {
  adjuntos: (AdjuntoVista & { id?: string })[];
  /** Si se pasa, cada archivo muestra un botón para quitarlo. */
  onQuitar?: (id: string) => void;
  className?: string;
}

/** Archivos adjuntos como «píldoras» con miniatura (imágenes) o icono (PDF). */
export function AdjuntosChips({ adjuntos, onQuitar, className }: AdjuntosChipsProps) {
  if (adjuntos.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap gap-2", className)} aria-label="Archivos adjuntos">
      {adjuntos.map((a, i) => (
        <li key={a.id ?? `${a.nombre}-${i}`} className="group/chip relative flex max-w-52 items-center gap-2 rounded-xl border bg-background/60 py-1 pr-3 pl-1 text-xs">
          {esImagen(a.mime) && a.previewUrl ? (
            <img src={a.previewUrl} alt="" className="size-9 shrink-0 rounded-lg object-cover" />
          ) : (
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <FileTextIcon className="size-4" />
            </span>
          )}
          <span className="min-w-0 truncate font-medium text-foreground/80">{a.nombre}</span>
          {onQuitar && a.id && (
            <button
              type="button"
              onClick={() => onQuitar(a.id!)}
              aria-label={`Quitar ${a.nombre}`}
              className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-xs transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            >
              <XIcon className="size-3" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
