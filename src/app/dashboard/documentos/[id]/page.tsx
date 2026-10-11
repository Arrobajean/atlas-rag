import { notFound } from "next/navigation";
import { DocumentoDetalle } from "@/components/documento-detalle";

export const metadata = { title: "Documento · Gestión inmobiliaria" };

export default async function DocumentoPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ pagina?: string }> }) {
  const { id } = await params;
  const { pagina } = await searchParams;
  const n = Number(id);
  if (!Number.isInteger(n) || n <= 0) notFound();
  return <DocumentoDetalle id={n} paginaInicial={Number(pagina) || 1} />;
}
