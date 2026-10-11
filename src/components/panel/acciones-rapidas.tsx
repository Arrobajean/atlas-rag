"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpIcon, BellIcon, Building2Icon, FilePlus2Icon, ScanTextIcon, UserPlusIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePreguntarAtlas } from "@/hooks/use-preguntar-atlas";
import { NOMBRE_ASISTENTE } from "@/lib/asistente";

const ENLACES = [
  { titulo: "Subir un documento", href: "/dashboard/documentos", icono: FilePlus2Icon },
  { titulo: "Leer un contrato", href: "/dashboard/lector", icono: ScanTextIcon },
  { titulo: "Buscar una propiedad", href: "/dashboard/propiedades", icono: Building2Icon },
  { titulo: "Revisar alertas", href: "/dashboard/alertas", icono: BellIcon },
] as const;

/** Pregunta libre al asistente y atajos a lo que más se hace; sirve de acompañante de «Atlas sugiere». */
export function AccionesRapidas() {
  const preguntar = usePreguntarAtlas();
  const [texto, setTexto] = React.useState("");
  const puedeEnviar = texto.trim().length > 0;

  const enviar = (e: React.FormEvent) => {
    e.preventDefault();
    if (!puedeEnviar) return;
    preguntar(texto);
    setTexto("");
  };

  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">Accesos rápidos</CardTitle>
        <CardDescription>Pregunta lo que quieras o salta a lo habitual</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={enviar} className="flex items-center gap-2 rounded-full border bg-muted/50 py-1 pr-1 pl-4 transition-colors focus-within:border-foreground/20 focus-within:bg-muted/70">
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={`Pregunta a ${NOMBRE_ASISTENTE}`}
            aria-label={`Pregunta a ${NOMBRE_ASISTENTE}`}
            className="min-w-0 flex-1 bg-transparent py-1.5 text-base outline-none placeholder:text-muted-foreground/70 md:text-sm"
          />
          <button
            type="submit"
            disabled={!puedeEnviar}
            aria-label="Enviar pregunta"
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-35"
          >
            <ArrowUpIcon className="size-4" strokeWidth={2.4} />
          </button>
        </form>

        <ul className="grid grid-cols-2 gap-2">
          {ENLACES.map((e) => (
            <li key={e.href}>
              <Link href={e.href} className="flex h-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5">
                <e.icono className="size-4 shrink-0 text-primary" />
                {e.titulo}
              </Link>
            </li>
          ))}
          <li className="col-span-2">
            <button
              type="button"
              onClick={() => preguntar("Quiero dar de alta un cliente con su demanda. Dime qué datos necesitas.")}
              className="flex w-full items-center gap-2.5 rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <UserPlusIcon className="size-4 shrink-0 text-primary" />
              Dar de alta un cliente con Atlas
            </button>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
