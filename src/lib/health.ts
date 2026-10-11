import { chatModel, getGeminiClient, getSupabaseClient } from "@/lib/rag";
import type { HealthReport, ServiceHealth } from "@/lib/types";

const TIMEOUT_MS = 8000;

async function timed(
  id: string,
  name: string,
  detail: string,
  probe: () => Promise<void>
): Promise<ServiceHealth> {
  const start = performance.now();
  try {
    await Promise.race([
      probe(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("Tiempo de espera agotado")), TIMEOUT_MS)),
    ]);
    return { id, name, detail, ok: true, latencyMs: Math.round(performance.now() - start) };
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return { id, name, detail, ok: false, latencyMs: Math.round(performance.now() - start), error };
  }
}

/** Consulta mínima a la tabla de vectores: confirma credenciales y conexión. */
function checkSupabase() {
  return timed("supabase", "Supabase", "pgvector · propiedades", async () => {
    const { error } = await getSupabaseClient().from("documentos").select("id", { head: true, count: "exact" });
    if (error) throw new Error(error.message);
  });
}

/** Lee los metadatos del modelo: valida la API key sin consumir cuota de generación. */
function checkGemini() {
  return timed("gemini", "Google Gemini API", chatModel(), async () => {
    await getGeminiClient().models.get({ model: chatModel() });
  });
}

export async function getHealthReport(): Promise<HealthReport> {
  const services = await Promise.all([checkSupabase(), checkGemini()]);
  return { services, model: chatModel(), checkedAt: new Date().toISOString() };
}
