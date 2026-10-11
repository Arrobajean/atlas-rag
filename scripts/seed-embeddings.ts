// Calcula los embeddings de las descripciones de propiedades y de las notas de clientes en Supabase.
//   pnpm seed:embeddings
// Se puede repetir: solo procesa las filas sin embedding (y usa caché en seed-output/cache).
import { getSupabaseClient } from "../src/lib/rag";
import { embeberFilas } from "./lib/embeber";

try {
  process.loadEnvFile(".env");
} catch {
  // sin .env
}

async function pendientes(tabla: "unidades" | "clientes") {
  const supabase = getSupabaseClient();
  const columnaTexto = tabla === "unidades" ? "descripcion" : "notas";
  const columnaVector = tabla === "unidades" ? "descripcion_embedding" : "notas_embedding";
  const filas: { id: number; texto: string }[] = [];
  for (let desde = 0; ; desde += 1000) {
    const { data, error } = await supabase.from(tabla).select(`id, ${columnaTexto}`).is(columnaVector, null).not(columnaTexto, "is", null).order("id").range(desde, desde + 999);
    if (error) throw new Error(`${tabla}: ${error.message}`);
    for (const r of (data ?? []) as unknown as Record<string, unknown>[]) filas.push({ id: Number(r.id), texto: String(r[columnaTexto]) });
    if (!data || data.length < 1000) break;
  }
  return filas;
}

async function main() {
  const supabase = getSupabaseClient();
  for (const tabla of ["unidades", "clientes"] as const) {
    const filas = await pendientes(tabla);
    console.log(`${tabla}: ${filas.length} filas sin embedding`);
    await embeberFilas(
      filas,
      async (lote) => {
        const { error } = await supabase.rpc("rpc_guardar_embeddings", {
          p_tabla: tabla,
          p_filas: lote.map((l) => ({ id: l.id, embedding: `[${l.embedding.join(",")}]` })),
        });
        if (error) throw new Error(`rpc_guardar_embeddings(${tabla}): ${error.message}`);
      },
      console.log
    );
  }
  console.log("Listo.");
}

main().catch((err) => {
  console.error("\n✘", err instanceof Error ? err.message : err);
  process.exit(1);
});
