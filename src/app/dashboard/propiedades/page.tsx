import { PageHeader } from "@/components/page-header";
import { PropiedadesExplorador } from "@/components/propiedades-explorador";
import { ZONAS } from "@/lib/etiquetas";

export const metadata = { title: "Propiedades · Gestión inmobiliaria" };

export default async function PropiedadesPage({ searchParams }: { searchParams: Promise<{ zona?: string }> }) {
  const { zona } = await searchParams;
  return (
    <>
      <PageHeader titulo="Propiedades" descripcion="Explora y filtra la cartera; abre una ficha para ver contrato, cobros, documentos y clientes interesados" />
      <PropiedadesExplorador inicial={zona && ZONAS.includes(zona) ? { zona } : undefined} />
    </>
  );
}
