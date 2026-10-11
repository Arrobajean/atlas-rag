import { EMBED_MODEL, embedTexts } from "@/lib/rag";
import { trocear, type Fragmento } from "./chunk";
import { extraerPaginas, type PaginaTexto } from "./extract";
import { ocrConGemini } from "./ocr";
import { supabaseRepo, type NuevoFragmento, type RepoDocumentos } from "./repo";
import { rutaNueva, sha256 } from "./storage";

export const TIPOS_DOCUMENTO = [
  "contrato", "normas_comunidad", "acta_junta", "estatutos", "inventario",
  "certificado_energetico", "factura", "legal", "procedimiento_interno", "general",
] as const;
export type TipoDocumento = (typeof TIPOS_DOCUMENTO)[number];

export interface DatosDocumento {
  titulo: string;
  tipo: TipoDocumento;
  edificio_id?: number | null;
  unidad_id?: number | null;
  contrato_id?: number | null;
  fecha_documento?: string | null;
  /** Documento al que sustituye: pasa a no vigente y este lo reemplaza en las búsquedas. */
  sustituye_a?: number | null;
}

export interface ResultadoIndexado {
  documento_id: number;
  fragmentos: number;
  paginas: number;
  ocr: boolean;
  duplicado?: boolean;
}

/** Dependencias sustituibles (tests, caché de embeddings en el seed…). */
export interface OpcionesIngesta {
  repo?: RepoDocumentos;
  embed?: (textos: string[]) => Promise<number[][]>;
  ocr?: (data: Uint8Array) => Promise<PaginaTexto[]>;
  /** Prefijo de la ruta en Storage (el seed usa "seed/"). */
  prefijoRuta?: string;
}

const vectorizar = (textos: string[]) => embedTexts(textos, "RETRIEVAL_DOCUMENT", { pauseMs: 300 });
const mensaje = (err: unknown) => (err instanceof Error ? err.message.slice(0, 500) : "Error desconocido");

/** Crea la fila del documento (estado "pendiente"). */
export async function crearDocumento(
  datos: DatosDocumento,
  extra: { storage_path?: string; mime?: string; hash?: string },
  { repo = supabaseRepo() }: OpcionesIngesta = {}
) {
  const id = await repo.crear({
    titulo: datos.titulo.trim(),
    tipo: datos.tipo,
    edificio_id: datos.edificio_id ?? null,
    unidad_id: datos.unidad_id ?? null,
    contrato_id: datos.contrato_id ?? null,
    fecha_documento: datos.fecha_documento ?? null,
    sustituye_a: datos.sustituye_a ?? null,
    storage_path: extra.storage_path ?? null,
    mime: extra.mime ?? null,
    hash_sha256: extra.hash ?? null,
  });
  if (datos.sustituye_a) await repo.actualizar(datos.sustituye_a, { vigente: false });
  return id;
}

/** Embeddings + inserción de fragmentos. Reemplaza los que hubiera. */
export async function guardarFragmentos(documentoId: number, fragmentos: Fragmento[], { repo = supabaseRepo(), embed = vectorizar }: OpcionesIngesta = {}) {
  const vectores = await embed(fragmentos.map((f) => f.contenido));
  const filas: NuevoFragmento[] = fragmentos.map((f, i) => ({
    documento_id: documentoId,
    orden: f.orden,
    pagina: f.pagina,
    seccion: f.seccion,
    contenido: f.contenido,
    embedding: vectores[i],
    embedding_model: EMBED_MODEL,
  }));
  await repo.reemplazarFragmentos(documentoId, filas);
}

