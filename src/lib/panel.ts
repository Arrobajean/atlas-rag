import { eur, num, pct } from "@/lib/format";
import { tipoAlerta } from "@/lib/etiquetas";
import type { PuntoCobro, Resumen } from "@/lib/types";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

/** "2026-09" → "sep" */
export const mesCorto = (mes: string) => MESES[Number(mes.slice(5, 7)) - 1] ?? mes;

/** "2026-09" → "septiembre de 2026" */
export function mesLargo(mes: string): string {
  const d = new Date(Number(mes.slice(0, 4)), Number(mes.slice(5, 7)) - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

export function saludoPorHora(hora: number): string {
  if (hora < 6) return "Buenas noches";
  if (hora < 13) return "Buenos días";
  if (hora < 21) return "Buenas tardes";
  return "Buenas noches";
}

/** Morosidad de un mes en %: lo que sigue sin cobrar sobre lo emitido. */
export const morosidadMes = (p: PuntoCobro) => (p.emitido > 0 ? (100 * p.impagado) / p.emitido : 0);

/** El último punto es el mes en curso (incompleto): no sirve para comparar con el anterior. */
export const mesesCompletos = (serie: PuntoCobro[]) => serie.slice(0, -1);

/** Variación porcentual entre los dos últimos meses completos; null si no hay base. */
export function variacion(valores: number[]): number | null {
  const [antes, ultimo] = valores.slice(-2);
  if (antes === undefined || ultimo === undefined || antes === 0) return null;
  return (100 * (ultimo - antes)) / antes;
}

export interface RutaSerie {
  linea: string;
  area: string;
  ultimo: { x: number; y: number } | null;
}

/** Convierte una serie en la ruta SVG de una línea y de su área, dentro de un lienzo ancho × alto. */
export function rutaSerie(valores: number[], ancho: number, alto: number, margen = 3): RutaSerie {
  if (valores.length < 2) return { linea: "", area: "", ultimo: null };
  const min = Math.min(...valores);
  const max = Math.max(...valores);
  const rango = max - min || 1;
  const puntos = valores.map((v, i) => ({
    x: (i / (valores.length - 1)) * ancho,
    y: margen + (1 - (v - min) / rango) * (alto - margen * 2),
  }));
  const linea = puntos.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${linea} L${ancho},${alto} L0,${alto} Z`;
  return { linea, area, ultimo: puntos[puntos.length - 1] };
}

export interface IdeaAtlas {
  titulo: string;
  detalle: string;
  pregunta: string;
}

/** Hasta tres cosas que merecen una mirada hoy, calculadas con los datos del panel, cada una con la pregunta para Atlas. */
export function ideasAtlas(r: Resumen): IdeaAtlas[] {
  const i = r.indicadores;
  const ideas: IdeaAtlas[] = [];

  if (i.contratos_vencen_30d > 0) {
    ideas.push({
      titulo: `${num(i.contratos_vencen_30d)} contratos vencen en 30 días`,
      detalle: "Conviene decidir renovación o salida",
      pregunta: "¿Qué contratos vencen en los próximos 30 días y quiénes son los inquilinos?",
    });
  }
  if (i.impagado > 0) {
    ideas.push({
      titulo: `${eur(i.impagado)} sin cobrar`,
      detalle: `Morosidad del ${pct(i.morosidad_pct)} en 12 meses`,
      pregunta: "¿Quién tiene pagos pendientes y cuánto debe cada uno? Ordénalos de mayor a menor deuda.",
    });
  }
  const zonas = r.ocupacionPorZona.filter((z) => z.ocupacion_pct !== null && z.unidades >= 20);
  const peor = [...zonas].sort((a, b) => (a.ocupacion_pct ?? 0) - (b.ocupacion_pct ?? 0))[0];
  if (peor) {
    ideas.push({
      titulo: `${peor.zona}: la ocupación más baja`,
      detalle: `${pct(peor.ocupacion_pct)} · ${num(peor.disponibles)} libres`,
      pregunta: `¿Qué pisos libres hay en ${peor.zona} y cuánto llevan disponibles?`,
    });
  }
  const [tipoTop, nTop] = Object.entries(r.alertas.porTipo).sort((a, b) => b[1] - a[1])[0] ?? [];
  if (tipoTop && ideas.length < 3) {
    ideas.push({
      titulo: `${num(nTop)} alertas: ${tipoAlerta(tipoTop).toLowerCase()}`,
      detalle: "El tipo de alerta más frecuente",
      pregunta: "Resume las alertas activas por prioridad y dime por cuál empezar.",
    });
  }
  return ideas.slice(0, 3);
}
