import { DocumentosPanel } from "@/components/documentos-panel";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Documentos · Gestión inmobiliaria" };

export default function DocumentosPage() {
  return (
    <>
      <PageHeader titulo="Documentos" descripcion="Contratos, normas de comunidad, actas y normativa, vinculados a edificios, unidades y contratos" />
      <DocumentosPanel />
    </>
  );
}
