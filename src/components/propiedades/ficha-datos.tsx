import { dec, eur, fecha } from "@/lib/format";
import { operacion, tipoUnidad } from "@/lib/etiquetas";
import type { FichaPropiedad } from "@/lib/types";

const si = (v: unknown) => (v ? "Sí" : "No");

function Dato({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-[11px] text-muted-foreground">{etiqueta}</dt>
      <dd className="text-sm font-medium">{valor ?? "—"}</dd>
    </div>
  );
}

export function FichaDatos({ ficha }: { ficha: FichaPropiedad }) {
  const u = ficha.unidad as Record<string, unknown>;
  const e = (ficha.edificio ?? {}) as Record<string, unknown>;
  const p = ficha.propietario as Record<string, unknown> | null;
  return (
    <section aria-label="Datos de la propiedad" className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Dato etiqueta="Tipo" valor={tipoUnidad(String(u.tipo))} />
        <Dato etiqueta="Operación" valor={operacion(String(u.operacion))} />
        <Dato etiqueta="Precio" valor={u.precio ? `${eur(Number(u.precio))}${u.operacion === "venta" ? "" : "/mes"}` : "—"} />
        <Dato etiqueta="Superficie" valor={u.superficie_m2 ? `${dec(Number(u.superficie_m2))} m²` : "—"} />
        <Dato etiqueta="Habitaciones / baños" valor={`${u.habitaciones ?? "—"} / ${u.banos ?? "—"}`} />
        <Dato etiqueta="€/m²" valor={u.precio_m2 ? dec(Number(u.precio_m2)) : "—"} />
        <Dato etiqueta="Terraza" valor={si(u.terraza)} />
        <Dato etiqueta="Mascotas" valor={si(u.admite_mascotas)} />
        <Dato etiqueta="Amueblado" valor={si(u.amueblado)} />
        <Dato etiqueta="Certificado" valor={u.certificado_energetico ? `${u.certificado_energetico} · caduca ${fecha(String(u.certificado_caducidad))}` : "—"} />
        <Dato etiqueta="Ref. catastral" valor={<span className="font-mono text-xs">{String(u.referencia_catastral ?? "—")}</span>} />
        <Dato etiqueta="Propietario" valor={p ? String(p.nombre) : "—"} />
      </dl>
      {u.descripcion ? <p className="rounded-md bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">{String(u.descripcion)}</p> : null}
      <p className="text-xs text-muted-foreground">
        Edificio {String(e.referencia ?? "")} · {e.anio_construccion ? `de ${e.anio_construccion}` : ""} · {e.plantas ? `${e.plantas} plantas` : ""}
        {e.ascensor ? " · ascensor" : " · sin ascensor"}
        {e.administrador_fincas ? ` · administra ${e.administrador_fincas}` : ""}
      </p>
    </section>
  );
}
