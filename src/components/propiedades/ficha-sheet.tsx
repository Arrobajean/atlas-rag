"use client";

import { Loader2Icon } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { EstadoBadge } from "@/components/propiedades/estado-badge";
import { FichaContrato } from "@/components/propiedades/ficha-contrato";
import { FichaDatos } from "@/components/propiedades/ficha-datos";
import { FichaClientes, FichaDocumentos, FichaIncidencias } from "@/components/propiedades/ficha-listas";
import { ErrorCarga } from "@/components/panel/estado-carga";
import { useFichaPropiedad } from "@/hooks/use-propiedades";

/** Ficha lateral de una propiedad. Se monta solo con una referencia abierta. */
export function FichaSheet({ referencia, onClose }: { referencia: string | null; onClose: () => void }) {
  const { datos: ficha, loading, error, recargar } = useFichaPropiedad(referencia);
  const u = ficha?.unidad as Record<string, unknown> | undefined;

  return (
    <Sheet open={referencia !== null} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full data-[side=right]:sm:max-w-2xl">
        <SheetHeader className="border-b">
          <SheetTitle className="flex items-center gap-2 pr-8">
            <span className="truncate">{u ? String(u.ubicacion) : referencia}</span>
            {u && <EstadoBadge estado={String(u.estado)} />}
          </SheetTitle>
          <SheetDescription className="text-xs">
            {u ? `${referencia} · ${u.municipio}${u.distrito ? ` · ${u.distrito}` : ""} · ${u.zona}` : "Cargando ficha…"}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="min-h-0 flex-1 px-4 pb-6">
          {loading && !ficha ? (
            <div className="flex justify-center py-16">
              <Loader2Icon className="size-5 animate-spin text-primary" />
            </div>
          ) : error || !ficha ? (
            <ErrorCarga mensaje={error ?? "No se encontró la propiedad"} onReintentar={recargar} />
          ) : (
            <div className="space-y-6 pt-4">
              <FichaDatos ficha={ficha} />
              <FichaContrato ficha={ficha} />
              <FichaDocumentos documentos={ficha.documentos} />
              <FichaIncidencias incidencias={ficha.incidencias} />
              <FichaClientes clientes={ficha.clientes_interesados} />
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
