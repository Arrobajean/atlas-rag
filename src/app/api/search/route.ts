import { NextResponse } from "next/server";
import { describeError, embedQuery, getSupabaseClient, toVector } from "@/lib/rag";

/** Búsqueda híbrida (semántica + texto) en documentos, con filtros opcionales de ámbito y tipo. */
export async function POST(req: Request) {
  try {
    const { query, k, tipos, unidad_id, edificio_id, incluir_no_vigentes } = await req.json();
    if (!query || typeof query !== "string") {
      return NextResponse.json({ error: "Consulta no proporcionada" }, { status: 400 });
    }

    const vec = await embedQuery(query);
    const { data, error } = await getSupabaseClient().rpc("rpc_buscar_documentos", {
      query_embedding: toVector(vec),
      query_text: query,
      p_unidad: unidad_id ?? null,
      p_edificio: edificio_id ?? null,
      p_tipos: Array.isArray(tipos) && tipos.length ? tipos : null,
      p_count: Math.min(Math.max(Number(k) || 8, 1), 20),
      p_incluir_no_vigentes: !!incluir_no_vigentes,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ matches: data ?? [] });
  } catch (error: unknown) {
    const { message, status } = describeError(error, "Error en la búsqueda");
    return NextResponse.json({ error: message }, { status });
  }
}
