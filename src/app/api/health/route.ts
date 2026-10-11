import { NextResponse } from "next/server";
import { getHealthReport } from "@/lib/health";

export const dynamic = "force-dynamic";

export async function GET() {
  const report = await getHealthReport();
  return NextResponse.json(report, { headers: { "Cache-Control": "no-store" } });
}
