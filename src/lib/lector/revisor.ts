import type { ContextoLector } from "./resolver";

export interface Hallazgo {
  regla: string;
  severidad: "alta" | "media" | "info";
  titulo: string;
  detalle: string;
  referencia_legal?: string;
}

export type Valores = Record<string, string | number | boolean | null | undefined>;

const LETRAS = "TRWAGMYFPDXBNJZSQVHLCKE";

export function validarDocumentoIdentidad(tipo: string, doc: string): boolean {
  const d = doc.toUpperCase().replace(/[\s-]/g, "");
  if (tipo === "DNI") return /^\d{8}[A-Z]$/.test(d) && LETRAS[Number(d.slice(0, 8)) % 23] === d[8];
  if (tipo === "NIE") {
    if (!/^[XYZ]\d{7}[A-Z]$/.test(d)) return false;
    return LETRAS[Number("XYZ".indexOf(d[0]) + d.slice(1, 8)) % 23] === d[8];
  }
  return d.length >= 5;
}

const meses = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / (30.44 * 86_400_000);

/**
 * Reglas deterministas sobre los datos confirmados. Orientativas (no son asesoramiento jurídico):
 * cada hallazgo indica el artículo de referencia para que el agente lo verifique.
 */
export function revisarContrato(v: Valores, ctx: ContextoLector | null): Hallazgo[] {
  const h: Hallazgo[] = [];
  const tipo = String(v.contrato_tipo ?? "");
  const renta = Number(v.contrato_renta_mensual ?? 0);
  const fianza = Number(v.contrato_fianza ?? 0);
  const garantia = Number(v.contrato_garantia_adicional ?? 0);
  const inicio = v.contrato_fecha_inicio ? String(v.contrato_fecha_inicio) : null;
  const fin = v.contrato_fecha_fin ? String(v.contrato_fecha_fin) : null;
  const duracion = inicio && fin ? meses(inicio, fin) : null;
  const sociedad = ctx?.propietario?.tipo === "sociedad";
  const limiteAnios = sociedad ? 7 : 5;

  if (renta > 0 && fianza > 0) {
    const legal = tipo === "local" ? 2 : 1;
    if (tipo !== "temporada" && fianza > legal * renta * 1.005) {
      h.push({
        regla: "fianza_excesiva", severidad: "alta",
        titulo: `Fianza superior a la legal (${(fianza / renta).toFixed(1)} mensualidades)`,
        detalle: `La fianza legal es de ${legal} mensualidad${legal > 1 ? "es" : ""} (${(legal * renta).toLocaleString("es-ES")} €). El contrato fija ${fianza.toLocaleString("es-ES")} €. El exceso debería tratarse como garantía adicional, con sus límites, o corregirse.`,
        referencia_legal: "LAU art. 36.1",
      });
    }
  }

  if (tipo === "vivienda_habitual" && garantia > 0 && duracion !== null && duracion < limiteAnios * 12 && garantia > 2 * renta * 1.005) {
    h.push({
      regla: "garantia_excesiva", severidad: "alta",
      titulo: `Garantía adicional superior a 2 mensualidades (${(garantia / renta).toFixed(1)})`,
      detalle: `En contratos de vivienda de duración inferior a ${limiteAnios} años la garantía adicional no puede exceder de dos mensualidades (${(2 * renta).toLocaleString("es-ES")} €). El contrato fija ${garantia.toLocaleString("es-ES")} €.`,
      referencia_legal: "LAU art. 36.5",
    });
  }

  if ((tipo === "vivienda_habitual" || tipo === "habitacion") && v.attr_gastos_gestion_a_cargo_inquilino === true) {
    h.push({
      regla: "gastos_gestion_inquilino", severidad: "alta",
      titulo: "Gastos de gestión y formalización repercutidos al inquilino",
      detalle: "En arrendamientos de vivienda, los gastos de gestión inmobiliaria y de formalización del contrato son a cargo del arrendador. La cláusula puede ser nula y exponer a la agencia a reclamaciones.",
      referencia_legal: "LAU art. 20.1 (Ley 12/2023)",
    });
  }

  if (tipo === "vivienda_habitual" && duracion !== null && duracion < limiteAnios * 12 - 1) {
    h.push({
      regla: "duracion_minima", severidad: "info",
      titulo: `Duración pactada inferior a ${limiteAnios} años`,
      detalle: `El contrato dura ${Math.round(duracion)} meses. Se prorrogará obligatoriamente por anualidades hasta ${limiteAnios} años salvo aviso del inquilino con 30 días. Conviene reflejarlo en el calendario de alertas.`,
      referencia_legal: "LAU art. 9",
    });
  }

  if (tipo === "temporada" && duracion !== null && duracion > 11) {
    h.push({
      regla: "temporada_larga", severidad: "media",
      titulo: "Contrato de temporada de un año o más",
      detalle: "Un contrato «de temporada» tan largo puede considerarse vivienda habitual si no responde a una causa real de temporalidad. Comprueba que el motivo esté acreditado.",
      referencia_legal: "LAU art. 3",
    });
  }

  if (v.contrato_indice_actualizacion === "ipc" && inicio && inicio >= "2025-01-01" && (tipo === "vivienda_habitual" || tipo === "habitacion")) {
    h.push({
      regla: "indice_actualizacion", severidad: "media",
      titulo: "Actualización pactada con IPC en un contrato reciente",
      detalle: "La Ley 12/2023 sustituye el IPC por un índice de referencia para vivienda. Verifica que el índice pactado es aplicable a este contrato.",
      referencia_legal: "LAU art. 18 (Ley 12/2023)",
    });
  }

  const penal = Number(v.attr_penalizacion_desistimiento_meses ?? 0);
  if (penal > 0 && duracion !== null && penal > Math.max(1, Math.ceil(duracion / 12))) {
    h.push({
      regla: "penalizacion_desistimiento", severidad: "media",
      titulo: "Penalización por desistir superior a la proporcional",
      detalle: `El contrato prevé ${penal} mensualidades. El máximo pactable es una mensualidad por año que reste (proporcional por meses).`,
      referencia_legal: "LAU art. 11",
    });
  }

  const doc = v.inquilino_documento ? String(v.inquilino_documento) : "";
  const docTipo = String(v.inquilino_documento_tipo ?? "");
  if (doc && docTipo && !validarDocumentoIdentidad(docTipo, doc)) {
    h.push({
      regla: "documento_invalido", severidad: "media",
      titulo: "El documento de identidad del inquilino no es válido",
      detalle: `«${doc}» no supera la comprobación de la letra de control (${docTipo}). Puede ser un error de lectura: revísalo contra el original.`,
    });
  }

  if (ctx) {
    if (ctx.solapes.length > 0) {
      h.push({
        regla: "solape", severidad: "alta",
        titulo: "La unidad ya tiene contrato en esas fechas",
        detalle: `Se solapa con ${ctx.solapes.map((s) => `${s.referencia} (${s.inicio} → ${s.fin})`).join(", ")}. La base de datos no permitirá guardarlo hasta resolverlo.`,
      });
    }
    if (v.attr_permite_mascotas === false && ctx.unidad.admite_mascotas) {
      h.push({
        regla: "mascotas_bd", severidad: "info",
        titulo: "El contrato prohíbe mascotas pero la ficha de la unidad las admite",
        detalle: "Revisa cuál es el criterio vigente y actualiza la ficha de la unidad si procede.",
      });
    }
    if (ctx.unidad.precio && renta > 0 && Math.abs(renta - ctx.unidad.precio) / ctx.unidad.precio > 0.15) {
      h.push({
        regla: "renta_distinta", severidad: "media",
        titulo: "Renta muy distinta del precio de la unidad",
        detalle: `El contrato indica ${renta.toLocaleString("es-ES")} €/mes y la ficha tiene ${ctx.unidad.precio.toLocaleString("es-ES")} €. Comprueba que has elegido la unidad correcta.`,
      });
    }
  }

  const orden = { alta: 0, media: 1, info: 2 };
  return h.sort((a, b) => orden[a.severidad] - orden[b.severidad]);
}
