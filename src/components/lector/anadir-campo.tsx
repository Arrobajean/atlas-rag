"use client";

import * as React from "react";
import { LightbulbIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectCampo } from "@/components/ui/select-campo";
import { Textarea } from "@/components/ui/textarea";
import { useProponerCampo } from "@/hooks/use-campos";
import type { CampoCatalogo } from "@/lib/types";

const TIPOS = [["texto", "Texto"], ["numero", "Número"], ["moneda", "Importe (€)"], ["fecha", "Fecha"], ["booleano", "Sí / No"]] as const;

/**
 * «Añadir campo» solo ofrece campos que YA existen en el catálogo (así no se contamina la base de datos).
 * Si falta uno, se puede proponer: queda pendiente hasta que un administrador lo apruebe.
 */
export function AnadirCampo({ disponibles, onAnadir, disabled }: { disponibles: CampoCatalogo[]; onAnadir: (clave: string) => void; disabled: boolean }) {
  const [proponer, setProponer] = React.useState(false);
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed p-3">
      <div className="min-w-48 flex-1 space-y-1">
        <Label htmlFor="anadir-campo" className="text-xs font-semibold">Añadir campo del catálogo</Label>
        <SelectCampo
          id="anadir-campo"
          disabled={disabled || disponibles.length === 0}
          value=""
          placeholder={disponibles.length ? "Elige un campo…" : "Todos los campos ya están visibles"}
          opciones={disponibles.map((c) => [c.clave, `${c.etiqueta} · ${c.grupo}`] as const)}
          onChange={(v) => v && onAnadir(v)}
        />
      </div>
      <Button type="button" variant="outline" size="sm" onClick={() => setProponer(true)} disabled={disabled}>
        <LightbulbIcon className="mr-1.5 size-3.5" /> Proponer campo nuevo
      </Button>
      <ProponerDialog open={proponer} onOpenChange={setProponer} />
    </div>
  );
}

function ProponerDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { enviar, enviando } = useProponerCampo();
  const [etiqueta, setEtiqueta] = React.useState("");
  const [tipo, setTipo] = React.useState("texto");
  const [descripcion, setDescripcion] = React.useState("");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Proponer un campo nuevo</DialogTitle>
          <DialogDescription className="text-xs">
            No se crea al momento: un administrador debe aprobarlo. Una vez aprobado aparecerá en todos los contratos como cláusula tipada.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await enviar({ etiqueta, tipo_dato: tipo, descripcion: descripcion || undefined })) {
              setEtiqueta("");
              setDescripcion("");
              onOpenChange(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="etiqueta-campo" className="text-xs font-semibold">Nombre del campo</Label>
            <Input id="etiqueta-campo" value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="Ej.: Cláusula de animales exóticos" required minLength={3} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tipo-campo" className="text-xs font-semibold">Tipo de dato</Label>
            <SelectCampo id="tipo-campo" value={tipo} opciones={TIPOS} onChange={setTipo} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="desc-campo" className="text-xs font-semibold">Para qué sirve</Label>
            <Textarea id="desc-campo" value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} maxLength={300} />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" size="sm" disabled={enviando || etiqueta.trim().length < 3}>
              <PlusIcon className="mr-1.5 size-3.5" /> Enviar propuesta
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
