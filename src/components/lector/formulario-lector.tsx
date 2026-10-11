import { AnadirCampo } from "@/components/lector/anadir-campo";
import { CampoLector } from "@/components/lector/campo-lector";
import type { CampoCatalogo, DatosExtraidos, Valores } from "@/lib/types";
import type { EstadoCampo, GrupoCampos } from "@/lib/lector-form";

interface Props {
  grupos: GrupoCampos[];
  disponibles: CampoCatalogo[];
  valores: Valores;
  datos: DatosExtraidos;
  estados: Record<string, { estado: EstadoCampo; error?: string }>;
  erroresServidor: Record<string, string>;
  activo: string | null;
  editable: boolean;
  onCambiar: (clave: string, v: string | number | boolean | null) => void;
  onSeleccionar: (clave: string) => void;
  onRestaurar: (clave: string) => void;
  onAnadir: (clave: string) => void;
}

/** Datos leídos, agrupados por bloque. Solo entran campos del catálogo predefinido. */
export function FormularioLector({ grupos, disponibles, valores, datos, estados, erroresServidor, activo, editable, onCambiar, onSeleccionar, onRestaurar, onAnadir }: Props) {
  return (
    <div className="space-y-6">
      {grupos.map((g) => (
        <section key={g.grupo} aria-label={g.grupo} className="space-y-2">
          <h3 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{g.grupo}</h3>
          <div className="grid gap-2 xl:grid-cols-2">
            {g.campos.map((c) => (
              <CampoLector
                key={c.clave}
                campo={c}
                valor={valores[c.clave]}
                dato={datos[c.clave]}
                estado={estados[c.clave]?.estado ?? "vacio"}
                error={erroresServidor[c.clave] ?? estados[c.clave]?.error}
                activo={activo === c.clave}
                disabled={!editable}
                onCambiar={(v) => onCambiar(c.clave, v)}
                onSeleccionar={() => onSeleccionar(c.clave)}
                onRestaurar={() => onRestaurar(c.clave)}
              />
            ))}
          </div>
        </section>
      ))}
      <AnadirCampo disponibles={disponibles} onAnadir={onAnadir} disabled={!editable} />
    </div>
  );
}
