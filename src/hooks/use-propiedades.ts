"use client";

import * as React from "react";
import { getPropiedad, listarPropiedades } from "@/lib/api";
import { useCarga } from "@/hooks/use-carga";
import type { FiltrosPropiedades } from "@/lib/types";

/** Lista filtrable y paginada de propiedades. Cambiar un filtro vuelve a la página 1. */
export function usePropiedades(inicial: FiltrosPropiedades = {}) {
  const [filtros, setFiltros] = React.useState<FiltrosPropiedades>({ orden: "referencia", ...inicial });
  const clave = JSON.stringify(filtros);
  const estado = useCarga(() => listarPropiedades(filtros), [clave]);

  const cambiar = React.useCallback((cambios: Partial<FiltrosPropiedades>) => {
    setFiltros((f) => ({ ...f, ...cambios, pagina: "pagina" in cambios ? cambios.pagina : 1 }));
  }, []);

  const limpiar = React.useCallback(() => setFiltros({ orden: "referencia" }), []);
  const hayFiltros = Object.entries(filtros).some(([k, v]) => !["orden", "direccion", "pagina"].includes(k) && v !== undefined && v !== "");

  const pagina = filtros.pagina ?? 1;
  const totalPaginas = Math.max(1, Math.ceil((estado.datos?.total ?? 0) / 25));

  return { ...estado, filtros, cambiar, limpiar, hayFiltros, pagina, totalPaginas };
}

/** Ficha completa de una propiedad (se carga al abrirla). */
export function useFichaPropiedad(referencia: string | null) {
  return useCarga(() => (referencia ? getPropiedad(referencia) : Promise.resolve(null)), [referencia]);
}
