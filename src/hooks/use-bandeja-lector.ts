"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { crearExtraccion, errorMessage, listarExtracciones } from "@/lib/api";
import { useCarga } from "@/hooks/use-carga";

/** Bandeja de contratos leídos; tras subir uno nuevo se abre directamente en el lector. */
export function useBandejaLector() {
  const router = useRouter();
  const estado = useCarga(listarExtracciones, []);

  const leerNuevo = React.useCallback(
    async (documentoId: number) => {
      try {
        const r = await crearExtraccion(documentoId);
        router.push(`/dashboard/lector/${r.extraccion_id}`);
      } catch (err) {
        toast.error(errorMessage(err, "El contrato se subió pero no se pudo leer"));
        estado.recargar();
      }
    },
    [router, estado]
  );

  return { ...estado, leerNuevo };
}
