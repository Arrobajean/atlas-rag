import { AlertasPanel } from "@/components/alertas-panel";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Alertas · Gestión inmobiliaria" };

export default async function AlertasPage({ searchParams }: { searchParams: Promise<{ tipo?: string }> }) {
  const { tipo } = await searchParams;
  return (
    <>
      <PageHeader titulo="Alertas" descripcion="Vencimientos, actualizaciones de renta, certificados, fianzas e impagos calculados en vivo" />
      <AlertasPanel tipoInicial={tipo ?? ""} />
    </>
  );
}
