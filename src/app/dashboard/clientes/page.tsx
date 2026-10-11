import { ClientesPanel } from "@/components/clientes-panel";
import { PageHeader } from "@/components/page-header";

export const metadata = { title: "Clientes · Gestión inmobiliaria" };

export default function ClientesPage() {
  return (
    <>
      <PageHeader titulo="Clientes" descripcion="Cruce entre lo que busca cada cliente y las propiedades disponibles (filtros exactos + afinidad semántica)" />
      <ClientesPanel />
    </>
  );
}
