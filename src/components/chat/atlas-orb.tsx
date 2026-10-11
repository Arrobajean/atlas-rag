"use client";

import MatrixOrb, { type MatrixOrbState } from "@/components/ui/matrix-orb";
import { useColorOrbe } from "@/hooks/use-color-orbe";
import { cn } from "@/lib/utils";

interface AtlasOrbProps {
  state: MatrixOrbState;
  size: number;
  /** Texto accesible del estado; se oculta a la vista */
  etiqueta: string;
  className?: string;
}

/** Orbe de puntos del asistente con el color del tema. */
export function AtlasOrb({ state, size, etiqueta, className }: AtlasOrbProps) {
  const color = useColorOrbe();
  return (
    <MatrixOrb
      state={state}
      size={size}
      dots={size < 64 ? 7 : 11}
      color={color}
      labels={{ [state]: etiqueta }}
      className={cn("gap-0 [&>span]:sr-only", className)}
    />
  );
}
