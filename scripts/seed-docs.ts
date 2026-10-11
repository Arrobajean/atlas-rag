// Genera los documentos sintéticos (PDF/MD) coherentes con la base de datos y los indexa en Supabase.
//   pnpm seed:docs            → genera seed-output/pdfs y los sube + indexa (requiere haber ejecutado pnpm seed)
//   pnpm seed:docs -- --reset → borra antes los documentos del seed (BD y Storage)
//   pnpm seed:docs -- --solo-generar → solo escribe los archivos, sin tocar Supabase
import { getSupabaseClient } from "../src/lib/rag";
import { supabaseRepo } from "../src/lib/documents/repo";
import { BUCKET } from "../src/lib/documents/storage";
import { buildDataset } from "./seed/dataset";
import { generarArchivos, indexarSeed, SALIDA } from "./lib/sembrar-docs";

try {
  process.loadEnvFile(".env");
} catch {
  // sin .env
}

const args = new Set(process.argv.slice(2));

async function borrarAnteriores() {
  const supabase = getSupabaseClient();
  const { data } = await supabase.from("documentos").select("id, storage_path").like("storage_path", "seed/%");
  const rutas = (data ?? []).map((d) => d.storage_path as string);
  if (rutas.length) {
    for (let i = 0; i < rutas.length; i += 100) await supabase.storage.from(BUCKET).remove(rutas.slice(i, i + 100));
    await supabase.from("documentos").delete().like("storage_path", "seed/%");
  }
  console.log(`· Borrados ${rutas.length} documentos anteriores del seed`);
}

async function main() {
  console.log("Generando dataset y documentos…");
  const ds = buildDataset();
  const { plan, archivos } = await generarArchivos(ds);
  console.log(`· ${archivos.length} documentos + ${plan.pruebaLector.length} contratos de prueba para el lector → ${SALIDA}`);
  if (args.has("--solo-generar")) return;

  if (args.has("--reset")) await borrarAnteriores();

  const supabase = getSupabaseClient();
  const { count } = await supabase.from("documentos").select("id", { count: "exact", head: true }).like("storage_path", "seed/%");
  if ((count ?? 0) > 0) throw new Error(`Ya hay ${count} documentos del seed. Usa --reset para regenerarlos.`);

  console.log("Subiendo e indexando (usa la API de Gemini para los embeddings)…");
  await indexarSeed(archivos, {
    repo: supabaseRepo(),
    log: console.log,
    vincularContrato: async (contratoId, documentoId) => {
      const { error } = await supabase.from("contratos").update({ documento_id: documentoId }).eq("id", contratoId);
      if (error) throw new Error(`No se pudo vincular el contrato ${contratoId}: ${error.message}`);
    },
  });
  console.log("\nListo. Contratos de prueba para el lector en seed-output/pdfs/prueba-lector/");
}

main().catch((err) => {
  console.error("\n✘", err instanceof Error ? err.message : err);
  process.exit(1);
});
