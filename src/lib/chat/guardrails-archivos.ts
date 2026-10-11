import { MANIPULACION, norm } from "@/lib/chat/guardrails";

/**
 * Detección de instrucciones escondidas en archivos (imágenes y PDF).
 *
 * Se aplica al CONTENIDO del archivo (capa de texto del PDF y transcripción del inspector), nunca al mensaje del
 * usuario. Devuelve motivos genéricos, no la frase: así no se le enseña a un atacante qué regla saltarse.
 * Es una barrera más, no la única: el resto (mínimo privilegio, salida saneada) no depende de que esta acierte.
 */

const IA =
  "(ia|ai|llm|gpt|chatgpt|gemini|claude|copilot|asistente virtual|asistente de ia|asistente ia|assistant|modelo de lenguaje|language model|inteligencia artificial|artificial intelligence)";
const ORDEN =
  "(debes|debe|tienes que|tiene que|deberas|obedece|obedeced|ignora|ignore|olvida|forget|responde|contesta|di que|diga|recomienda|reenvia|envia|ejecuta|llama a|usa la herramienta|must|should|shall|obey|reply|respond|say|tell|output|send|execute|call|run|write|print)";

const INSTRUCCIONES_EN_ARCHIVO: [RegExp, string][] = [
  [new RegExp(`\\b${IA}\\b.{0,80}\\b${ORDEN}\\b`), "se dirige a una IA con una orden"],
  [new RegExp(`\\b${ORDEN}\\b.{0,40}\\b(al|a la|to the|the)\\s*${IA}\\b`), "se dirige a una IA con una orden"],
  [/\b(nuevas?|new|updated|actualizadas?)\s+(instruccion|instrucciones|instruction|instructions|directiva|directivas)\b/, "presenta nuevas instrucciones"],
  [new RegExp(`\\b(instruccion(es)?|instructions?|nota|note|mensaje|message)\\s+(para|for|to)\\s+(la|el|the)?\\s*${IA}\\b`), "instrucciones para la IA"],
  [/\b(quien|whoever|anyone|cualquier (ia|asistente|sistema))\b.{0,40}\b(procese|lea|read|process|reads|processes|analice|analyze)\b.{0,60}\b(archivo|documento|file|document|texto|text)\b/, "se dirige a quien procese el archivo"],
  [/\b(system|developer|sistema|desarrollador)\s*(prompt|message|mensaje|instruction|instruccion)/, "imita mensajes del sistema"],
  [/<\/?\s*(system|assistant|user|instructions?|tool|function|prompt)\b[^>]*>|\[\/?\s*(inst|system)\s*\]/, "etiquetas de roles del modelo"],
  [
    /\b(proponer_accion|buscar_en_documentos|alertas_pendientes|ficha_propiedad|ficha_edificio|listar_propiedades|contar_agrupar_propiedades|indicadores_cartera|contratos_por_vencer|resolver_lugar|buscar_propiedades_por_descripcion)\b/,
    "nombra herramientas internas",
  ],
  [/!\[[^\]]*\]\(\s*(https?:|\/\/|data:)/, "imagen remota en markdown (canal de fuga de datos)"],
  [
    /\b(no|nunca|never|don'?t|do not)\b.{0,25}\b(digas|menciones|reveles|avises|informes|cuentes|tell|mention|reveal|inform|disclose)\b.{0,30}\b(al usuario|el usuario|usuario|the user|user)\b/,
    "pide ocultar algo al usuario",
  ],
  [/\b(texto|instruccion(es)?|mensaje|text|instructions?|message)\s+(oculto|oculta|invisible|hidden|secret|secreto)\b/, "declara texto oculto"],
];

/** Caracteres de formato invisibles (ancho cero, bidireccionales, «tags» Unicode): sirven para esconder texto. */
const INVISIBLES = /[​-‏‪-‮⁠-⁤﻿]/g;
const TAGS_UNICODE = /[\u{E0000}-\u{E007F}]/u;

export function caracteresInvisibles(texto: string): { invisibles: number; tags: boolean } {
  return { invisibles: (texto.match(INVISIBLES) ?? []).length, tags: TAGS_UNICODE.test(texto) };
}

/** Motivos por los que el contenido de un archivo parece dirigido a una IA; vacío si no hay nada sospechoso. */
export function buscarInyeccion(contenido: string): string[] {
  if (!contenido) return [];
  const t = norm(contenido);
  const motivos = new Set<string>();
  if (MANIPULACION.some((r) => r.test(t))) motivos.add("intenta cambiar las reglas del asistente");
  for (const [r, motivo] of INSTRUCCIONES_EN_ARCHIVO) if (r.test(t)) motivos.add(motivo);
  const { invisibles, tags } = caracteresInvisibles(contenido);
  if (tags) motivos.add("texto escondido con caracteres Unicode invisibles");
  else if (invisibles >= 5) motivos.add("abundantes caracteres invisibles");
  return [...motivos];
}
