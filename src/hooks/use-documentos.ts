"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { buscarDocumentos, crearExtraccion, eliminarDocumento, errorMessage, listarDocumentos } from "@/lib/api";
import { useCarga } from "@/hooks/use-carga";
import type { ResultadoBusqueda } from "@/lib/types";

/** Lista de documentos con filtros, borrado, «leer con IA» y búsqueda semántica en el contenido. */
export function useDocumentos() {
  const router = useRouter();
  const [tipo, setTipo] = React.useState("");
  const [titulo, setTitulo] = React.useState("");
  const [consulta, setConsulta] = React.useState("");
  const [resultados, setResultados] = React.useState<ResultadoBusqueda[] | null>(null);
  const [buscando, setBuscando] = React.useState(false);
  const [leyendo, setLeyendo] = React.useState<number | null>(null);

  React.useEffect(() => {
    const t = setTimeout(() => setConsulta(titulo.trim()), 300);
    return () => clearTimeout(t);
  }, [titulo]);

  const lista = useCarga(() => listarDocumentos({ tipo: tipo || undefined, q: consulta || undefined }), [tipo, consulta]);
  const { recargar } = lista;

  const eliminar = React.useCallback(
    async (id: number): Promise<boolean> => {
      try {
        await eliminarDocumento(id);
        toast.success("Documento eliminado");
        recargar();
        return true;
      } catch (err) {
        toast.error(errorMessage(err, "No se pudo eliminar"));
        return false;
      }
    },
    [recargar]
  );

  /** Crea el borrador de extracción y abre el lector con el PDF a la izquierda. */
  const leerConIA = React.useCallback(
    async (id: number) => {
      setLeyendo(id);
      try {
        const r = await crearExtraccion(id);
        router.push(`/dashboard/lector/${r.extraccion_id}`);
      } catch (err) {
        toast.error(errorMessage(err, "No se pudo leer el documento"));
        setLeyendo(null);
      }
    },
    [router]
  );

  const buscarContenido = React.useCallback(async (q: string) => {
    const texto = q.trim();
    if (!texto) {
      setResultados(null);
      return;
    }
    setBuscando(true);
    try {
      setResultados((await buscarDocumentos(texto, 10)).matches);
    } catch (err) {
      toast.error(errorMessage(err, "Error en la búsqueda"));
    } finally {
      setBuscando(false);
    }
  }, []);

  return {
    lista, tipo, setTipo, titulo, setTitulo, eliminar, leerConIA, leyendo,
    resultados, buscando, buscarContenido, limpiarBusqueda: () => setResultados(null),
  };
}
