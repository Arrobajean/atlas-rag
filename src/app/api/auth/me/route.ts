import { NextResponse } from "next/server";
import { accesoAbierto, sesionDe } from "@/lib/auth";

export async function GET(req: Request) {
  const s = await sesionDe(req);
  return NextResponse.json({ rol: s?.rol ?? null, abierto: accesoAbierto() });
}
