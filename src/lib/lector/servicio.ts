import type { Db } from "@/lib/db";
import type { RepoDocumentos } from "@/lib/documents/repo";
import { cargarCatalogo, normalizarValor, type CampoCatalogo, type DatosExtraidos } from "./catalogo";
import { compararConBd, contextoDeUnidad, sugerirEntidades, type Comparacion, type ContextoLector } from "./resolver";
import { revisarContrato, type Hallazgo, type Valores } from "./revisor";

export interface ExtraccionFila {
  id: number;
  documento_id: number;
  tipo_documento: string;
  estado: "procesando" | "borrador" | "confirmado" | "descartado" | "error";
  datos: DatosExtraidos;
  valores_finales: Valores | null;
  resolucion: Resolucion | null;
  contrato_id: number | null;
  modelo: string | null;
  error: string | null;
  created_at: string;
}

export interface Resolucion {
  unidad_id: number | null;
  inquilino: { modo: "crear" | "existente"; id?: number | null };
}

/** Valores iniciales del formulario: lo que el agente ya editó, o si no lo que leyó la IA. */
function valoresIniciales(campos: CampoCatalogo[], f: ExtraccionFila): Valores {
  const v: Valores = {};
  for (const c of campos) {
    const editado = f.valores_finales?.[c.clave];
    v[c.clave] = editado !== undefined ? editado : (f.datos[c.clave]?.valor ?? null);
  }
  return v;
}

/** Todo lo que necesita la pantalla del lector en una sola llamada. */
export async function estadoLector(db: Db, repo: RepoDocumentos, extraccionId: number, unidadElegida?: number | null) {
  const [f] = await db.seleccionar<ExtraccionFila>("extracciones", { igual: { id: extraccionId } });
  if (!f) throw new Error("Extracción no encontrada");
  const campos = await cargarCatalogo(db, f.tipo_documento);
  const doc = await repo.obtener(f.documento_id);
  const valores = valoresIniciales(campos, f);

  const sugerencias = f.estado === "borrador" ? await sugerirEntidades(db, f.datos) : null;
  const unidadId = unidadElegida ?? f.resolucion?.unidad_id ?? sugerencias?.unidadSugerida ?? null;
  const ctx: ContextoLector | null = unidadId
    ? await contextoDeUnidad(db, unidadId, (valores.contrato_fecha_inicio as string) ?? null, (valores.contrato_fecha_fin as string) ?? null)
    : null;
  const comparaciones: Comparacion[] = ctx ? compararConBd(f.datos, ctx) : [];
  if (ctx?.propietario) ctx.propietario.documento = `****${ctx.propietario.documento.slice(-4)}`;

  return {
    extraccion: { id: f.id, estado: f.estado, documento_id: f.documento_id, contrato_id: f.contrato_id, modelo: f.modelo, error: f.error, creada: f.created_at },
    documento: doc ? { id: doc.id, titulo: doc.titulo } : null,
    campos,
    datos: f.datos,
    valores,
    resolucion: f.resolucion ?? { unidad_id: unidadId, inquilino: { modo: sugerencias?.inquilinoSugerido ? "existente" : "crear", id: sugerencias?.inquilinoSugerido ?? null } },
    sugerencias,
    contexto: ctx,
    comparaciones,
    hallazgos: revisarContrato(valores, ctx),
  };
}

/** Guarda el borrador editado (sin escribir en las tablas reales). */
export async function guardarBorrador(db: Db, id: number, valores: Valores, resolucion: Resolucion | null) {
  const [f] = await db.seleccionar<ExtraccionFila>("extracciones", { igual: { id } });
  if (!f || f.estado !== "borrador") throw new Error("Solo se pueden editar borradores");
  const campos = await cargarCatalogo(db, f.tipo_documento);
  const limpios: Valores = {};
  for (const c of campos) if (c.clave in valores) limpios[c.clave] = valores[c.clave] ?? null;
  await db.actualizar("extracciones", id, { valores_finales: limpios, resolucion });
}

export class ErrorValidacion extends Error {
  constructor(public errores: Record<string, string>) {
    super(Object.values(errores)[0] ?? "Datos no válidos");
  }
}

/**
 * Confirma el borrador. Solo pasan los campos del catálogo (el resto se descarta), cada valor se valida
 * aquí y otra vez en la base de datos, y todo se escribe en una única transacción (RPC).
 */
export async function confirmarExtraccion(db: Db, id: number, valores: Valores, resolucion: Resolucion, usuario: string | null) {
  const [f] = await db.seleccionar<ExtraccionFila>("extracciones", { igual: { id } });
  if (!f) throw new Error("Extracción no encontrada");
  if (f.estado !== "borrador") throw new Error(`La extracción está «${f.estado}» y no puede confirmarse`);
  if (!resolucion.unidad_id) throw new Error("Elige la unidad a la que pertenece el contrato");

  const campos = await cargarCatalogo(db, f.tipo_documento);
  const limpios: Record<string, string | number | boolean | null> = {};
  const errores: Record<string, string> = {};
  for (const c of campos) {
    if (c.escritura === "solo_lectura") continue;
    if (c.entidad === "inquilino" && resolucion.inquilino.modo === "existente") continue;
    const n = normalizarValor(c, valores[c.clave]);
    if (!n.ok) errores[c.clave] = `${c.etiqueta}: ${n.error}`;
    else if (n.valor === null && c.obligatorio) errores[c.clave] = `${c.etiqueta}: obligatorio`;
    else limpios[c.clave] = n.valor;
  }
  if (Object.keys(errores).length) throw new ErrorValidacion(errores);

  const inicio = limpios.contrato_fecha_inicio as string;
  const fin = limpios.contrato_fecha_fin as string;
  const ctx = await contextoDeUnidad(db, resolucion.unidad_id, inicio, fin);
  const hallazgos = revisarContrato(limpios, ctx);

  const r = await db.rpc<{ contrato_id: number; referencia: string; inquilino_id: number; unidad_id: number }>("rpc_confirmar_extraccion", {
    p_extraccion_id: id,
    p_valores: limpios,
    p_resolucion: resolucion,
    p_usuario: usuario,
  });

  await db.insertar("revisiones_contrato", {
    contrato_id: r.contrato_id,
    extraccion_id: id,
    hallazgos,
    resumen: hallazgos.length ? `${hallazgos.filter((h) => h.severidad === "alta").length} alertas altas, ${hallazgos.length} hallazgos` : "Sin hallazgos",
  });
  return { ...r, hallazgos };
}

export async function descartarExtraccion(db: Db, id: number, usuario: string | null) {
  const [f] = await db.seleccionar<ExtraccionFila>("extracciones", { igual: { id } });
  if (!f || f.estado !== "borrador") throw new Error("Solo se pueden descartar borradores");
  await db.actualizar("extracciones", id, { estado: "descartado", confirmado_por: usuario });
}

export type { Hallazgo };
