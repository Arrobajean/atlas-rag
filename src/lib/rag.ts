import { GoogleGenAI } from "@google/genai";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const EMBED_MODEL = "gemini-embedding-001";
export const EMBED_DIMS = 768;

// Los modelos se leen de forma perezosa: en scripts, .env se carga después de evaluar los imports.
const MODELO_POR_DEFECTO = "gemini-flash-lite-latest";
/** Modelo del chat con herramientas. */
export const chatModel = () => process.env.GEMINI_CHAT_MODEL || MODELO_POR_DEFECTO;
/** Modelo para OCR y extracción de contratos. Por defecto, el del chat (la cuota gratuita es por modelo). */
export const docsModel = () => process.env.GEMINI_DOCS_MODEL || chatModel();
/** Modelos de reserva si el principal agota su cuota diaria (lista separada por comas en GEMINI_FALLBACK_MODELS). */
export const fallbackModels = () =>
  (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.1-flash-lite-preview").split(",").map((m) => m.trim()).filter(Boolean);

let gemini: GoogleGenAI | null = null;
let supabase: SupabaseClient | null = null;

export function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY no configurada en las variables de entorno");
  }
  gemini ??= new GoogleGenAI({ apiKey });
  return gemini;
}

export function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL o SUPABASE_KEY no configuradas en las variables de entorno");
  }
  supabase ??= createClient(url, key, { auth: { persistSession: false } });
  return supabase;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isRetryable(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  return /\b(429|500|502|503|504)\b|RESOURCE_EXHAUSTED|UNAVAILABLE|INTERNAL|fetch failed|ECONNRESET|ETIMEDOUT/i.test(raw);
}

/** Espera sugerida por Gemini en errores 429 ("retryDelay":"27s"), si viene en el mensaje. */
function suggestedDelay(err: unknown): number | null {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  const m = raw.match(/retry(?:Delay)?"?[:\s]+"?(\d+(?:\.\d+)?)s/i) ?? raw.match(/retry in (\d+(?:\.\d+)?)s/i);
  return m ? Math.ceil(Number(m[1]) * 1000) : null;
}

/** Reintenta con espera exponencial ante 429/5xx. La cuota gratuita de Gemini los provoca a menudo. */
export async function withRetry<T>(fn: () => Promise<T>, { attempts = 5, baseMs = 1500, maxMs = 65_000 } = {}): Promise<T> {
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      // La cuota diaria no se recupera esperando unos segundos: se propaga para cambiar de modelo
      if (i === attempts - 1 || !isRetryable(err) || requiereOtroModelo(err)) throw err;
      const wait = Math.min(suggestedDelay(err) ?? baseMs * 2 ** i, maxMs);
      await sleep(wait + Math.random() * 400);
    }
  }
  throw last;
}

/** Cuota diaria agotada o modelo retirado: no sirve reintentar, hay que cambiar de modelo. */
function requiereOtroModelo(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err ?? "");
  return /PerDay|no longer available|NOT_FOUND/i.test(raw) || /"code":\s*404/.test(raw);
}

/**
 * Ejecuta `fn` con el modelo principal y, si su cuota diaria se agotó, con los modelos de reserva.
 * Los 429 por ritmo (RPM) siguen reintentándose con espera dentro de `withRetry`.
 */
export async function conModelos<T>(principal: string, fn: (modelo: string) => Promise<T>): Promise<T> {
  const modelos = [principal, ...fallbackModels().filter((m) => m !== principal)];
  let ultimo: unknown;
  for (const modelo of modelos) {
    try {
      return await withRetry(() => fn(modelo), { attempts: 3 });
    } catch (err) {
      ultimo = err;
      if (!requiereOtroModelo(err)) throw err;
    }
  }
  throw ultimo;
}

export type EmbedTask = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

/** Embeddings de Gemini en lotes secuenciales (evita picos de cuota) y con reintentos. */
export async function embedTexts(
  texts: string[],
  taskType: EmbedTask,
  { batchSize = 50, pauseMs = 0 }: { batchSize?: number; pauseMs?: number } = {}
): Promise<number[][]> {
  const client = getGeminiClient();
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const res = await withRetry(() =>
      client.models.embedContent({
        model: EMBED_MODEL,
        contents: batch,
        config: { taskType, outputDimensionality: EMBED_DIMS },
      })
    );
    const values = (res.embeddings ?? []).map((e) => e.values ?? []);
    if (values.length !== batch.length || values.some((v) => v.length !== EMBED_DIMS)) {
      throw new Error("Gemini devolvió un número de embeddings distinto al esperado");
    }
    vectors.push(...values);
    if (pauseMs && i + batchSize < texts.length) await sleep(pauseMs);
  }
  return vectors;
}

export async function embedQuery(query: string): Promise<number[]> {
  const [vec] = await embedTexts([query], "RETRIEVAL_QUERY");
  if (!vec) throw new Error("No se pudo generar el embedding de la consulta");
  return vec;
}

/** Formato que espera pgvector en parámetros RPC: '[0.1,0.2,…]'. */
export const toVector = (v: number[]) => `[${v.join(",")}]`;

/** Traduce errores del SDK de Gemini a un mensaje legible y su código HTTP. */
export function describeError(error: unknown, fallback: string): { message: string; status: number } {
  const raw = error instanceof Error ? error.message : String(error ?? "");
  if (raw.includes("429") || raw.includes("RESOURCE_EXHAUSTED")) {
    return {
      message: "Se agotó la cuota de Gemini. Espera unos minutos o cambia GEMINI_CHAT_MODEL en .env.",
      status: 429,
    };
  }
  if (raw.includes("503") || raw.includes("UNAVAILABLE")) {
    return { message: "Gemini está saturado en este momento. Inténtalo de nuevo en unos segundos.", status: 503 };
  }
  return { message: raw || fallback, status: 500 };
}
