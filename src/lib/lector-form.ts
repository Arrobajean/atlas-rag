import { normalizarValor, type CampoCatalogo, type DatosExtraidos } from "@/lib/lector/catalogo";
import type { Valores } from "@/lib/lector/revisor";

export type EstadoCampo = "ok" | "baja" | "vacio" | "editado" | "error";

/** Umbral por debajo del cual la IA no está segura y el campo se marca para revisar. */
export const CONFIANZA_BAJA = 0.75;

export interface GrupoCampos {
  grupo: string;
  campos: CampoCatalogo[];
}

/** Campos editables del formulario (los de solo lectura se muestran en la comparación con la BD). */
export const camposEditables = (campos: CampoCatalogo[]) => campos.filter((c) => c.escritura !== "solo_lectura");

/**
 * Campos visibles al abrir: los obligatorios, los que la IA encontró y los que el agente ya rellenó o añadió.
 * El resto sigue disponible en «Añadir campo» (siempre del catálogo predefinido).
 */
export function camposVisibles(campos: CampoCatalogo[], datos: DatosExtraidos, valores: Valores, anadidos: Set<string>): CampoCatalogo[] {
  return camposEditables(campos).filter(
    (c) => c.obligatorio || datos[c.clave]?.encontrado || anadidos.has(c.clave) || (valores[c.clave] !== null && valores[c.clave] !== undefined && valores[c.clave] !== "")
  );
}

export function agrupar(campos: CampoCatalogo[]): GrupoCampos[] {
  const mapa = new Map<string, CampoCatalogo[]>();
  for (const c of campos) mapa.set(c.grupo, [...(mapa.get(c.grupo) ?? []), c]);
  return [...mapa.entries()].map(([grupo, cs]) => ({ grupo, campos: cs }));
}

const igual = (a: unknown, b: unknown) => (a ?? null) === (b ?? null) || String(a ?? "") === String(b ?? "");

/** Estado visual de un campo según lo leído por la IA y lo que hay ahora en el formulario. */
export function estadoDelCampo(c: CampoCatalogo, datos: DatosExtraidos, valores: Valores): { estado: EstadoCampo; error?: string } {
  const valor = valores[c.clave];
  const n = normalizarValor(c, valor);
  if (!n.ok) return { estado: "error", error: n.error };
  if (n.valor === null) return c.obligatorio ? { estado: "error", error: "Obligatorio" } : { estado: "vacio" };
  const leido = datos[c.clave];
  if (leido?.encontrado && !igual(leido.valor, n.valor)) return { estado: "editado" };
  if (!leido?.encontrado) return { estado: "editado" };
  return leido.confianza < CONFIANZA_BAJA ? { estado: "baja" } : { estado: "ok" };
}

/** Errores que impiden confirmar. */
export function erroresDeConfirmacion(campos: CampoCatalogo[], valores: Valores, inquilinoExistente: boolean): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const c of camposEditables(campos)) {
    if (c.entidad === "inquilino" && inquilinoExistente) continue;
    const n = normalizarValor(c, valores[c.clave]);
    if (!n.ok) errores[c.clave] = n.error;
    else if (n.valor === null && c.obligatorio) errores[c.clave] = "Obligatorio";
  }
  return errores;
}

export const camposDisponiblesParaAnadir = (campos: CampoCatalogo[], visibles: CampoCatalogo[]) => {
  const en = new Set(visibles.map((c) => c.clave));
  return camposEditables(campos).filter((c) => !en.has(c.clave));
};

/** Cuántos campos ha cambiado el agente respecto a la lectura de la IA. */
export function contarCambios(campos: CampoCatalogo[], datos: DatosExtraidos, valores: Valores): number {
  return camposEditables(campos).filter((c) => {
    const n = normalizarValor(c, valores[c.clave]);
    const leido = datos[c.clave];
    const previo = leido?.encontrado ? leido.valor : null;
    return n.ok ? !igual(previo, n.valor) : true;
  }).length;
}
