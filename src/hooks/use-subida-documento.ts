"use client";

import * as React from "react";
import { toast } from "sonner";
import { errorMessage, getEdificio, getPropiedad, subirDocumento, subirTexto } from "@/lib/api";

const MAX_BYTES = 25 * 1024 * 1024;

/** Formulario de subida: archivo o texto, tipo y vínculo (edificio / unidad) por referencia. */
export function useSubidaDocumento(onSubido?: (documentoId: number, tipo: string) => void, tipoInicial = "general") {
  const [archivo, setArchivo] = React.useState<File | null>(null);
  const [titulo, setTitulo] = React.useState("");
  const [tipo, setTipo] = React.useState(tipoInicial);
  const [edificioRef, setEdificioRef] = React.useState("");
  const [unidadRef, setUnidadRef] = React.useState("");
  const [fecha, setFecha] = React.useState("");
  const [sustituyeA, setSustituyeA] = React.useState("");
  const [texto, setTexto] = React.useState("");
  const [subiendo, setSubiendo] = React.useState(false);

  const elegirArchivo = React.useCallback((f: File | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error("El archivo supera los 25 MB");
      return;
    }
    setArchivo(f);
    setTitulo((t) => t || f.name.replace(/\.[^.]+$/, ""));
    setTexto("");
    // Un PDF llamado "contrato…" casi siempre lo es
    if (/contrato/i.test(f.name)) setTipo((t) => (t === "general" ? "contrato" : t));
  }, []);

  const reset = React.useCallback(() => {
    setArchivo(null);
    setTitulo("");
    setTipo(tipoInicial);
    setEdificioRef("");
    setUnidadRef("");
    setFecha("");
    setSustituyeA("");
    setTexto("");
  }, [tipoInicial]);

  /** Resuelve las referencias escritas (U-00012, E-00003, «Toledo 45») a ids reales; falla si no existen. */
  const resolverVinculos = React.useCallback(async () => {
    const out: { edificio_id?: number; unidad_id?: number } = {};
    if (unidadRef.trim()) out.unidad_id = Number((await getPropiedad(unidadRef.trim())).unidad.id);
    if (edificioRef.trim()) {
      const e = await getEdificio(edificioRef.trim());
      if ("candidatos" in e) throw new Error("La dirección del edificio es ambigua: usa su referencia (E-00001)");
      out.edificio_id = Number((e.edificio as Record<string, unknown>).id);
    }
    return out;
  }, [edificioRef, unidadRef]);

  /** Sube e indexa. Devuelve true si terminó bien. */
  const enviar = React.useCallback(async (): Promise<boolean> => {
    if (subiendo) return false;
    if (!titulo.trim() || (!archivo && !texto.trim())) {
      toast.error("Indica un título y sube un archivo o pega un texto");
      return false;
    }
    setSubiendo(true);
    try {
      const vinculos = await resolverVinculos();
      const datos = { titulo: titulo.trim(), tipo, ...vinculos, fecha_documento: fecha || null, sustituye_a: sustituyeA ? Number(sustituyeA) : null };
      const r = archivo ? await subirDocumento(archivo, datos) : await subirTexto(titulo.trim(), texto.trim(), datos);
      if (r.duplicado) toast.info("Ese archivo ya estaba subido: se ha reutilizado el existente");
      else toast.success(`Indexado: ${r.fragmentos} fragmentos${r.ocr ? " (leído con OCR)" : ""}`);
      reset();
      onSubido?.(r.documento_id, tipo);
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "No se pudo subir el documento"));
      return false;
    } finally {
      setSubiendo(false);
    }
  }, [archivo, fecha, onSubido, reset, resolverVinculos, subiendo, sustituyeA, texto, tipo, titulo]);

  return { archivo, elegirArchivo, titulo, setTitulo, tipo, setTipo, edificioRef, setEdificioRef, unidadRef, setUnidadRef, fecha, setFecha, sustituyeA, setSustituyeA, texto, setTexto, subiendo, enviar, reset };
}
