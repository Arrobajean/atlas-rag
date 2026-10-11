"use client";

import * as React from "react";
import { SettingsIcon } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ConfiguracionDialog } from "@/components/configuracion-dialog";
import { usePerfil } from "@/hooks/use-perfil";
import { useSesion } from "@/hooks/use-sesion";
import { etiquetaRol, iniciales } from "@/lib/perfil";

/** Pie del sidebar: avatar, nombre, rol y acceso a la configuración. */
export function SidebarUsuario() {
  const { nombre, setNombre } = usePerfil();
  const { rol, abierto, salir } = useSesion();
  const [abierta, setAbierta] = React.useState(false);

  return (
    <>
      <div className="flex items-center gap-2.5 rounded-lg p-1">
        <Avatar className="size-9 border">
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{iniciales(nombre)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold leading-tight">{nombre}</p>
          <p className="truncate text-[11px] text-muted-foreground">{etiquetaRol(rol, abierto)}</p>
        </div>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" className="size-8 text-muted-foreground" onClick={() => setAbierta(true)} aria-label="Configuración" />}>
            <SettingsIcon className="size-4" />
          </TooltipTrigger>
          <TooltipContent>Configuración</TooltipContent>
        </Tooltip>
      </div>
      <ConfiguracionDialog open={abierta} onOpenChange={setAbierta} nombre={nombre} onNombre={setNombre} rol={rol} abierto={abierto} onSalir={salir} />
    </>
  );
}
