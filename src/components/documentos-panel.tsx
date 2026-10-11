"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileSearchIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SelectCampo } from "@/components/ui/select-campo";
import { DocumentsEmpty } from "@/components/documents/documents-empty";
import { ResultadosBusqueda } from "@/components/documentos/resultados-busqueda";
import { SubidaDialog } from "@/components/documentos/subida-dialog";
import { TablaDocumentos } from "@/components/documentos/tabla-documentos";
import { CargandoBloques, ErrorCarga } from "@/components/panel/estado-carga";
import { useDocumentos } from "@/hooks/use-documentos";
import { OPCIONES_TIPO_DOC } from "@/lib/etiquetas";
import type { Documento } from "@/lib/types";

export function DocumentosPanel() {
  const router = useRouter();
  const d = useDocumentos();
  const [subida, setSubida] = React.useState(false);
  const documentos = d.lista.datos?.documentos ?? [];

  const eliminar = (doc: Documento) => {
    if (window.confirm(`¿Eliminar «${doc.titulo}»? Se borran también sus fragmentos y el archivo.`)) void d.eliminar(doc.id);
  };

  // Tras subir un contrato se ofrece leerlo enseguida
  const alSubir = (id: number, tipo: string) => {
    d.lista.recargar();
    if (tipo === "contrato") {
      toast("Contrato indexado", { action: { label: "Leer con IA", onClick: () => void d.leerConIA(id) } });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <SearchIcon className="pointer-events-none absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            value={d.titulo}
            onChange={(e) => d.setTitulo(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void d.buscarContenido(d.titulo))}
            placeholder="Filtrar por título… (Enter busca en el contenido)"
            aria-label="Buscar documentos"
            className="pl-8"
          />
        </div>
        <SelectCampo aria-label="Tipo de documento" className="w-52" value={d.tipo} placeholder="Todos los tipos" opciones={OPCIONES_TIPO_DOC} onChange={d.setTipo} />
        <Button variant="outline" size="sm" disabled={!d.titulo.trim() || d.buscando} onClick={() => void d.buscarContenido(d.titulo)}>
          {d.buscando ? <Loader2Icon className="mr-1.5 size-3.5 animate-spin" /> : <FileSearchIcon className="mr-1.5 size-3.5" />}
          Buscar en el contenido
        </Button>
        <SubidaDialog open={subida} onOpenChange={setSubida} onSubido={alSubir} />
      </div>

      {d.resultados && <ResultadosBusqueda resultados={d.resultados} onCerrar={d.limpiarBusqueda} />}

      {d.lista.error ? (
        <ErrorCarga mensaje={d.lista.error} onReintentar={d.lista.recargar} />
      ) : d.lista.loading && !d.lista.datos ? (
        <CargandoBloques n={4} />
      ) : documentos.length === 0 ? (
        <DocumentsEmpty icon={<FileSearchIcon />} title="No hay documentos" description="Sube contratos, normas de comunidad, actas o inventarios para poder consultarlos desde el asistente." />
      ) : (
        <TablaDocumentos documentos={documentos} leyendo={d.leyendo} onLeer={(id) => void d.leerConIA(id)} onAbrirLector={(id) => router.push(`/dashboard/lector/${id}`)} onEliminar={eliminar} />
      )}

      {d.lista.datos && (
        <p className="text-xs text-muted-foreground">
          {d.lista.datos.total} documentos · {d.lista.datos.fragmentos} fragmentos indexados
          <button type="button" className="ml-2 text-primary hover:underline" onClick={() => router.push("/dashboard/lector")}>Ir al lector</button>
        </p>
      )}
    </div>
  );
}
