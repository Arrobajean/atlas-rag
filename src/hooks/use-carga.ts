"use client";

import * as React from "react";
import { errorMessage } from "@/lib/api";

export interface EstadoCarga<T> {
  datos: T | null;
  loading: boolean;
  error: string | null;
  recargar: () => void;
}

/**
 * Carga asíncrona con cancelación al desmontar o cambiar las dependencias.
 * `cargar` debe ser estable (useCallback) o depender solo de `deps`.
 */
export function useCarga<T>(cargar: () => Promise<T>, deps: React.DependencyList): EstadoCarga<T> {
  const [datos, setDatos] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [version, setVersion] = React.useState(0);

  React.useEffect(() => {
    let cancelado = false;
    cargar()
      .then((d) => {
        if (cancelado) return;
        setDatos(d);
        setError(null);
      })
      .catch((err) => !cancelado && setError(errorMessage(err, "No se pudieron cargar los datos")))
      .finally(() => !cancelado && setLoading(false));
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version]);

  const recargar = React.useCallback(() => {
    setLoading(true);
    setVersion((v) => v + 1);
  }, []);

  return { datos, loading, error, recargar };
}
