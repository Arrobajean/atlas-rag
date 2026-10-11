"use client";

import * as React from "react";
import { toast } from "sonner";
import { actualizarAlerta, errorMessage, listarAlertas } from "@/lib/api";
import { useCarga } from "@/hooks/use-carga";

export function useAlertas(tipoInicial = "") {
  const [tipo, setTipo] = React.useState(tipoInicial);
  const [severidad, setSeveridad] = React.useState("");
  const estado = useCarga(() => listarAlertas({ tipo: tipo || undefined, severidad: severidad || undefined }), [tipo, severidad]);
  const { recargar } = estado;

  const resolver = React.useCallback(
    async (clave: string) => {
      try {
        await actualizarAlerta(clave, "resolver");
        toast.success("Alerta marcada como resuelta");
        recargar();
        return true;
      } catch (err) {
        toast.error(errorMessage(err, "No se pudo actualizar la alerta"));
        return false;
      }
    },
    [recargar]
  );

  const posponer = React.useCallback(
    async (clave: string, dias = 7) => {
      try {
        await actualizarAlerta(clave, "posponer", dias);
        toast.success(`Alerta pospuesta ${dias} días`);
        recargar();
        return true;
      } catch (err) {
        toast.error(errorMessage(err, "No se pudo posponer la alerta"));
        return false;
      }
    },
    [recargar]
  );

  return { ...estado, tipo, setTipo, severidad, setSeveridad, resolver, posponer };
}
