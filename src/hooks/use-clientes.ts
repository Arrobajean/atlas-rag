"use client";

import * as React from "react";
import { getCoincidenciasCliente, listarClientes } from "@/lib/api";
import { useCarga } from "@/hooks/use-carga";

export function useClientes() {
  const [busqueda, setBusqueda] = React.useState("");
  const [consulta, setConsulta] = React.useState("");
  const [seleccionado, setSeleccionado] = React.useState<number | null>(null);

  // Espera a que el usuario deje de teclear antes de consultar
  React.useEffect(() => {
    const t = setTimeout(() => setConsulta(busqueda.trim()), 300);
    return () => clearTimeout(t);
  }, [busqueda]);

  const lista = useCarga(() => listarClientes(consulta || undefined), [consulta]);
  const coincidencias = useCarga(() => (seleccionado ? getCoincidenciasCliente(seleccionado) : Promise.resolve(null)), [seleccionado]);

  return { lista, coincidencias, busqueda, setBusqueda, seleccionado, setSeleccionado };
}
