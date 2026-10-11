"use client";

import * as React from "react";
import { SearchIcon } from "lucide-react";
import { CoincidenciasCliente } from "@/components/clientes/coincidencias-cliente";
import { ListaClientes } from "@/components/clientes/lista-clientes";
import { CargandoBloques, ErrorCarga } from "@/components/panel/estado-carga";
import { FichaSheet } from "@/components/propiedades/ficha-sheet";
import { Input } from "@/components/ui/input";
import { useClientes } from "@/hooks/use-clientes";

export function ClientesPanel() {
  const { lista, coincidencias, busqueda, setBusqueda, seleccionado, setSeleccionado } = useClientes();
  const [abierta, setAbierta] = React.useState<string | null>(null);
  const clientes = lista.datos?.clientes ?? [];
  const cliente = clientes.find((c) => c.id === seleccionado) ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(280px,1fr)_2fr]">
      <div className="space-y-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar cliente…" aria-label="Buscar cliente" className="pl-8" />
        </div>
        {lista.error ? (
          <ErrorCarga mensaje={lista.error} onReintentar={lista.recargar} />
        ) : lista.loading && !lista.datos ? (
          <CargandoBloques n={4} />
        ) : (
          <ListaClientes clientes={clientes} seleccionado={seleccionado} onElegir={setSeleccionado} />
        )}
      </div>
      <CoincidenciasCliente cliente={cliente} coincidencias={coincidencias.datos?.coincidencias ?? null} loading={coincidencias.loading} error={coincidencias.error} onAbrir={setAbierta} />
      <FichaSheet referencia={abierta} onClose={() => setAbierta(null)} />
    </div>
  );
}
