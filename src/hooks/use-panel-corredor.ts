"use client";

import { getPanelCorredor } from "@/lib/api";
import { useCarga } from "@/hooks/use-carga";

/** Bloques del panel del corredor; se cargan aparte de los KPIs para que el panel base no espere. */
export function usePanelCorredor() {
  return useCarga(getPanelCorredor, []);
}
