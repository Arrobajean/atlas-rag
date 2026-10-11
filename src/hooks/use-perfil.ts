"use client";

import * as React from "react";
import { guardarNombre, leerNombre, NOMBRE_POR_DEFECTO } from "@/lib/perfil";

/** Nombre del usuario mostrado en el sidebar. Se lee tras montar para no desajustar la hidratación. */
export function usePerfil() {
  const [nombre, setNombreEstado] = React.useState(NOMBRE_POR_DEFECTO);

  React.useEffect(() => {
    let cancelado = false;
    Promise.resolve().then(() => {
      if (!cancelado) setNombreEstado(leerNombre());
    });
    return () => {
      cancelado = true;
    };
  }, []);

  const setNombre = React.useCallback((n: string) => {
    const limpio = n.trim() || NOMBRE_POR_DEFECTO;
    guardarNombre(limpio);
    setNombreEstado(limpio);
  }, []);

  return { nombre, setNombre };
}
