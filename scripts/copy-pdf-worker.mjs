// Copia el worker de pdf.js a public/ (el visor del lector lo carga desde /pdf.worker.min.mjs).
// Se ejecuta tras instalar dependencias para que coincida siempre con la versión de pdfjs-dist.
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";

try {
  const require = createRequire(import.meta.url);
  const reactPdf = require.resolve("react-pdf/package.json");
  const pdfjs = createRequire(reactPdf).resolve("pdfjs-dist/package.json");
  const origen = join(dirname(pdfjs), "build", "pdf.worker.min.mjs");
  if (existsSync(origen)) {
    mkdirSync("public", { recursive: true });
    copyFileSync(origen, join("public", "pdf.worker.min.mjs"));
    console.log("pdf.worker.min.mjs copiado a public/");
  }
} catch (err) {
  console.warn("No se pudo copiar el worker de pdf.js:", err instanceof Error ? err.message : err);
}
