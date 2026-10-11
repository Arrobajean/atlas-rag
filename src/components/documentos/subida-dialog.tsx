"use client";

import * as React from "react";
import { CheckCircle2Icon, Loader2Icon, PlusIcon, UploadCloudIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectCampo } from "@/components/ui/select-campo";
import { Textarea } from "@/components/ui/textarea";
import { FileKindIcon } from "@/components/documents/file-kind";
import { useSubidaDocumento } from "@/hooks/use-subida-documento";
import { OPCIONES_TIPO_DOC } from "@/lib/etiquetas";
import { ACCEPTED_FILES } from "@/lib/file-kind";
import { cn } from "@/lib/utils";

function ZonaArchivo({ archivo, onElegir }: { archivo: File | null; onElegir: (f: File | undefined) => void }) {
  const [arrastrando, setArrastrando] = React.useState(false);
  return (
    <label
      htmlFor="archivo-documento"
      onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
      onDragLeave={() => setArrastrando(false)}
      onDrop={(e) => { e.preventDefault(); setArrastrando(false); onElegir(e.dataTransfer.files?.[0]); }}
      className={cn("flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors", arrastrando ? "border-primary bg-primary/5" : "hover:bg-muted/50")}
    >
      {archivo ? (
        <div className="flex items-center gap-2 text-sm">
          <FileKindIcon source={archivo.name} />
          <span className="max-w-[260px] truncate font-medium">{archivo.name}</span>
          <span className="text-xs text-muted-foreground">{(archivo.size / 1024).toFixed(0)} KB</span>
        </div>
      ) : (
        <>
          <UploadCloudIcon className="size-6 text-muted-foreground" />
          <span className="text-sm font-medium">Arrastra un archivo o haz clic</span>
          <span className="text-xs text-muted-foreground">.pdf, .md, .txt · máx. 25 MB · los escaneos se leen con OCR</span>
        </>
      )}
      <input id="archivo-documento" type="file" accept={ACCEPTED_FILES} className="sr-only" onChange={(e) => onElegir(e.target.files?.[0])} />
    </label>
  );
}

function Campo({ id, etiqueta, ayuda, children }: { id: string; etiqueta: string; ayuda?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-semibold">{etiqueta}</Label>
      {children}
      {ayuda && <p className="text-[11px] text-muted-foreground">{ayuda}</p>}
    </div>
  );
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubido: (documentoId: number, tipo: string) => void;
  tipoInicial?: string;
  etiqueta?: string;
}

export function SubidaDialog({ open, onOpenChange, onSubido, tipoInicial = "general", etiqueta = "Subir documento" }: Props) {
  const s = useSubidaDocumento(onSubido, tipoInicial);

  const cambiar = (siguiente: boolean) => {
    onOpenChange(siguiente);
    if (!siguiente) s.reset();
  };

  return (
    <Dialog open={open} onOpenChange={cambiar}>
      <DialogTrigger render={<Button size="sm" />}>
        <PlusIcon className="mr-1.5 size-3.5" />
        {etiqueta}
      </DialogTrigger>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Subir e indexar un documento</DialogTitle>
          <DialogDescription className="text-xs">
            Se extrae el texto por página, se trocea por cláusulas y se vectoriza. Si es un contrato podrás leerlo con IA y verificar los datos.
          </DialogDescription>
        </DialogHeader>

        <form
          className="space-y-4 pt-1"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await s.enviar()) onOpenChange(false);
          }}
        >
          <ZonaArchivo archivo={s.archivo} onElegir={s.elegirArchivo} />

          <div className="grid gap-3 sm:grid-cols-2">
            <Campo id="titulo-doc" etiqueta="Título">
              <Input id="titulo-doc" value={s.titulo} onChange={(e) => s.setTitulo(e.target.value)} required />
            </Campo>
            <Campo id="tipo-doc" etiqueta="Tipo de documento">
              <SelectCampo id="tipo-doc" value={s.tipo} opciones={OPCIONES_TIPO_DOC} onChange={s.setTipo} />
            </Campo>
            <Campo id="edificio-doc" etiqueta="Edificio (opcional)" ayuda="Referencia E-00001 o dirección">
              <Input id="edificio-doc" value={s.edificioRef} onChange={(e) => s.setEdificioRef(e.target.value)} placeholder="E-00001" />
            </Campo>
            <Campo id="unidad-doc" etiqueta="Unidad (opcional)" ayuda="Referencia U-00001">
              <Input id="unidad-doc" value={s.unidadRef} onChange={(e) => s.setUnidadRef(e.target.value)} placeholder="U-00001" />
            </Campo>
            <Campo id="fecha-doc" etiqueta="Fecha del documento">
              <Input id="fecha-doc" type="date" value={s.fecha} onChange={(e) => s.setFecha(e.target.value)} />
            </Campo>
            <Campo id="sustituye-doc" etiqueta="Sustituye al documento nº" ayuda="Id de la versión anterior; pasará a «sustituido»">
              <Input id="sustituye-doc" inputMode="numeric" value={s.sustituyeA} onChange={(e) => s.setSustituyeA(e.target.value.replace(/\D/g, ""))} />
            </Campo>
          </div>

          {!s.archivo && (
            <Campo id="texto-doc" etiqueta="O pega el texto directamente">
              <Textarea id="texto-doc" value={s.texto} onChange={(e) => s.setTexto(e.target.value)} rows={4} className="font-mono text-xs" />
            </Campo>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={() => cambiar(false)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={s.subiendo}>
              {s.subiendo ? <Loader2Icon className="mr-2 size-3.5 animate-spin" /> : <CheckCircle2Icon className="mr-2 size-3.5" />}
              {s.subiendo ? "Procesando…" : "Guardar e indexar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
