import { CamposPanel } from "@/components/campos-panel";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Campos del catálogo · Gestión inmobiliaria" };

export default function CamposPage() {
  return (
    <>
      <PageHeader titulo="Campos del catálogo" descripcion="Lista cerrada de datos que la IA puede extraer y que pueden entrar en la base de datos" />
      <CamposPanel />
    </>
  );
}
