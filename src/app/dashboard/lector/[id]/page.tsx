import { notFound } from "next/navigation";
import { LectorVista } from "@/components/lector-vista";

export const metadata = { title: "Lector de contratos · Gestión inmobiliaria" };

export default async function LectorPage({ params }: { params: Promise<{ id: string }> }) {
  const n = Number((await params).id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return <LectorVista id={n} />;
}