/** Indexa un documento ya registrado: descarga (o usa `data`), extrae, trocea, vectoriza. */
export async function indexarDocumento(documentoId: number, data?: Uint8Array, opciones: OpcionesIngesta = {}): Promise<ResultadoIndexado> {
  const repo = opciones.repo ?? supabaseRepo();
  const doc = await repo.obtener(documentoId);
  if (!doc) throw new Error(`Documento ${documentoId} no encontrado`);

  await repo.actualizar(documentoId, { estado_indexado: "procesando", error: null });
  try {
    if (!data && !doc.storage_path) throw new Error("El documento no tiene archivo");
    const bytes = data ?? (await repo.archivos.descargar(doc.storage_path!));
    const extraido = await extraerPaginas(bytes, doc.storage_path ?? doc.titulo, doc.mime);
    const ocr = extraido.escaneado;
    const paginas = ocr ? await (opciones.ocr ?? ocrConGemini)(bytes) : extraido.paginas;
    const fragmentos = trocear(paginas);
    if (fragmentos.length === 0) throw new Error("El documento no contiene texto legible");

    await guardarFragmentos(documentoId, fragmentos, { ...opciones, repo });
    const totalPaginas = paginas.reduce((max, p) => Math.max(max, p.pagina), 0);
    await repo.actualizar(documentoId, { estado_indexado: "indexado", paginas: totalPaginas, embedding_model: EMBED_MODEL, error: null });
    return { documento_id: documentoId, fragmentos: fragmentos.length, paginas: totalPaginas, ocr };
  } catch (err) {
    await repo.actualizar(documentoId, { estado_indexado: "error", error: mensaje(err) });
    throw err;
  }
}

/** Sube un archivo a Storage, lo registra y lo indexa. Si ya existe (mismo hash) devuelve el existente. */
export async function subirEIndexar(
  archivo: { nombre: string; mime: string; data: Uint8Array },
  datos: DatosDocumento,
  opciones: OpcionesIngesta = {}
): Promise<ResultadoIndexado> {
  const repo = opciones.repo ?? supabaseRepo();
  const hash = await sha256(archivo.data);
  const existente = await repo.porHash(hash);
  if (existente) {
    return { documento_id: existente.id, fragmentos: 0, paginas: existente.paginas ?? 0, ocr: false, duplicado: true };
  }

  const ruta = (opciones.prefijoRuta ?? "") + rutaNueva(datos.tipo, archivo.nombre);
  await repo.archivos.subir(ruta, archivo.data, archivo.mime || "application/octet-stream");
  let id: number;
  try {
    id = await crearDocumento(datos, { storage_path: ruta, mime: archivo.mime, hash }, { ...opciones, repo });
  } catch (err) {
    await repo.archivos.borrar([ruta]).catch(() => undefined);
    throw err;
  }
  return indexarDocumento(id, archivo.data, { ...opciones, repo });
}

/** Texto pegado por el usuario (sin archivo en Storage). */
export async function indexarTexto(contenido: string, datos: DatosDocumento, opciones: OpcionesIngesta = {}): Promise<ResultadoIndexado> {
  const repo = opciones.repo ?? supabaseRepo();
  const fragmentos = trocear([{ pagina: 1, texto: contenido }]);
  if (fragmentos.length === 0) throw new Error("El contenido está vacío");
  const id = await crearDocumento(datos, { mime: "text/plain" }, { ...opciones, repo });
  try {
    await guardarFragmentos(id, fragmentos, { ...opciones, repo });
    await repo.actualizar(id, { estado_indexado: "indexado", paginas: 1, embedding_model: EMBED_MODEL });
  } catch (err) {
    await repo.actualizar(id, { estado_indexado: "error", error: mensaje(err) });
    throw err;
  }
  return { documento_id: id, fragmentos: fragmentos.length, paginas: 1, ocr: false };
}

/** Borra el documento, sus fragmentos (cascada) y el archivo de Storage. */
export async function eliminarDocumento(documentoId: number, { repo = supabaseRepo() }: OpcionesIngesta = {}) {
  const doc = await repo.obtener(documentoId);
  await repo.eliminar(documentoId);
  if (doc?.storage_path) await repo.archivos.borrar([doc.storage_path]);
  // Si sustituía a otro y ya no existe el sustituto, el anterior vuelve a ser el vigente
  if (doc?.sustituye_a) await repo.actualizar(doc.sustituye_a, { vigente: true });
}
