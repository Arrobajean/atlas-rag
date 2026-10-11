import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { describeError } from "@/lib/rag";
import { ErrorValidacion } from "@/lib/lector/servicio";

/** Envuelve un handler: convierte errores en respuestas JSON con el código adecuado. */
export async function manejar(fn: () => Promise<Response | object>, fallback = "Error inesperado") {
  try {
    const r = await fn();
    return r instanceof Response ? r : NextResponse.json(r);
  } catch (error) {
    if (error instanceof ErrorValidacion) return NextResponse.json({ error: error.message, errores: error.errores }, { status: 422 });
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues.map((i) => i.message).join(" · ") }, { status: 400 });
    const { message, status } = describeError(error, fallback);
    // Errores de restricción de la BD (solape, duplicado…) son problemas del dato, no del servidor
    const conflicto = /solapa|Ya existe|duplicate key|violates/i.test(message);
    return NextResponse.json({ error: message }, { status: conflicto ? 409 : status });
  }
}

export const idDe = (v: string) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) throw new Error("Id no válido");
  return n;
};

/** Convierte parámetros de URL en el filtro JSON que entienden las funciones SQL. */
export function filtrosDeUrl(p: URLSearchParams): Record<string, unknown> {
  const f: Record<string, unknown> = {};
  for (const k of ["zona", "municipio", "distrito", "barrio", "tipo", "operacion", "estado"]) {
    const v = p.getAll(k).flatMap((x) => x.split(",")).map((x) => x.trim()).filter(Boolean);
    if (v.length) f[k] = v;
  }
  for (const k of ["precio_min", "precio_max", "superficie_min", "superficie_max", "habitaciones_min", "habitaciones_max", "banos_min", "edificio_id", "propietario_id"]) {
    if (p.get(k) && !Number.isNaN(Number(p.get(k)))) f[k] = Number(p.get(k));
  }
  for (const k of ["terraza", "admite_mascotas", "amueblado", "ascensor", "incluir_anexos", "incluir_subunidades"]) {
    if (p.get(k)) f[k] = p.get(k) === "true";
  }
  for (const k of ["calle", "planta", "puerta"]) if (p.get(k)) f[k] = p.get(k);
  return f;
}
