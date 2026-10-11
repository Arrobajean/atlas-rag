/** ¿El usuario pide expresamente una tabla o un gráfico? Si no, el chat responde solo con texto. */
const PIDE_TABLA = /\b(tablas?|tabulad[oa]s?|gr[aá]fic[oa]s?|cuadro|en columnas|diagrama|barras)\b/i;

export const pideTabla = (texto: string | undefined): boolean => !!texto && PIDE_TABLA.test(texto);
