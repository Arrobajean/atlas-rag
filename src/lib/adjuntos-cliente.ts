import {
  esImagen, MAX_ADJUNTOS, MAX_BYTES_TOTAL, MAX_LADO_IMAGEN_PX, nombreSeguro, TIPOS_ADJUNTO, type AdjuntoEntrada,
} from "@/lib/chat/adjuntos-tipos";

/** Archivo ya preparado en el navegador: listo para enviarse y con una miniatura para mostrarlo. */
export interface AdjuntoCliente extends AdjuntoEntrada {
  id: string;
  /** Tamaño en bytes ya decodificados */
  bytes: number;
  previewUrl?: string;
}

const MB = 1024 * 1024;

function aBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binario = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binario += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binario);
}

/**
 * Reduce la imagen y la vuelve a codificar como JPEG. Además de ahorrar peso, descarta los metadatos (EXIF, XMP,
 * comentarios) que de otro modo viajarían con la foto, y los datos de ubicación del móvil.
 */
async function reencodarImagen(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const escala = Math.min(1, MAX_LADO_IMAGEN_PX / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * escala));
  canvas.height = Math.max(1, Math.round(bitmap.height * escala));
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Tu navegador no puede procesar la imagen.");
  ctx.fillStyle = "#ffffff"; // los PNG con transparencia se aplanan sobre blanco
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  for (const calidad of [0.85, 0.7, 0.55]) {
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", calidad));
    if (blob && blob.size <= MAX_BYTES_TOTAL) return blob;
  }
  throw new Error("La imagen sigue pesando demasiado tras reducirla.");
}

/** Valida y prepara un archivo para adjuntarlo; lanza un Error con un mensaje para la persona si no sirve. */
export async function prepararAdjunto(file: File): Promise<AdjuntoCliente> {
  if (!(TIPOS_ADJUNTO as readonly string[]).includes(file.type)) throw new Error(`«${nombreSeguro(file.name)}»: solo se admiten imágenes (PNG, JPEG, WebP) y PDF.`);
  const id = crypto.randomUUID();
  const nombre = nombreSeguro(file.name);

  if (esImagen(file.type)) {
    const blob = await reencodarImagen(file).catch((e: unknown) => {
      throw new Error(`«${nombre}»: ${e instanceof Error ? e.message : "no se pudo leer la imagen."}`);
    });
    return { id, nombre: nombre.replace(/\.[^.]+$/, "") + ".jpg", mime: "image/jpeg", data: aBase64(await blob.arrayBuffer()), bytes: blob.size, previewUrl: URL.createObjectURL(blob) };
  }

  if (file.size > MAX_BYTES_TOTAL) throw new Error(`«${nombre}» pesa más de ${MAX_BYTES_TOTAL / MB} MB. Cárgalo desde Documentos para consultarlo.`);
  return { id, nombre, mime: "application/pdf", data: aBase64(await file.arrayBuffer()), bytes: file.size };
}

/** ¿Cabe `nuevo` junto a lo ya adjuntado? Devuelve el motivo si no. */
export function motivoNoCabe(actuales: AdjuntoCliente[], nuevo: AdjuntoCliente): string | null {
  if (actuales.length >= MAX_ADJUNTOS) return `Máximo ${MAX_ADJUNTOS} archivos por mensaje.`;
  const total = actuales.reduce((n, a) => n + a.bytes, 0) + nuevo.bytes;
  if (total > MAX_BYTES_TOTAL) return `Los archivos no pueden pasar de ${MAX_BYTES_TOTAL / MB} MB en total.`;
  return null;
}

export const liberarPrevisualizacion = (a: { previewUrl?: string }) => {
  if (a.previewUrl) URL.revokeObjectURL(a.previewUrl);
};
