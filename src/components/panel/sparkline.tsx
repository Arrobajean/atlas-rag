import { rutaSerie } from "@/lib/panel";
import { cn } from "@/lib/utils";

interface SparklineProps {
  valores: number[];
  className?: string;
  /** Texto para lectores de pantalla */
  etiqueta: string;
}

const ANCHO = 120;
const ALTO = 36;

/** Mini-gráfica de tendencia: línea con área suave; hereda el color del texto (`currentColor`). */
export function Sparkline({ valores, className, etiqueta }: SparklineProps) {
  const { linea, area } = rutaSerie(valores, ANCHO, ALTO);
  if (!linea) return null;
  return (
    <svg viewBox={`0 0 ${ANCHO} ${ALTO}`} role="img" aria-label={etiqueta} preserveAspectRatio="none" className={cn("h-9 w-full overflow-visible", className)}>
      <path d={area} fill="currentColor" opacity={0.1} />
      <path d={linea} fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
