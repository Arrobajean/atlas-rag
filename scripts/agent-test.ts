// Prueba el agente completo (Gemini real + herramientas) contra los datos del seed en PGlite.
//   pnpm agent:test                       → batería de preguntas de ejemplo
//   pnpm agent:test -- "¿Cuántos pisos libres hay en Madrid Sur?"
import { ejecutarAgente } from "../src/lib/chat/agent";
import type { ChatEvent } from "../src/lib/chat/types";
import { buildDataset, TABLAS_EN_ORDEN } from "./seed/dataset";
import { createTestDb } from "./lib/pglite";
import { pgliteData } from "./lib/pglite-data";
import { sqlSink } from "./lib/sinks";
import { embedConCache } from "./lib/embed-cache";
import { pgliteRepo } from "./lib/pglite-repo";
import { generarArchivos, indexarSeed } from "./lib/sembrar-docs";

try {
  process.loadEnvFile(".env");
} catch {
  // sin .env
}

const PREGUNTAS = [
  "¿Cuántos pisos libres para alquilar hay en Madrid Sur?",
  "¿Cuántas propiedades tenemos en Getafe y cuántas están alquiladas?",
  "Dame los 3 pisos disponibles más baratos de Chamberí",
  "¿Qué contratos vencen en los próximos 30 días en Madrid Centro?",
  "¿Quién vive en Calle de Toledo 45, 3º B y cuándo vence su contrato?",
];

async function main() {
  const extra = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const preguntas = extra.length ? extra : PREGUNTAS;

  console.log("Preparando base de datos de pruebas…");
  const ds = buildDataset();
  const db = await createTestDb();
  const sink = sqlSink("t", db, async () => {});
  for (const t of TABLAS_EN_ORDEN) await sink.insert(t, ds.tablas[t]);
  await sink.finalizar();
  if (process.argv.includes("--docs")) {
    console.log("Indexando documentos (caché de embeddings en seed-output/cache)…");
    const { archivos } = await generarArchivos(ds);
    await indexarSeed(archivos, {
      repo: pgliteRepo(db),
      embed: (t) => embedConCache(t, "RETRIEVAL_DOCUMENT"),
      vincularContrato: async (c, d) => {
        await db.query("update contratos set documento_id = $2 where id = $1", [c, d]);
      },
    });
  }
  const data = pgliteData(db);

  for (const pregunta of preguntas) {
    console.log(`\n══ ${pregunta}`);
    const t0 = Date.now();
    let texto = "";
    const onEvent = (e: ChatEvent) => {
      if (e.type === "tool_start") console.log(`  ▶ ${e.descripcion}`);
      if (e.type === "tool_end") console.log(`    ${e.ok ? "✔" : "✘"} ${e.resumen}`);
      if (e.type === "text") texto += e.delta;
      if (e.type === "accion") console.log(`  ⚑ ACCIÓN PROPUESTA (${e.accion.tipo}): ${e.accion.resumen}`);
    };
    try {
      await ejecutarAgente({ mensajes: [{ role: "user", content: pregunta }], data, onEvent });
      console.log(`\n${texto.trim()}\n  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
    } catch (err) {
      console.log("  ✘ Error:", err instanceof Error ? err.message.slice(0, 300) : err);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
