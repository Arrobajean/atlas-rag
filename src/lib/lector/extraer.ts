import { conModelos, docsModel, getGeminiClient } from "@/lib/rag";
import type { Db } from "@/lib/db";
import type { RepoDocumentos } from "@/lib/documents/repo";
import { cargarCatalogo, esquemaDeSalida, normalizarValor, type CampoCatalogo, type DatoExtraido, type DatosExtraidos } from "./catalogo";

const PROMPT = (campos: CampoCatalogo[]) => `Eres un asistente que lee contratos de arrendamiento en España y extrae datos para revisarlos.

Extrae SOLO lo que figure en el documento. Si un dato no aparece, pon encontrado=false y un valor vacío (0, "" o false): NO lo inventes ni lo deduzcas.
- Fechas en formato AAAA-MM-DD. Importes como número en euros (1250.5), sin símbolo.
- "texto": cita literal y breve del documento que respalda el valor (tal cual aparece, para poder localizarla).
- "pagina": número de página donde aparece (empezando en 1).
- "confianza": 0 a 1. Baja la confianza si el texto es ilegible, ambiguo o contradictorio.
- Para "fecha de fin" usa el último día de la duración pactada (sin prórrogas).
- El "arrendador" es quien cede el inmueble; el "inquilino" o arrendatario quien lo ocupa.
- Si una cláusula prohíbe algo (mascotas, fumar, subarriendo), el booleano correspondiente es false; si lo permite, true.

Campos a extraer (${campos.length}): ${campos.map((c) => c.clave).join(", ")}.`;

export interface ResultadoExtraccion {
  datos: DatosExtraidos;
  modelo: string;
  avisos: string[];
}

/** Lee el PDF con Gemini y devuelve los datos del catálogo con procedencia (página + cita) y confianza. */
export async function extraerContrato(bytes: Uint8Array, campos: CampoCatalogo[], mime = "application/pdf"): Promise<ResultadoExtraccion> {
  const client = getGeminiClient();
  let usado = docsModel();
  const res = await conModelos(docsModel(), (modelo) => {
    usado = modelo;
    return client.models.generateContent({
      model: modelo,
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType: mime, data: Buffer.from(bytes).toString("base64") } }, { text: PROMPT(campos) }],
        },
      ],
      config: { temperature: 0, responseMimeType: "application/json", responseJsonSchema: esquemaDeSalida(campos) },
    });
  });

  let bruto: Record<string, Partial<DatoExtraido>>;
  try {
    bruto = JSON.parse(res.text ?? "{}");
  } catch {
    throw new Error("El modelo no devolvió un JSON válido; vuelve a intentarlo");
  }

  const datos: DatosExtraidos = {};
  const avisos: string[] = [];
  for (const c of campos) {
    const r = bruto[c.clave];
    if (!r || r.encontrado === false) {
      datos[c.clave] = { valor: null, confianza: 0, pagina: null, texto: null, encontrado: false };
      continue;
    }
    const n = normalizarValor(c, r.valor);
    if (!n.ok || n.valor === null) {
      datos[c.clave] = { valor: null, confianza: 0, pagina: r.pagina ?? null, texto: r.texto ?? null, encontrado: false };
      if (!n.ok) avisos.push(`${c.etiqueta}: el valor leído («${String(r.valor)}») no es válido (${n.error}).`);
      continue;
    }
    datos[c.clave] = {
      valor: n.valor,
      confianza: Math.min(1, Math.max(0, Number(r.confianza ?? 0.5))),
      pagina: r.pagina && r.pagina > 0 ? Math.round(r.pagina) : null,
      texto: r.texto ? String(r.texto).slice(0, 240) : null,
      encontrado: true,
    };
  }
  return { datos, modelo: usado, avisos };
}

/** Crea el borrador de extracción de un documento ya subido. */
export async function crearExtraccion(db: Db, repo: RepoDocumentos, documentoId: number): Promise<{ id: number; avisos: string[] }> {
  const doc = await repo.obtener(documentoId);
  if (!doc?.storage_path) throw new Error("El documento no tiene archivo");
  const previas = await db.seleccionar<{ id: number; estado: string }>("extracciones", { igual: { documento_id: documentoId } });
  const abierta = previas.find((p) => p.estado === "borrador");
  if (abierta) return { id: abierta.id, avisos: [] };

  const fila = await db.insertar<{ id: number }>("extracciones", { documento_id: documentoId, tipo_documento: "contrato", estado: "procesando" });
  try {
    const campos = await cargarCatalogo(db, "contrato");
    const bytes = await repo.archivos.descargar(doc.storage_path);
    const r = await extraerContrato(bytes, campos, doc.mime?.startsWith("application/pdf") ? doc.mime : "application/pdf");
    await db.actualizar("extracciones", fila.id, { estado: "borrador", datos: r.datos, modelo: r.modelo });
    return { id: fila.id, avisos: r.avisos };
  } catch (err) {
    await db.actualizar("extracciones", fila.id, { estado: "error", error: err instanceof Error ? err.message.slice(0, 500) : "Error" });
    throw err;
  }
}
