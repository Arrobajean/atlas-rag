import { LectorBandeja } from "@/components/lector-bandeja";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Lector de contratos · Gestión inmobiliaria" };

export default function LectorBandejaPage() {
  return (
    <>
      <PageHeader titulo="Lector de contratos" descripcion="La IA lee el PDF y propone los datos; tú los verificas y corriges antes de que entren en la base de datos" />
      <LectorBandeja />
    </>
  );
}
