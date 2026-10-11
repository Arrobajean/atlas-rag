import { PageHeader } from "@/components/page-header";
import { ValoracionesPanel } from "@/components/valoraciones-panel";

export const metadata = { title: "Valoraciones · Gestión inmobiliaria" };

export default function ValoracionesPage() {
  return (
    <>
      <PageHeader titulo="Valoraciones del asistente" descripcion="Qué respuestas han resultado útiles o mejorables, con las consultas que hizo el asistente y el comentario de quien valoró" />
      <ValoracionesPanel />
    </>
  );
}
