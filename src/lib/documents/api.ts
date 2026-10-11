import { z } from "zod";
import { TIPOS_DOCUMENTO, type DatosDocumento } from "./ingest";

// Validación de los metadatos que acompañan a un documento (subida, edición).
const idOpcional = z.preprocess((v) => (v === "" || v === null || v === undefined || v === "null" ? null : Number(v)), z.number().int().positive().nullable());

export const DatosDocumentoSchema = z.object({
  titulo: z.string().trim().min(1, "El título es obligatorio").max(200),
  tipo: z.enum(TIPOS_DOCUMENTO).default("general"),
  edificio_id: idOpcional.optional(),
  unidad_id: idOpcional.optional(),
  contrato_id: idOpcional.optional(),
  fecha_documento: z.preprocess((v) => (v === "" ? null : v), z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()),
  sustituye_a: idOpcional.optional(),
});

export function datosDeFormulario(form: FormData, tituloPorDefecto: string): DatosDocumento {
  const raw: Record<string, unknown> = {};
  for (const clave of ["titulo", "tipo", "edificio_id", "unidad_id", "contrato_id", "fecha_documento", "sustituye_a"]) {
    const v = form.get(clave);
    if (v !== null) raw[clave] = v;
  }
  if (!raw.titulo || String(raw.titulo).trim() === "") raw.titulo = tituloPorDefecto;
  return DatosDocumentoSchema.parse(raw) as DatosDocumento;
}
