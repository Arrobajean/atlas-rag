// Lógica pura para resaltar en el PDF la cita que respalda un dato.

export const normalizarTexto = (t: string) =>
  t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

const escaparHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * pdf.js entrega el texto en trozos (líneas o partes de línea). Un trozo se marca si forma parte de la cita:
 * lo bastante largo y contenido en ella (sin tildes ni mayúsculas).
 */
export function trozoEnCita(trozo: string, cita: string | null | undefined): boolean {
  if (!cita) return false;
  const t = normalizarTexto(trozo);
  return t.length >= 4 && normalizarTexto(cita).includes(t);
}

/** HTML de un trozo de texto, con <mark> si pertenece a la cita. */
export function htmlDeTrozo(trozo: string, cita: string | null | undefined): string {
  const seguro = escaparHtml(trozo);
  return trozoEnCita(trozo, cita) ? `<mark class="pdf-resaltado">${seguro}</mark>` : seguro;
}
