import { NextResponse } from "next/server";
import { supabaseDb } from "@/lib/db";
import { manejar } from "@/lib/api-server";

export async function GET(_req: Request, ctx: { params: Promise<{ ref: string }> }) {
  return manejar(async () => {
    const { ref } = await ctx.params;
    const r = await supabaseDb().rpc<Record<string, unknown> | null>("rpc_ficha_edificio", { p_ref: ref });
    return r ? r : NextResponse.json({ error: "Edificio no encontrado" }, { status: 404 });
  });
}
