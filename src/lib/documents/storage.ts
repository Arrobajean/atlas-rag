import { getSupabaseClient } from "@/lib/rag";

export const BUCKET = "documentos";
export const MAX_BYTES = 25 * 1024 * 1024;

/** Nombre seguro para Storage: sin tildes, espacios ni caracteres raros. */
export function nombreSeguro(nombre: string): string {
  return nombre
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(-90) || "documento";
}

export function rutaNueva(tipo: string, nombre: string): string {
  const anio = new Date().getUTCFullYear();
  return `${tipo}/${anio}/${crypto.randomUUID().slice(0, 8)}-${nombreSeguro(nombre)}`;
}

export async function sha256(data: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(data));
  return Buffer.from(digest).toString("hex");
}

/** URL temporal para que el navegador muestre el PDF (el bucket es privado). */
export async function urlDeLectura(ruta: string, segundos = 3600): Promise<string> {
  const { data, error } = await getSupabaseClient().storage.from(BUCKET).createSignedUrl(ruta, segundos);
  if (error || !data) throw new Error(`No se pudo generar la URL del archivo: ${error?.message ?? "sin datos"}`);
  return data.signedUrl;
}

/** URL firmada para subir directamente desde el navegador (evita el límite de 4,5 MB de las funciones). */
export async function urlDeSubida(ruta: string) {
  const { data, error } = await getSupabaseClient().storage.from(BUCKET).createSignedUploadUrl(ruta);
  if (error || !data) throw new Error(`No se pudo preparar la subida: ${error?.message ?? "sin datos"}`);
  return data;
}
