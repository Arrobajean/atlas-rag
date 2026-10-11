"use client";

import * as React from "react";
import { toast } from "sonner";
import { liberarPrevisualizacion, motivoNoCabe, prepararAdjunto, type AdjuntoCliente } from "@/lib/adjuntos-cliente";

/** Archivos que se van a enviar con el próximo mensaje: alta (selector, arrastrar o pegar), baja y vaciado. */
export function useAdjuntos() {
  const [adjuntos, setAdjuntos] = React.useState<AdjuntoCliente[]>([]);
  const [procesando, setProcesando] = React.useState(false);
  // Lo ya adjuntado se lee por referencia: así varios archivos añadidos a la vez no se pisan
  const actuales = React.useRef(adjuntos);
  React.useEffect(() => {
    actuales.current = adjuntos;
  });

  const agregar = React.useCallback(async (archivos: File[]) => {
    if (archivos.length === 0) return;
    setProcesando(true);
    try {
      for (const file of archivos) {
        try {
          const nuevo = await prepararAdjunto(file);
          const motivo = motivoNoCabe(actuales.current, nuevo);
          if (motivo) {
            liberarPrevisualizacion(nuevo);
            toast.error(motivo);
            break;
          }
          actuales.current = [...actuales.current, nuevo];
          setAdjuntos(actuales.current);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "No se pudo adjuntar el archivo.");
        }
      }
    } finally {
      setProcesando(false);
    }
  }, []);

  const quitar = React.useCallback((id: string) => {
    const a = actuales.current.find((x) => x.id === id);
    if (a) liberarPrevisualizacion(a);
    actuales.current = actuales.current.filter((x) => x.id !== id);
    setAdjuntos(actuales.current);
  }, []);

  /** Vacía la lista tras enviar. Las miniaturas siguen vivas: ahora las usa el mensaje enviado. */
  const vaciar = React.useCallback(() => {
    actuales.current = [];
    setAdjuntos([]);
  }, []);

  return { adjuntos, procesando, agregar, quitar, vaciar };
}
