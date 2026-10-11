import { conModelos, docsModel, getGeminiClient } from "@/lib/rag";
import type { PaginaTexto } from "./extract";

const MARCADOR = /^<<<PAGINA\s+(\d+)>>>\s*$/gim;

const PROMPT = `Transcribe fielmente TODO el texto de este documento PDF, página por página.
Reglas:
- Empieza cada página con una línea exacta: <<<PAGINA n>>> (n = número de página, empezando en 1).
- Conserva títulos, numeración de cláusulas y artículos, listas y tablas (las tablas como texto con " | ").
- No resumas, no traduzcas, no añadas comentarios ni explicaciones.
- Si algo es ilegible escribe [ilegible].`;

/** Lee un PDF (por ejemplo, un escaneo) con Gemini y devuelve el texto por página. */
export async function ocrConGemini(data: Uint8Array): Promise<PaginaTexto[]> {
  const client = getGeminiClient();
  const res = await conModelos(docsModel(), (model) =>
    client.models.generateContent({
      model,
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType: "application/pdf", data: Buffer.from(data).toString("base64") } },
            { text: PROMPT },
          ],
        },
      ],
      config: { temperature: 0 },
    })
  );
  return parsearMarcadores(res.text ?? "");
}

export function parsearMarcadores(salida: string): PaginaTexto[] {
  const marcas = [...salida.matchAll(MARCADOR)];
  if (marcas.length === 0) {
    const t = salida.trim();
    return t ? [{ pagina: 1, texto: t }] : [];
  }
  return marcas
    .map((m, i) => {
      const inicio = (m.index ?? 0) + m[0].length;
      const fin = i + 1 < marcas.length ? marcas[i + 1].index : salida.length;
      return { pagina: Number(m[1]), texto: salida.slice(inicio, fin).trim() };
    })
    .filter((p) => p.texto);
}
