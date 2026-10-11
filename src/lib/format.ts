/** "hace 12 s", "hace 3 min", "hace 2 h". */
export function timeAgo(from: Date, now: number): string {
  const seconds = Math.max(0, Math.round((now - from.getTime()) / 1000));
  if (seconds < 5) return "ahora mismo";
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

const numero = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0, useGrouping: "always" });
const decimal = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 1, useGrouping: "always" });

/** 1250 → "1.250 €" */
export const eur = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${numero.format(n)} €`);
export const num = (n: number | null | undefined) => (n === null || n === undefined ? "—" : numero.format(n));
export const dec = (n: number | null | undefined) => (n === null || n === undefined ? "—" : decimal.format(n));
export const pct = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `${decimal.format(n)} %`);

/** "2026-03-15" → "15/03/2026" */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
}

/** Días hasta una fecha: "en 12 días", "hoy", "hace 3 días". */
export function diasRelativos(dias: number): string {
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  if (dias === -1) return "ayer";
  return dias > 0 ? `en ${dias} días` : `hace ${-dias} días`;
}

/** Valor de una celda según el formato que declara la herramienta. */
export function celda(valor: unknown, formato?: "moneda" | "fecha" | "numero" | "texto"): string {
  if (valor === null || valor === undefined || valor === "") return "—";
  if (formato === "moneda") return eur(Number(valor));
  if (formato === "fecha") return fecha(String(valor));
  if (formato === "numero") return dec(Number(valor));
  return String(valor);
}
