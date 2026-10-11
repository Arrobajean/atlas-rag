import type { Db } from "@/lib/db";
import type { DatosExtraidos } from "./catalogo";

export interface CandidatoUnidad {
  id: number;
  referencia: string;
  ubicacion: string;
  municipio: string;
  tipo: string;
  estado: string;
  superficie_m2: number;
  referencia_catastral: string;
  score: number;
}

export interface CandidatoInquilino {
  id: number;
  nombre: string;
  documento_tipo: string;
  documento: string;
  email: string | null;
  telefono: string | null;
  contratos: number;
  score: number;
}

export interface Comparacion {
  clave: string;
  etiqueta: string;
  pdf: string | null;
  bd: string | null;
  estado: "coincide" | "difiere" | "sin_dato";
}

export interface ContextoLector {
  unidad: { id: number; referencia: string; ubicacion: string; municipio: string; tipo: string; estado: string; superficie_m2: number; referencia_catastral: string; precio: number | null; admite_mascotas: boolean; direccion: string };
  propietario: { id: number; nombre: string; documento: string; tipo: string } | null;
  contrato_vigente: { id: number; referencia: string; inicio: string; fin: string; renta: number; fianza: number; inquilino: string } | null;
  solapes: { id: number; referencia: string; estado: string; inicio: string; fin: string }[];
}

const valorDe = (datos: DatosExtraidos, clave: string) => {
  const d = datos[clave];
  return d?.encontrado && d.valor !== null ? String(d.valor) : null;
};

/** Sugerencias para vincular el PDF con entidades existentes (nunca crea nada: solo propone). */
export async function sugerirEntidades(db: Db, datos: DatosExtraidos) {
  const unidades = await db.rpc<CandidatoUnidad[]>("rpc_candidatos_unidad", {
    p_catastro: valorDe(datos, "inmueble_referencia_catastral"),
    p_direccion: valorDe(datos, "inmueble_direccion"),
    p_limite: 6,
  });
  const nombre = [valorDe(datos, "inquilino_nombre"), valorDe(datos, "inquilino_apellidos")].filter(Boolean).join(" ");
  const inquilinos = await db.rpc<CandidatoInquilino[]>("rpc_candidatos_inquilino", {
    p_documento: valorDe(datos, "inquilino_documento"),
    p_nombre: nombre || null,
  });
  // Solo se autoselecciona un candidato cuando es inequívoco
  const [primero, segundo] = unidades;
  const unidadSugerida = primero && (primero.score >= 100 || (primero.score >= 80 && (!segundo || segundo.score < primero.score))) ? primero.id : null;
  const inquilinoSugerido = inquilinos[0]?.score === 100 ? inquilinos[0].id : null;
  return { unidades, inquilinos: inquilinos.map(enmascarar), unidadSugerida, inquilinoSugerido };
}

const enmascarar = <T extends { documento: string }>(c: T): T => ({ ...c, documento: enmascararDocumento(c.documento) });
export const enmascararDocumento = (d: string | null) => (d ? `****${d.slice(-4)}` : "");

const norm = (t: string | null | undefined) =>
  (t ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const soloAlfanum = (t: string | null | undefined) => (t ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");

export async function contextoDeUnidad(db: Db, unidadId: number, inicio: string | null, fin: string | null) {
  return db.rpc<ContextoLector | null>("rpc_contexto_lector", { p_unidad: unidadId, p_inicio: inicio, p_fin: fin });
}

/** Compara lo leído en el PDF con la base de datos. Los datos sensibles se devuelven enmascarados. */
export function compararConBd(datos: DatosExtraidos, ctx: ContextoLector): Comparacion[] {
  const out: Comparacion[] = [];
  const cmp = (clave: string, etiqueta: string, pdf: string | null, bd: string | null, iguales: (a: string, b: string) => boolean, mostrar: (s: string | null) => string | null = (s) => s) => {
    const estado = !pdf || !bd ? "sin_dato" : iguales(pdf, bd) ? "coincide" : "difiere";
    out.push({ clave, etiqueta, pdf: mostrar(pdf), bd: mostrar(bd), estado });
  };

  cmp("arrendador_nombre", "Arrendador", valorDe(datos, "arrendador_nombre"), ctx.propietario?.nombre ?? null, (a, b) => norm(a) === norm(b) || norm(b).includes(norm(a)) || norm(a).includes(norm(b)));
  cmp("arrendador_documento", "Documento del arrendador", valorDe(datos, "arrendador_documento"), ctx.propietario?.documento ?? null, (a, b) => soloAlfanum(a) === soloAlfanum(b), (s) => (s ? enmascararDocumento(s) : null));
  cmp("inmueble_referencia_catastral", "Referencia catastral", valorDe(datos, "inmueble_referencia_catastral"), ctx.unidad.referencia_catastral, (a, b) => soloAlfanum(a) === soloAlfanum(b));
  cmp("inmueble_direccion", "Dirección", valorDe(datos, "inmueble_direccion"), ctx.unidad.ubicacion, (a, b) => norm(a).includes(norm(ctx.unidad.direccion)) || norm(b).includes(norm(a)));
  const renta = valorDe(datos, "contrato_renta_mensual");
  if (renta && ctx.unidad.precio) {
    const dif = Math.abs(Number(renta) - ctx.unidad.precio) / ctx.unidad.precio;
    out.push({
      clave: "contrato_renta_mensual", etiqueta: "Renta mensual",
      pdf: `${Number(renta).toLocaleString("es-ES")} €`, bd: `${ctx.unidad.precio.toLocaleString("es-ES")} € (precio de la unidad)`,
      estado: dif < 0.001 ? "coincide" : dif > 0.15 ? "difiere" : "coincide",
    });
  }
  return out;
}
