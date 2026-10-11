export interface PaginaTexto {
  pagina: number;
  texto: string;
}

export interface Extraccion {
  paginas: PaginaTexto[];
  /** true si el PDF parece un escaneo (casi sin capa de texto) y necesita OCR. */
  escaneado: boolean;
}

const MIN_CARACTERES_POR_PAGINA = 40;

export function esPdf(nombre: string, mime?: string | null) {
  return mime === "application/pdf" || nombre.toLowerCase().endsWith(".pdf");
}

/** Extrae el texto página a página. Para PDFs sin texto marca `escaneado` para que se aplique OCR. */
export async function extraerPaginas(data: Uint8Array, nombre: string, mime?: string | null): Promise<Extraccion> {
  if (!esPdf(nombre, mime)) {
    const texto = new TextDecoder("utf-8").decode(data);
    // Los archivos de texto pueden marcar páginas con saltos de página (\f)
    const partes = texto.split("\f");
    return {
      paginas: partes.map((t, i) => ({ pagina: i + 1, texto: t })).filter((p) => p.texto.trim()),
      escaneado: false,
    };
  }

  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(data));
  const { text } = await extractText(pdf, { mergePages: false });
  const paginas = text.map((t, i) => ({ pagina: i + 1, texto: normalizar(t) }));

  const conTexto = paginas.filter((p) => p.texto.length >= MIN_CARACTERES_POR_PAGINA).length;
  return { paginas, escaneado: paginas.length > 0 && conTexto / paginas.length < 0.5 };
}

/** Limpia el texto que devuelve pdf.js: espacios repetidos y guiones de fin de línea. */
export function normalizar(texto: string): string {
  return texto
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    // pies de página: "Título · Página 3 de 8" y numeraciones sueltas ("3", "- 3 -", "Página 3 de 8")
    .replace(/^.*[·|]\s*P[áa]gina\s+\d+\s+de\s+\d+\s*$/gim, "")
    .replace(/^\s*[-–]?\s*(P[áa]gina\s+)?\d+(\s+de\s+\d+)?\s*[-–]?\s*$/gim, "")
    .replace(/(\p{L})-\n(\p{L})/gu, "$1$2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
