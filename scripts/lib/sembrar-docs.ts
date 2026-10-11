import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { subirEIndexar, crearDocumento, type DatosDocumento, type OpcionesIngesta } from "../../src/lib/documents/ingest";
import { ocrConGemini } from "../../src/lib/documents/ocr";
import type { PaginaTexto } from "../../src/lib/documents/extract";
import type { Dataset } from "../seed/dataset";
import { planificarDocumentos, type PlanDocumentos } from "../seed/docs/plan";
import { renderMarkdown, renderPdf, type DocSeed } from "../seed/docs/render";

export const SALIDA = join(process.cwd(), "seed-output");

export interface ArchivoSeed {
  doc: DocSeed;
  nombre: string;
  mime: string;
  bytes: Uint8Array;
}

/** Genera los archivos (PDF/MD) del plan y los guarda en seed-output/ para poder abrirlos y subirlos a mano. */
export async function generarArchivos(ds: Dataset): Promise<{ plan: PlanDocumentos; archivos: ArchivoSeed[] }> {
  const plan = planificarDocumentos(ds);
  mkdirSync(join(SALIDA, "pdfs", "prueba-lector"), { recursive: true });
  mkdirSync(join(SALIDA, "eval"), { recursive: true });

  const archivos: ArchivoSeed[] = [];
  for (const doc of plan.docs) {
    const md = doc.tipo === "procedimiento_interno";
    const bytes = md ? renderMarkdown(doc) : await renderPdf(doc);
    const nombre = `${doc.clave}.${md ? "md" : "pdf"}`;
    writeFileSync(join(SALIDA, "pdfs", nombre), bytes);
    archivos.push({ doc, nombre, mime: md ? "text/markdown" : "application/pdf", bytes });
  }
  for (const prueba of plan.pruebaLector) {
    writeFileSync(join(SALIDA, "pdfs", "prueba-lector", `${prueba.clave}.pdf`), await renderPdf(prueba));
  }
  writeFileSync(join(SALIDA, "eval", "hechos.json"), JSON.stringify(plan.hechos, null, 2));
  return { plan, archivos };
}

/** OCR con caché en disco por hash del archivo (evita repetir llamadas a Gemini). */
export async function ocrConCache(data: Uint8Array): Promise<PaginaTexto[]> {
  const dir = join(SALIDA, "cache");
  mkdirSync(dir, { recursive: true });
  const fichero = join(dir, `ocr-${createHash("sha1").update(data).digest("hex")}.json`);
  if (existsSync(fichero)) return JSON.parse(readFileSync(fichero, "utf8")) as PaginaTexto[];
  const paginas = await ocrConGemini(data);
  writeFileSync(fichero, JSON.stringify(paginas));
  return paginas;
}

export interface OpcionesSembrado extends OpcionesIngesta {
  /** Vincula el contrato con su PDF (contratos.documento_id). */
  vincularContrato: (contratoId: number, documentoId: number) => Promise<void>;
  log?: (msg: string) => void;
}

/** Indexa los archivos del plan con el pipeline real de la aplicación. Devuelve clave → id de documento. */
export async function indexarSeed(archivos: ArchivoSeed[], opciones: OpcionesSembrado): Promise<Map<string, number>> {
  const ids = new Map<string, number>();
  const { vincularContrato, log = () => undefined, ...ingesta } = opciones;
  let n = 0;
  for (const a of archivos) {
    n += 1;
    const d = a.doc;
    const datos: DatosDocumento = {
      titulo: d.titulo,
      tipo: d.tipo,
      edificio_id: d.edificio_id ?? null,
      unidad_id: d.unidad_id ?? null,
      contrato_id: d.contrato_id ?? null,
      fecha_documento: d.fecha,
      sustituye_a: d.sustituye ? ids.get(d.sustituye) ?? null : null,
    };
    const t0 = Date.now();
    const r = await subirEIndexar({ nombre: a.nombre, mime: a.mime, data: a.bytes }, datos, { ...ingesta, prefijoRuta: "seed/", ocr: ingesta.ocr ?? ocrConCache });
    ids.set(d.clave, r.documento_id);
    if (d.contrato_id) await vincularContrato(d.contrato_id, r.documento_id);
    log(`  [${String(n).padStart(2)}/${archivos.length}] ${a.nombre.padEnd(52)} ${r.duplicado ? "duplicado" : `${r.fragmentos} fragmentos${r.ocr ? " (OCR)" : ""}`}  ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  }
  return ids;
}

export { crearDocumento };
