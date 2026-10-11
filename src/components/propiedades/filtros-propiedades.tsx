import { SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectCampo } from "@/components/ui/select-campo";
import { OPCIONES_ESTADO, OPCIONES_OPERACION, OPCIONES_TIPO, ZONAS } from "@/lib/etiquetas";
import type { FiltrosPropiedades } from "@/lib/types";

interface Props {
  filtros: FiltrosPropiedades;
  hayFiltros: boolean;
  onCambiar: (c: Partial<FiltrosPropiedades>) => void;
  onLimpiar: () => void;
}

export function FiltrosPropiedadesBarra({ filtros, hayFiltros, onCambiar, onLimpiar }: Props) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
      <div className="relative sm:col-span-2">
        <SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
        <Input
          value={filtros.calle ?? ""}
          onChange={(e) => onCambiar({ calle: e.target.value || undefined })}
          placeholder="Dirección: Toledo, Fuencarral 88…"
          aria-label="Buscar por dirección"
          className="pl-8"
        />
      </div>
      <SelectCampo aria-label="Zona" value={filtros.zona} placeholder="Todas las zonas" opciones={ZONAS.map((z) => [z, z] as const)} onChange={(v) => onCambiar({ zona: v || undefined })} />
      <SelectCampo aria-label="Tipo" value={filtros.tipo} placeholder="Todos los tipos" opciones={OPCIONES_TIPO} onChange={(v) => onCambiar({ tipo: v || undefined })} />
      <SelectCampo aria-label="Operación" value={filtros.operacion} placeholder="Operación" opciones={OPCIONES_OPERACION} onChange={(v) => onCambiar({ operacion: v || undefined })} />
      <div className="flex gap-2">
        <SelectCampo aria-label="Estado" value={filtros.estado} placeholder="Estado" opciones={OPCIONES_ESTADO} onChange={(v) => onCambiar({ estado: v || undefined })} />
        {hayFiltros && (
          <Button variant="ghost" size="icon" onClick={onLimpiar} aria-label="Quitar filtros" title="Quitar filtros">
            <XIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
