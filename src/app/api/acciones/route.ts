import { z } from "zod";
import { ejecutarAccion } from "@/lib/acciones";
import { manejar } from "@/lib/api-server";
import { sesionDe } from "@/lib/auth";
import { supabaseData } from "@/lib/chat/data";
import { embedTexts, getSupabaseClient } from "@/lib/rag";

/**
 * Ejecuta una acción que el asistente propuso y que el usuario CONFIRMÓ en pantalla.
 * La base de datos vuelve a validar todo (lista cerrada de acciones, existencia de referencias, estados permitidos).
 */
export async function POST(req: Request) {
  return manejar(async () => {
    const { tipo, datos } = z.object({ tipo: z.string().min(1).max(60), datos: z.record(z.string(), z.unknown()) }).parse(await req.json());
    const sesion = await sesionDe(req);
    const r = await ejecutarAccion(supabaseData(), tipo, datos, sesion?.rol ?? null);

    // Las notas del cliente alimentan la afinidad semántica: se vectorizan (si falla, no bloquea la acción)
    if (r.cliente_id && r.notas) {
      try {
        const [vec] = await embedTexts([r.notas], "RETRIEVAL_DOCUMENT");
        await getSupabaseClient().rpc("rpc_guardar_embeddings", { p_tabla: "clientes", p_filas: [{ id: r.cliente_id, embedding: `[${vec.join(",")}]` }] });
      } catch {
        // sin embedding la demanda funciona igual con los filtros exactos
      }
    }
    return { success: true, resumen: r.resumen, tabla: r.tabla, registro_id: r.registro_id ?? null };
  }, "No se pudo ejecutar la acción");
}
