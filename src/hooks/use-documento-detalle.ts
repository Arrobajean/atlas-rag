"use client";

import * as React from "react";
import { getDocumento } from "@/lib/api";
import { useCarga } from "@/hooks/use-carga";

/** Documento con su URL temporal y fragmentos, más la página visible en el visor. */
export function useDocumentoDetalle(id: number, paginaInicial = 1) {
  const estado = useCarga(() => getDocumento(id, true), [id]);
  const [pagina, setPagina] = React.useState(Math.max(1, paginaInicial));
  const [total, setTotal] = React.useState(0);

  const irA = React.useCallback((p: number) => setPagina((actual) => Math.min(Math.max(1, p), total || Math.max(1, p, actual))), [total]);

  return { ...estado, pagina, setPagina: irA, total, setTotal };
}
