import { NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db";
import { manejar } from "@/lib/api-server";

export async function GET(_req: Request, ctx: { params: Promise<{ ref: string }> }) {
  return manejar(async () => {
    const { ref } = await ctx.params;
    const db = supabaseDb();
    const ficha = await db.rpc<Record<string, unknown> | null>("rpc_ficha_unidad", { p_ref: ref });
    if (!ficha) return NextResponse.json({ error: "Propiedad no encontrada" }, { status: 404 });
    const id = (ficha.unidad as { id: number }).id;
    const clientes = await db.rpc<unknown[]>("rpc_coincidencias_unidad", { p_unidad: id, p_limite: 8 });
    return { ...ficha, clientes_interesados: clientes };
  });
}
