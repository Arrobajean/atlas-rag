"use client";

import * as React from "react";
import { CargandoBloques, ErrorCarga } from "@/components/panel/estado-carga";
import { FichaSheet } from "@/components/propiedades/ficha-sheet";
import { FiltrosPropiedadesBarra } from "@/components/propiedades/filtros-propiedades";
import { TablaPropiedades } from "@/components/propiedades/tabla-propiedades";
import { usePropiedades } from "@/hooks/use-propiedades";
import type { FiltrosPropiedades } from "@/lib/types";

export function PropiedadesExplorador({ inicial }: { inicial?: FiltrosPropiedades }) {
  const { datos, loading, error, recargar, filtros, cambiar, limpiar, hayFiltros, pagina, totalPaginas } = usePropiedades(inicial);
  const [abierta, setAbierta] = React.useState<string | null>(null);

  const ordenar = (orden: string) =>
    cambiar({ orden, direccion: filtros.orden === orden && filtros.direccion !== "desc" ? "desc" : "asc" });

  return (
    <div className="space-y-4">
      <FiltrosPropiedadesBarra filtros={filtros} hayFiltros={hayFiltros} onCambiar={cambiar} onLimpiar={limpiar} />
      {error ? (
        <ErrorCarga mensaje={error} onReintentar={recargar} />
      ) : loading && !datos ? (
        <CargandoBloques n={4} />
      ) : datos ? (
        <div className={loading ? "opacity-60 transition-opacity" : ""}>
          <TablaPropiedades
            items={datos.items}
            total={datos.total}
            filtros={filtros}
            pagina={pagina}
            totalPaginas={totalPaginas}
            onAbrir={setAbierta}
            onOrdenar={ordenar}
            onPagina={(p) => cambiar({ pagina: p })}
          />
        </div>
      ) : null}
      <FichaSheet referencia={abierta} onClose={() => setAbierta(null)} />
    </div>
  );
}
