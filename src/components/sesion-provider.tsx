"use client";

import * as React from "react";
import { SesionProviderContext, useSesionProvider } from "@/hooks/use-sesion";

export function SesionProvider({ children }: { children: React.ReactNode }) {
  const sesion = useSesionProvider();
  return <SesionProviderContext.Provider value={sesion}>{children}</SesionProviderContext.Provider>;
}
