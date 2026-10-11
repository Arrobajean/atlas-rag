import type { Db } from "@/lib/db";

export interface CampoCatalogo {
  id: number;
  clave: string;
  etiqueta: string;
  ayuda: string | null;
  tipo_documento: string;
  entidad: "contrato" | "inquilino" | "propietario" | "unidad" | "edificio";
  grupo: string;
  escritura: "columna" | "atributo" | "solo_lectura";
  tabla_destino: string | null;
  columna_destino: string | null;
  tipo_dato: "texto" | "numero" | "moneda" | "fecha" | "booleano" | "opcion";
  obligatorio: boolean;
  opciones: string[] | null;
  validacion: { min?: number; max?: number; regex?: string } | null;
  orden: number;
}

export interface DatoExtraido {
  valor: string | number | boolean | null;
  confianza: number;
  pagina: number | null;
  texto: string | null;
  encontrado: boolean;
}

export type DatosExtraidos = Record<string, DatoExtraido>;

export async function cargarCatalogo(db: Db, tipoDocumento = "contrato"): Promise<CampoCatalogo[]> {
  const filas = await db.seleccionar<CampoCatalogo>("catalogo_campos", {
    igual: { tipo_documento: tipoDocumento, activo: true },
    orden: { columna: "orden" },
  });
  return filas;
}

const TIPO_JSON: Record<CampoCatalogo["tipo_dato"], "string" | "number" | "boolean"> = {
  texto: "string", numero: "number", moneda: "number", fecha: "string", booleano: "boolean", opcion: "string",
};

/** JSON Schema de salida generado a partir del catálogo: el modelo solo puede devolver campos que existen. */
export function esquemaDeSalida(campos: CampoCatalogo[]) {
  const propiedades: Record<string, unknown> = {};
  for (const c of campos) {
    const valor: Record<string, unknown> = { type: TIPO_JSON[c.tipo_dato], description: descripcionCampo(c) };
    if (c.tipo_dato === "opcion" && c.opciones) valor.enum = c.opciones;
    propiedades[c.clave] = {
      type: "object",
      properties: {
        encontrado: { type: "boolean", description: "false si el documento no menciona este dato" },
        valor,
        confianza: { type: "number", description: "0 a 1: seguridad de que el valor es correcto" },
        pagina: { type: "integer", description: "Página (desde 1) donde aparece" },
        texto: { type: "string", description: "Cita literal breve (máx. 160 caracteres) que respalda el valor" },
      },
      required: ["encontrado", "valor", "confianza", "pagina", "texto"],
    };
  }
  return { type: "object", properties: propiedades, required: campos.map((c) => c.clave) };
}

export function descripcionCampo(c: CampoCatalogo): string {
  const partes = [c.etiqueta];
  if (c.ayuda) partes.push(c.ayuda);
  if (c.tipo_dato === "fecha") partes.push("formato AAAA-MM-DD");
  if (c.tipo_dato === "moneda") partes.push("número en euros sin símbolo ni separador de miles (1250.5)");
  if (c.tipo_dato === "booleano") partes.push("true/false");
  if (c.tipo_dato === "opcion" && c.opciones) partes.push(`uno de: ${c.opciones.join(", ")}`);
  return partes.join(" · ");
}

/** Normaliza y valida un valor contra la definición del campo. Devuelve el valor limpio o un error. */
export function normalizarValor(c: CampoCatalogo, v: unknown): { ok: true; valor: string | number | boolean | null } | { ok: false; error: string } {
  if (v === null || v === undefined || (typeof v === "string" && v.trim() === "")) return { ok: true, valor: null };
  switch (c.tipo_dato) {
    case "texto": {
      const t = String(v).trim();
      if (c.validacion?.regex && !new RegExp(c.validacion.regex).test(t)) return { ok: false, error: "Formato no válido" };
      return { ok: true, valor: t };
    }
    case "numero":
    case "moneda": {
      const n = typeof v === "number" ? v : Number(String(v).replace(/\./g, "").replace(",", ".").replace(/[^\d.\-]/g, ""));
      if (!Number.isFinite(n)) return { ok: false, error: "Debe ser un número" };
      if (c.validacion?.min !== undefined && n < c.validacion.min) return { ok: false, error: `Mínimo ${c.validacion.min}` };
      if (c.validacion?.max !== undefined && n > c.validacion.max) return { ok: false, error: `Máximo ${c.validacion.max}` };
      return { ok: true, valor: n };
    }
    case "fecha": {
      const t = String(v).trim();
      const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/) ?? t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (!m) return { ok: false, error: "Fecha no válida (AAAA-MM-DD)" };
      const iso = m[1].length === 4 ? `${m[1]}-${m[2]}-${m[3]}` : `${m[3]}-${m[2]}-${m[1]}`;
      return Number.isNaN(Date.parse(iso)) ? { ok: false, error: "Fecha no válida" } : { ok: true, valor: iso };
    }
    case "booleano":
      return typeof v === "boolean" ? { ok: true, valor: v } : { ok: true, valor: ["true", "si", "sí", "1"].includes(String(v).toLowerCase()) };
    case "opcion": {
      const t = String(v).trim();
      return c.opciones?.includes(t) ? { ok: true, valor: t } : { ok: false, error: "Valor no permitido" };
    }
  }
}
