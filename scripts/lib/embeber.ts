import { embedConCache } from "./embed-cache";

export interface FilaTexto {
  id: number;
  texto: string;
}

/** Calcula embeddings por lotes (con caché en disco) y los entrega a `guardar`. Devuelve cuántos guardó. */
export async function embeberFilas(
  filas: FilaTexto[],
  guardar: (lote: { id: number; embedding: number[] }[]) => Promise<void>,
  log: (msg: string) => void = () => undefined
): Promise<number> {
  const LOTE = 100;
  let hechos = 0;
  for (let i = 0; i < filas.length; i += LOTE) {
    const lote = filas.slice(i, i + LOTE);
    const vectores = await embedConCache(lote.map((f) => f.texto), "RETRIEVAL_DOCUMENT");
    await guardar(lote.map((f, k) => ({ id: f.id, embedding: vectores[k] })));
    hechos += lote.length;
    log(`  ${hechos}/${filas.length}`);
  }
  return hechos;
}
