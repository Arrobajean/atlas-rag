"use client";

import * as React from "react";
import { toast } from "sonner";
import { errorMessage, getCampos, proponerCampo, resolverSolicitud } from "@/lib/api";
import { useCarga } from "@/hooks/use-carga";

/** Catálogo de campos y solicitudes pendientes (pantalla de administración). */
export function useCampos() {
  const estado = useCarga(getCampos, []);
  const { recargar } = estado;

  const resolver = React.useCallback(
    async (id: number, accion: "aprobar" | "rechazar", motivo?: string): Promise<boolean> => {
      try {
        await resolverSolicitud(id, accion, motivo);
        toast.success(accion === "aprobar" ? "Campo aprobado y añadido al catálogo" : "Solicitud rechazada");
        recargar();
        return true;
      } catch (err) {
        toast.error(errorMessage(err, "No se pudo resolver la solicitud"));
        return false;
      }
    },
    [recargar]
  );

  return { ...estado, resolver };
}

/** Envío de una propuesta de campo nuevo desde el lector. */
export function useProponerCampo() {
  const [enviando, setEnviando] = React.useState(false);

  const enviar = React.useCallback(async (c: { etiqueta: string; tipo_dato: string; descripcion?: string }): Promise<boolean> => {
    setEnviando(true);
    try {
      await proponerCampo(c);
      toast.success("Propuesta enviada: quedará pendiente de aprobación");
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "No se pudo enviar la propuesta"));
      return false;
    } finally {
      setEnviando(false);
    }
  }, []);

  return { enviar, enviando };
}
