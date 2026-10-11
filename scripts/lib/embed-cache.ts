import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { EMBED_DIMS, EMBED_MODEL, embedTexts, type EmbedTask } from "../../src/lib/rag";

const DIR = join(process.cwd(), "seed-output", "cache");
const FICHERO = join(DIR, `embeddings-${EMBED_MODEL}-${EMBED_DIMS}.json`);

type Cache = Record<string, string>; // clave → Float32 en base64

let cache: Cache | null = null;

function cargar(): Cache {
  if (cache) return cache;
  mkdirSync(DIR, { recursive: true });
  cache = existsSync(FICHERO) ? (JSON.parse(readFileSync(FICHERO, "utf8")) as Cache) : {};
  return cache;
}

const clave = (task: EmbedTask, texto: string) => createHash("sha1").update(`${task}\n${texto}`).digest("hex");
const codificar = (v: number[]) => Buffer.from(new Float32Array(v).buffer).toString("base64");
const decodificar = (b: string) => Array.from(new Float32Array(new Uint8Array(Buffer.from(b, "base64")).buffer));

/** Embeddings con caché en disco: repetir el seed o las pruebas no vuelve a gastar cuota de Gemini. */
export async function embedConCache(textos: string[], task: EmbedTask = "RETRIEVAL_DOCUMENT", onProgreso?: (hechos: number, total: number) => void): Promise<number[][]> {
  const c = cargar();
  const pendientes = [...new Set(textos.filter((t) => !c[clave(task, t)]))];
  const LOTE = 50;
  for (let i = 0; i < pendientes.length; i += LOTE) {
    const lote = pendientes.slice(i, i + LOTE);
    const vectores = await embedTexts(lote, task, { batchSize: LOTE });
    lote.forEach((t, k) => (c[clave(task, t)] = codificar(vectores[k])));
    writeFileSync(FICHERO, JSON.stringify(c));
    onProgreso?.(Math.min(i + LOTE, pendientes.length), pendientes.length);
    if (i + LOTE < pendientes.length) await new Promise((r) => setTimeout(r, 700));
  }
  return textos.map((t) => decodificar(c[clave(task, t)]));
}
