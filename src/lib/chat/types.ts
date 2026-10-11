// Tipos compartidos entre el servidor (agente) y el navegador (hook del chat).
import type { AdjuntoEntrada } from "./adjuntos-tipos";

export interface FuenteDocumento {
  /** Identificador corto que el modelo cita en la respuesta: F1, F2… */
  id: string;
  documento_id: number;
  titulo: string;
  tipo: string;
  pagina: number | null;
  seccion: string | null;
  contenido: string;
  vigente: boolean;
  ambito: string;
  similitud: number | null;
}

/** Cómo mostrar el resultado de una herramienta bajo el mensaje. */
export type Presentacion =
  | {
      tipo: "tabla";
      titulo: string;
      columnas: { clave: string; etiqueta: string; formato?: "moneda" | "fecha" | "numero" | "texto" }[];
      filas: Record<string, unknown>[];
      total?: number;
    }
  | { tipo: "barras"; titulo: string; etiquetaValor: string; datos: { etiqueta: string; valor: number }[] };

export interface EjecucionHerramienta {
  id: string;
  nombre: string;
  /** Texto corto de lo consultado: "Contar propiedades · zona=Madrid Sur, estado=disponible". */
  descripcion: string;
  estado: "ejecutando" | "hecha" | "error";
  resumen?: string;
  presentacion?: Presentacion;
}

export type ChatEvent =
  | { type: "tool_start"; id: string; nombre: string; descripcion: string }
  | { type: "tool_end"; id: string; ok: boolean; resumen: string; presentacion?: Presentacion }
  | { type: "sources"; fuentes: FuenteDocumento[] }
  /** Tokens de una llamada al modelo: `entrada` es todo el contexto enviado en esa llamada. */
  | { type: "accion"; accion: PropuestaAccion }
  | { type: "usage"; entrada: number; salida: number; razonamiento: number }
  | { type: "text"; delta: string }
  | { type: "done" }
  | { type: "error"; message: string; status?: number };

export interface MensajeEntrada {
  role: "user" | "assistant";
  content: string;
  /** Archivos del mensaje (solo el último del usuario los lleva; se revisan antes de llegar al modelo). */
  adjuntos?: AdjuntoEntrada[];
  /** En mensajes anteriores solo se conservan los nombres: los bytes no se reenvían. */
  adjuntoNombres?: string[];
}

/** Tamaño de la ventana de contexto del modelo (Gemini Flash-Lite: ~1 M de tokens de entrada). */
export const VENTANA_CONTEXTO = 1_048_576;

// ── Acciones de escritura (siempre con confirmación humana) ─────────────────────────────────────
export const TIPOS_ACCION = ["crear_incidencia", "crear_cliente_demanda", "resolver_alerta", "cambiar_estado_unidad"] as const;
export type TipoAccion = (typeof TIPOS_ACCION)[number];

/** Lo que el asistente propone hacer. No se ejecuta hasta que una persona lo confirma. */
export interface PropuestaAccion {
  id: string;
  tipo: TipoAccion;
  /** Parámetros ya validados por la base de datos (mismas claves que espera rpc_accion). */
  datos: Record<string, unknown>;
  /** Descripción en español de lo que se hará, generada por la base de datos. */
  resumen: string;
}

export interface AccionUI extends PropuestaAccion {
  estado: "pendiente" | "ejecutando" | "hecha" | "cancelada" | "error";
  resultado?: string;
  error?: string;
}
