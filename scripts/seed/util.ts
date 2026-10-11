import { fakerES as faker } from "@faker-js/faker";

// Todo el seed sale de este generador: misma semilla → mismos datos (las fechas son relativas a "hoy").
export const SEED = 20260930;
export function resetRandom(seed = SEED) {
  faker.seed(seed);
}

export { faker };

export const int = (min: number, max: number) => faker.number.int({ min, max });
export const float = (min: number, max: number) => faker.number.float({ min, max });
export const chance = (p: number) => faker.number.float({ min: 0, max: 1 }) < p;
export const pick = <T>(arr: readonly T[]): T => faker.helpers.arrayElement(arr as T[]);
export const shuffle = <T>(arr: readonly T[]): T[] => faker.helpers.shuffle([...arr]);

/** Elige según pesos: weighted([["a", 3], ["b", 1]]) */
export function weighted<T>(items: readonly (readonly [T, number])[]): T {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = faker.number.float({ min: 0, max: total });
  for (const [value, w] of items) {
    r -= w;
    if (r <= 0) return value;
  }
  return items[items.length - 1][0];
}

export const round = (n: number, step = 1) => Math.round(n / step) * step;
export const money = (n: number) => Math.round(n * 100) / 100;

// ── Fechas (UTC, sin hora) ───────────────────────────────────────────────────────────────────────
const now = new Date();
export const TODAY = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

export const iso = (d: Date) => d.toISOString().slice(0, 10);
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * 86_400_000);
export function addMonths(d: Date, n: number) {
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const last = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(d.getUTCDate(), last));
  return r;
}
export const diffDays = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / 86_400_000);
export const firstOfMonth = (d: Date) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));

// ── Documentos de identidad válidos (ficticios) ─────────────────────────────────────────────────────
const LETRAS_DNI = "TRWAGMYFPDXBNJZSQVHLCKE";

export function dni(): string {
  const n = int(10_000_000, 99_999_999);
  return `${n}${LETRAS_DNI[n % 23]}`;
}

export function nie(): string {
  const prefijo = pick(["X", "Y", "Z"]);
  const n = int(1_000_000, 9_999_999);
  const num = Number(`${"XYZ".indexOf(prefijo)}${n}`);
  return `${prefijo}${n}${LETRAS_DNI[num % 23]}`;
}

/** CIF de sociedad limitada/anónima con dígito de control correcto. */
export function cif(): string {
  const letra = pick(["A", "B", "B", "B"]);
  const digits = String(int(1_000_000, 9_999_999));
  let suma = 0;
  for (let i = 0; i < 7; i++) {
    const d = Number(digits[i]);
    if (i % 2 === 0) {
      const dob = d * 2;
      suma += Math.floor(dob / 10) + (dob % 10);
    } else {
      suma += d;
    }
  }
  return `${letra}${digits}${(10 - (suma % 10)) % 10}`;
}

export const telefono = () => `${pick(["6", "6", "7"])}${int(0, 9)}${int(0, 9)} ${int(100, 999)} ${int(100, 999)}`.replace(/\s/g, " ");

export function slug(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");
}

export const ref = (prefix: string, id: number) => `${prefix}-${String(id).padStart(5, "0")}`;
