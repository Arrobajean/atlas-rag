"use client";

import { getResumen } from "@/lib/api";
import { useCarga } from "@/hooks/use-carga";

export function useResumen() {
  return useCarga(getResumen, []);
}
