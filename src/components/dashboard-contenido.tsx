"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * Contenedor de cada pantalla. Solo hay UN scroll por pantalla: las páginas normales lo llevan aquí;
 * el asistente ocupa todo el alto y reparte su propio scroll (mensajes) para que el campo de texto quede fijo abajo.
 */
export function DashboardContenido({ children }: { children: React.ReactNode }) {
  const pantallaCompleta = usePathname() === "/dashboard/chat";
  return (
    <div className={cn("min-h-0 flex-1", pantallaCompleta ? "flex flex-col overflow-hidden" : "overflow-y-auto")}>
      {pantallaCompleta ? children : <div className="mx-auto flex w-full max-w-[112rem] flex-col gap-6 p-4 md:p-6 2xl:px-10">{children}</div>}
    </div>
  );
}
