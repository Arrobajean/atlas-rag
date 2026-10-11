// Constantes y tipos de los archivos adjuntos al chat. Sin dependencias de Node: los usan el navegador y el servidor.

export const TIPOS_ADJUNTO = ["image/png", "image/jpeg", "image/webp", "application/pdf"] as const;
export type TipoAdjunto = (typeof TIPOS_ADJUNTO)[number];

export const MAX_ADJUNTOS = 3;
/** Suma de bytes (ya decodificados) de todos los adjuntos de un mensaje. En base64 pesa ~4/3: queda bajo los 4,5 MB de una función en Vercel. */
export const MAX_BYTES_TOTAL = 3 * 1024 * 1024;
export const MAX_PAGINAS_PDF = 15;
export const MAX_LADO_IMAGEN_PX = 1600;

/** Texto que se envía si la persona adjunta sin escribir nada. */
export const TEXTO_ADJUNTO_POR_DEFECTO = "Analiza el documento adjunto y dime qué es y qué información útil contiene.";

/** Archivo tal cual viaja al servidor (base64 sin el prefijo `data:`). */
export interface AdjuntoEntrada {
  nombre: string;
  mime: string;
  data: string;
}

/** Lo que se conserva de un adjunto en la conversación: nunca los bytes. */
export interface AdjuntoVista {
  nombre: string;
  mime: string;
  /** Miniatura en memoria (blob:); no se guarda al persistir la conversación. */
  previewUrl?: string;
}

/** Nombre apto para mostrarse y para citarse al modelo: sin caracteres de control ni nada que parezca una instrucción. */
export function nombreSeguro(nombre: string): string {
  const limpio = nombre
    .normalize("NFKC")
    .replace(/[^\p{L}\p{N} ._()\-]/gu, "_")
    .replace(/_{2,}/g, "_")
    .trim()
    .slice(0, 60);
  return limpio || "archivo";
}

export const esImagen = (mime: string) => mime.startsWith("image/");
