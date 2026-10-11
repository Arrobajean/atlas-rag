"use client";

import * as React from "react";
import { listarValoraciones } from "@/lib/api";
import { useCarga } from "@/hooks/use-carga";

/** Valoraciones de las respuestas del asistente (solo administradores) con filtro por voto y paginación. */
export function useValoraciones() {
  const [voto, setVoto] = React.useState("");
  const [pagina, setPagina] = React.useState(1);
  const estado = useCarga(() => listarValoraciones({ voto: voto || undefined, pagina }), [voto, pagina]);

  const cambiarVoto = React.useCallback((v: string) => {
    setVoto(v);
    setPagina(1);
  }, []);

  const totalPaginas = Math.max(1, Math.ceil((estado.datos?.total ?? 0) / 25));
  return { ...estado, voto, cambiarVoto, pagina, setPagina, totalPaginas };
}
