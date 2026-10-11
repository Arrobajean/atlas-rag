"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { confirmarExtraccion, descartarExtraccion, errorMessage, getExtraccion, guardarExtraccion } from "@/lib/api";
import { useCarga } from "@/hooks/use-carga";
import { agrupar, camposDisponiblesParaAnadir, camposVisibles, contarCambios, erroresDeConfirmacion, estadoDelCampo, type EstadoCampo } from "@/lib/lector-form";
import { revisarContrato } from "@/lib/lector/revisor";
import type { Comparacion, ContextoLector, EstadoLector, Resolucion, Valores } from "@/lib/types";

type Valor = string | number | boolean | null;

/**
 * Estado completo de la pantalla del lector: valores editables (borrador), vinculación con unidad e inquilino,
 * revisión en vivo y acciones. Nada se escribe en las tablas reales hasta `confirmar`.
 */
export function useLector(extraccionId: number) {
  const router = useRouter();
  const carga = useCarga(() => getExtraccion(extraccionId), [extraccionId]);
  const base: EstadoLector | null = carga.datos;

  const [valores, setValores] = React.useState<Valores>({});
  const [resolucion, setResolucion] = React.useState<Resolucion>({ unidad_id: null, inquilino: { modo: "crear" } });
  const [contexto, setContexto] = React.useState<{ contexto: ContextoLector | null; comparaciones: Comparacion[] }>({ contexto: null, comparaciones: [] });
  const [anadidos, setAnadidos] = React.useState<Set<string>>(new Set());
  const [activo, setActivo] = React.useState<string | null>(null);
  const [pagina, setPagina] = React.useState(1);
  const [sucio, setSucio] = React.useState(false);
  const [ocupado, setOcupado] = React.useState<"guardar" | "confirmar" | "descartar" | null>(null);
  const [erroresServidor, setErroresServidor] = React.useState<Record<string, string>>({});
  const inicializado = React.useRef<number | null>(null);

  // Al llegar los datos por primera vez, se copian al estado editable
  React.useEffect(() => {
    if (!base || inicializado.current === extraccionId) return;
    inicializado.current = extraccionId;
    setValores(base.valores);
    setResolucion(base.resolucion);
    setContexto({ contexto: base.contexto, comparaciones: base.comparaciones });
    const primera = base.campos.find((c) => base.datos[c.clave]?.pagina);
    setPagina(base.datos[primera?.clave ?? ""]?.pagina ?? 1);
  }, [base, extraccionId]);

  const campos = React.useMemo(() => base?.campos ?? [], [base]);
  const datos = React.useMemo(() => base?.datos ?? {}, [base]);
  const editable = base?.extraccion.estado === "borrador";

  const visibles = React.useMemo(() => camposVisibles(campos, datos, valores, anadidos), [campos, datos, valores, anadidos]);
  const grupos = React.useMemo(() => agrupar(visibles), [visibles]);
  const disponibles = React.useMemo(() => camposDisponiblesParaAnadir(campos, visibles), [campos, visibles]);
  const estados = React.useMemo(() => {
    const m: Record<string, { estado: EstadoCampo; error?: string }> = {};
    for (const c of visibles) m[c.clave] = estadoDelCampo(c, datos, valores);
    return m;
  }, [visibles, datos, valores]);

  const hallazgos = React.useMemo(() => revisarContrato(valores, contexto.contexto), [valores, contexto.contexto]);
  const errores = React.useMemo(() => erroresDeConfirmacion(campos, valores, resolucion.inquilino.modo === "existente"), [campos, valores, resolucion.inquilino.modo]);
  const cambios = React.useMemo(() => contarCambios(campos, datos, valores), [campos, datos, valores]);
  const faltaUnidad = !resolucion.unidad_id;
  const puedeConfirmar = editable && !faltaUnidad && Object.keys(errores).length === 0 && ocupado === null;

  const cambiarValor = React.useCallback((clave: string, v: Valor) => {
    setValores((prev) => ({ ...prev, [clave]: v }));
    setErroresServidor((e) => (clave in e ? Object.fromEntries(Object.entries(e).filter(([k]) => k !== clave)) : e));
    setSucio(true);
  }, []);

  /** Vuelve al valor leído por la IA. */
  const restaurar = React.useCallback((clave: string) => cambiarValor(clave, datos[clave]?.encontrado ? (datos[clave].valor as Valor) : null), [cambiarValor, datos]);

  /** Selecciona un campo: salta a su página en el PDF y resalta la cita. */
  const seleccionar = React.useCallback(
    (clave: string) => {
      setActivo(clave);
      const p = datos[clave]?.pagina;
      if (p) setPagina(p);
    },
    [datos]
  );

  const anadirCampo = React.useCallback((clave: string) => {
    setAnadidos((s) => new Set(s).add(clave));
    setActivo(clave);
  }, []);

  /** Elige la unidad y recalcula la comparación con la BD y los solapes. */
  const elegirUnidad = React.useCallback(
    async (unidadId: number | null) => {
      setResolucion((r) => ({ ...r, unidad_id: unidadId }));
      setSucio(true);
      if (!unidadId) return setContexto({ contexto: null, comparaciones: [] });
      try {
        const e = await getExtraccion(extraccionId, unidadId);
        setContexto({ contexto: e.contexto, comparaciones: e.comparaciones });
      } catch (err) {
        toast.error(errorMessage(err, "No se pudo cargar la unidad"));
      }
    },
    [extraccionId]
  );

  const elegirInquilino = React.useCallback((modo: "crear" | "existente", id?: number | null) => {
    setResolucion((r) => ({ ...r, inquilino: { modo, id: id ?? null } }));
    setSucio(true);
  }, []);

  const guardar = React.useCallback(async (): Promise<boolean> => {
    setOcupado("guardar");
    try {
      await guardarExtraccion(extraccionId, valores, resolucion);
      setSucio(false);
      toast.success("Borrador guardado");
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "No se pudo guardar"));
      return false;
    } finally {
      setOcupado(null);
    }
  }, [extraccionId, resolucion, valores]);

  const confirmar = React.useCallback(async (): Promise<boolean> => {
    if (!puedeConfirmar) return false;
    setOcupado("confirmar");
    try {
      const r = await confirmarExtraccion(extraccionId, valores, resolucion);
      toast.success(`Contrato ${r.referencia} guardado`, { description: r.hallazgos.length ? `${r.hallazgos.length} hallazgos de revisión` : "Sin hallazgos" });
      router.push("/dashboard/lector");
      return true;
    } catch (err) {
      const e = err as Error & { errores?: Record<string, string> };
      if (e.errores) setErroresServidor(e.errores);
      toast.error(errorMessage(err, "No se pudo confirmar"));
      return false;
    } finally {
      setOcupado(null);
    }
  }, [extraccionId, puedeConfirmar, resolucion, router, valores]);

  const descartar = React.useCallback(async (): Promise<boolean> => {
    setOcupado("descartar");
    try {
      await descartarExtraccion(extraccionId);
      toast.success("Borrador descartado");
      router.push("/dashboard/lector");
      return true;
    } catch (err) {
      toast.error(errorMessage(err, "No se pudo descartar"));
      return false;
    } finally {
      setOcupado(null);
    }
  }, [extraccionId, router]);

  // Avisa si se intenta salir con cambios sin guardar
  React.useEffect(() => {
    if (!sucio) return;
    const aviso = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [sucio]);

  return {
    carga, base, editable, campos, datos, valores, resolucion, contexto, grupos, estados, disponibles, hallazgos, errores, erroresServidor,
    cambios, sucio, ocupado, faltaUnidad, puedeConfirmar, activo, pagina, setPagina,
    cambiarValor, restaurar, seleccionar, anadirCampo, elegirUnidad, elegirInquilino, guardar, confirmar, descartar,
  };
}
