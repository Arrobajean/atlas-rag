"use client";

import * as React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// Valor interno para la opción «todos» (los items de Base UI no admiten cadena vacía como valor).
const TODOS = "__todos__";

interface SelectCampoProps {
  opciones: readonly (readonly [string, string])[];
  value?: string;
  onChange: (valor: string) => void;
  /** Texto cuando no hay valor. Si se indica, también aparece como primera opción para volver a «sin filtro». */
  placeholder?: string;
  id?: string;
  className?: string;
  disabled?: boolean;
  "aria-label"?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
}

/** Desplegable de shadcn/ui con lista de pares [valor, etiqueta]. */
export function SelectCampo({ opciones, value, onChange, placeholder, id, className, disabled, ...aria }: SelectCampoProps) {
  const items = React.useMemo(
    () => [...(placeholder !== undefined ? [{ value: TODOS, label: placeholder }] : []), ...opciones.map(([v, label]) => ({ value: v, label }))],
    [opciones, placeholder]
  );

  return (
    <Select
      items={items}
      value={value ? value : null}
      onValueChange={(v) => onChange(v === null || v === TODOS ? "" : String(v))}
      disabled={disabled}
    >
      <SelectTrigger id={id} disabled={disabled} className={cn("h-9 w-full", className)} {...aria}>
        <SelectValue placeholder={placeholder ?? "Elige…"} />
      </SelectTrigger>
      <SelectContent alignItemWithTrigger={false} className="max-h-72">
        {items.map((i) => (
          <SelectItem key={i.value} value={i.value}>
            {i.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
