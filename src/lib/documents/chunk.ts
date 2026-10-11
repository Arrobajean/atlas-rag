import type { PaginaTexto } from "./extract";

export interface Fragmento {
  orden: number;
  pagina: number;
  /** Cláusula o apartado al que pertenece ("PRIMERA.- OBJETO"). */
  seccion: string | null;
  contenido: string;
}

const MAX_CARACTERES = 1400;
const MIN_CARACTERES = 80;

const ORDINALES = [
  "PRIMERA", "SEGUNDA", "TERCERA", "CUARTA", "QUINTA", "SEXTA", "SÉPTIMA", "SEPTIMA", "OCTAVA", "NOVENA",
  "DÉCIMA", "DECIMA", "UNDÉCIMA", "UNDECIMA", "DUODÉCIMA", "DUODECIMA", "DECIMOTERCERA", "DECIMOCUARTA",
  "DECIMOQUINTA", "DECIMOSEXTA", "DECIMOSÉPTIMA", "DECIMOCTAVA", "DECIMONOVENA", "VIGÉSIMA", "VIGESIMA",
  "ÚLTIMA", "ULTIMA", "ADICIONAL", "PRELIMINAR",
].join("|");

// Encabezados de cláusulas, artículos o apartados numerados. Los ordinales solo cuentan en MAYÚSCULAS y
// seguidos de un delimitador ("PRIMERA.- OBJETO"), para no confundirlos con frases normales.
const ENCABEZADOS: RegExp[] = [
  new RegExp("^(?:" + ORDINALES + ")\\s*[.\\-–—:]"),
  /^(CL[ÁA]USULA|ART[ÍI]CULO|ART\.|CAP[ÍI]TULO|T[ÍI]TULO|ESTIPULACI[ÓO]N|NORMA)\s+[\dIVXLCDM]+[.\-–—:º)]?/i,
  /^\d{1,2}(\.\d{1,2}){0,2}[.)]\s+[A-ZÁÉÍÓÚÑ¿¡]/,
  /^[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ0-9 ,.\-–:()/]{5,70}$/,
];

function esEncabezado(linea: string): boolean {
  const l = linea.trim();
  if (l.length < 3 || l.length > 90) return false;
  const [ordinal, articulo, numerado, mayusculas] = ENCABEZADOS;
  if (ordinal.test(l) || articulo.test(l) || numerado.test(l)) return true;
  // Una línea en mayúsculas que termina en puntuación es el resto de una frase, no un título ("ARRENDADOR.")
  return mayusculas.test(l) && !/[.,;]$/.test(l);
}

interface Seccion {
  titulo: string | null;
  pagina: number;
  parrafos: string[];
}

/**
 * Trocea el documento respetando su estructura: una sección por cláusula/artículo/apartado,
 * con la página donde empieza. Las secciones largas se parten por párrafos y frases.
 * Trabaja línea a línea porque pdf.js separa las líneas con un único salto.
 */
export function trocear(paginas: PaginaTexto[]): Fragmento[] {
  const secciones: Seccion[] = [];
  let actual: Seccion | null = null;
  let buffer = "";
  let paginaActual = 1;

  const cerrarParrafo = () => {
    const limpio = buffer.replace(/\s+/g, " ").trim();
    buffer = "";
    if (!limpio) return;
    if (!actual) {
      actual = { titulo: null, pagina: paginaActual, parrafos: [] };
      secciones.push(actual);
    }
    actual.parrafos.push(limpio);
  };

  for (const { pagina, texto } of paginas) {
    paginaActual = pagina;
    for (const linea of texto.split("\n")) {
      if (!linea.trim()) {
        cerrarParrafo(); // línea en blanco = fin de párrafo (markdown / texto plano)
      } else if (esEncabezado(linea)) {
        cerrarParrafo();
        actual = { titulo: recortar(linea.trim()), pagina, parrafos: [] };
        secciones.push(actual);
      } else {
        buffer = buffer ? buffer + " " + linea.trim() : linea.trim();
      }
    }
  }
  cerrarParrafo();

  const fragmentos: Fragmento[] = [];
  const push = (seccion: Seccion, contenido: string) => {
    fragmentos.push({ orden: fragmentos.length + 1, pagina: seccion.pagina, seccion: seccion.titulo, contenido });
  };

  for (const s of secciones) {
    const cabecera = s.titulo ? s.titulo + "\n" : "";
    let acumulado = "";
    for (const p of dividirLargo(s.parrafos)) {
      if (acumulado && acumulado.length + p.length + 1 > MAX_CARACTERES) {
        push(s, cabecera + acumulado);
        acumulado = "";
      }
      acumulado = acumulado ? acumulado + " " + p : p;
    }
    if (acumulado) push(s, cabecera + acumulado);
  }

  return fusionarCortos(fragmentos);
}

const recortar = (t: string) => (t.length > 90 ? t.slice(0, 87) + "…" : t);

/** Parte un párrafo enorme por frases para que ningún fragmento supere el máximo. */
function dividirLargo(parrafos: string[]): string[] {
  const salida: string[] = [];
  for (const p of parrafos) {
    if (p.length <= MAX_CARACTERES) {
      salida.push(p);
      continue;
    }
    let acumulado = "";
    for (const frase of p.split(/(?<=[.;:!?])\s+/)) {
      if (acumulado && acumulado.length + frase.length + 1 > MAX_CARACTERES) {
        salida.push(acumulado);
        acumulado = "";
      }
      // Frase sin puntuación más larga que el máximo: corte duro
      if (frase.length > MAX_CARACTERES) {
        for (let i = 0; i < frase.length; i += MAX_CARACTERES) salida.push(frase.slice(i, i + MAX_CARACTERES));
      } else {
        acumulado = acumulado ? acumulado + " " + frase : frase;
      }
    }
    if (acumulado) salida.push(acumulado);
  }
  return salida;
}

/** Une los fragmentos diminutos (encabezados sueltos, notas) con el siguiente. */
function fusionarCortos(fragmentos: Fragmento[]): Fragmento[] {
  const salida: Fragmento[] = [];
  let pendiente: Fragmento | null = null;
  for (const f of fragmentos) {
    if (pendiente) {
      // El pendiente era demasiado corto: se le añade este fragmento y se conserva su sección/página
      f.contenido = pendiente.contenido + "\n" + f.contenido;
      f.pagina = pendiente.pagina;
      f.seccion = pendiente.seccion ?? f.seccion;
      pendiente = null;
    }
    if (f.contenido.length < MIN_CARACTERES) {
      pendiente = f;
      continue;
    }
    salida.push({ ...f });
  }
  if (pendiente) {
    const ultimo = salida[salida.length - 1];
    if (ultimo) ultimo.contenido += "\n" + pendiente.contenido;
    else salida.push({ ...pendiente });
  }
  return salida.map((f, i) => ({ ...f, orden: i + 1 }));
}
