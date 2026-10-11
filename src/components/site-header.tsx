"use client";

import { LogOutIcon } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import { ServiceStatus } from "@/components/status/service-status";
import { useSesion } from "@/hooks/use-sesion";

export function SiteHeader() {
  const { rol, abierto, salir } = useSesion();
  return (
    <header className="sticky top-0 z-10 flex h-(--header-height) shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur-sm lg:px-6">
      <SidebarTrigger className="-ml-1" />

      <div className="flex items-center gap-1">
        <ServiceStatus />
        <ThemeToggle />
        {rol && !abierto && (
          <Badge variant="outline" className="mx-1 hidden capitalize sm:inline-flex">
            {rol}
          </Badge>
        )}
        {!abierto && (
          <Button variant="ghost" size="icon" onClick={salir} aria-label="Cerrar sesión" title="Cerrar sesión">
            <LogOutIcon className="size-4" />
          </Button>
        )}
      </div>
    </header>
  );
}
