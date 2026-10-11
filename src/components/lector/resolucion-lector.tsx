"use client";

import * as React from "react";
import { HomeIcon, UserRoundIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getPropiedad } from "@/lib/api";
import { tipoUnidad } from "@/lib/etiquetas";
import type { CandidatoInquilino, CandidatoUnidad, ContextoLector, Resolucion } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Props {
  resolucion: Resolucion;
  unidades: CandidatoUnidad[];
  inquilinos: CandidatoInquilino[];
  contexto: ContextoLector | null;
  disabled: boolean;
  onUnidad: (id: number | null) => void;
  onInquilino: (modo: "crear" | "existente", id?: number | null) => void;
}

function Opcion({ activa, disabled, onClick, children }: { activa: boolean; disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={activa} disabled={disabled} onClick={onClick} className={cn("w-full rounded-md border p-2.5 text-left text-sm transition-colors hover:bg-muted/50 disabled:opacity-60", activa && "border-primary bg-primary/5")}>
      {children}
    </button>
  );
}

/** Vincula el contrato con una unidad y un inquilino EXISTENTES (se elige de una lista, no se teclea). */
export function ResolucionLector({ resolucion, unidades, inquilinos, contexto, disabled, onUnidad, onInquilino }: Props) {
  const [ref, setRef] = React.useState("");
  const [buscando, setBuscando] = React.useState(false);
  const [errorRef, setErrorRef] = React.useState<string | null>(null);

  const buscarPorReferencia = async () => {
    if (!ref.trim()) return;
    setBuscando(true);
    setErrorRef(null);
    try {
      const f = await getPropiedad(ref.trim());
      onUnidad(Number(f.unidad.id));
    } catch {
      setErrorRef("No existe esa referencia");
    } finally {
      setBuscando(false);
    }
  };

  const elegida = resolucion.unidad_id;
  const enLista = unidades.some((u) => u.id === elegida);

  return (
    <div className="space-y-5">
      <section className="space-y-2" aria-label="Unidad">
        <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"><HomeIcon className="size-3.5" /> Unidad del contrato *</h3>
        <div role="radiogroup" aria-label="Unidad candidata" className="space-y-1.5">
          {unidades.map((u) => (
            <Opcion key={u.id} activa={elegida === u.id} disabled={disabled} onClick={() => onUnidad(u.id)}>
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">{u.ubicacion}</span>
                <Badge variant={u.score >= 100 ? "default" : "secondary"}>{u.score >= 100 ? "Catastro coincide" : "Dirección"}</Badge>
              </span>
              <span className="text-xs text-muted-foreground">{u.referencia} · {tipoUnidad(u.tipo)} · {u.municipio} · {u.estado}</span>
            </Opcion>
          ))}
          {elegida && !enLista && contexto && (
            <Opcion activa disabled={disabled} onClick={() => undefined}>
              <span className="font-medium">{contexto.unidad.ubicacion}</span>
              <span className="block text-xs text-muted-foreground">{contexto.unidad.referencia} · elegida manualmente</span>
            </Opcion>
          )}
        </div>
        {unidades.length === 0 && <p className="text-xs text-muted-foreground">No se encontró la unidad por catastro ni dirección. Búscala por su referencia.</p>}
        <div className="flex items-end gap-2">
          <div className="flex-1 space-y-1">
            <Label htmlFor="ref-unidad" className="text-xs">Otra unidad por referencia</Label>
            <Input id="ref-unidad" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="U-00123" disabled={disabled} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), void buscarPorReferencia())} />
          </div>
          <button type="button" className="h-9 rounded-lg border px-3 text-xs hover:bg-muted disabled:opacity-50" disabled={disabled || buscando || !ref.trim()} onClick={() => void buscarPorReferencia()}>
            Usar
          </button>
        </div>
        {errorRef && <p role="alert" className="text-xs text-destructive">{errorRef}</p>}
      </section>

      <section className="space-y-2" aria-label="Inquilino">
        <h3 className="flex items-center gap-2 text-xs font-semibold tracking-wider text-muted-foreground uppercase"><UserRoundIcon className="size-3.5" /> Inquilino</h3>
        <div role="radiogroup" aria-label="Inquilino" className="space-y-1.5">
          {inquilinos.map((i) => (
            <Opcion key={i.id} activa={resolucion.inquilino.modo === "existente" && resolucion.inquilino.id === i.id} disabled={disabled} onClick={() => onInquilino("existente", i.id)}>
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium">Vincular con {i.nombre}</span>
                <Badge variant={i.score >= 100 ? "default" : "secondary"}>{i.score >= 100 ? "Mismo documento" : `${i.score} % nombre`}</Badge>
              </span>
              <span className="text-xs text-muted-foreground">{i.documento_tipo} {i.documento} · {i.contratos} contratos previos · evita duplicar la persona</span>
            </Opcion>
          ))}
          <Opcion activa={resolucion.inquilino.modo === "crear"} disabled={disabled} onClick={() => onInquilino("crear")}>
            <span className="font-medium">Crear un inquilino nuevo</span>
            <span className="block text-xs text-muted-foreground">Con los datos de la pestaña «Datos». No se permite si su documento ya existe.</span>
          </Opcion>
        </div>
      </section>
    </div>
  );
}
