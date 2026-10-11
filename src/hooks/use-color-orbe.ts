"use client";

import { useTheme } from "next-themes";

/** El canvas no entiende variables CSS: se elige un índigo según el tema (próximo a --primary). */
export function useColorOrbe() {
  const { resolvedTheme } = useTheme();
  return resolvedTheme === "dark" ? "#818cf8" : "#4f46e5";
}
