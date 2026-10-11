import type { PGlite } from "@electric-sql/pglite";
import type { ConsultaOpciones, Db } from "../../src/lib/db";

/** BigInt → number y arrays de vectores, para que el resultado sea JSON como el de PostgREST. */
function aJson(v: unknown): unknown {
  if (typeof v === "bigint") return Number(v);
  if (Array.isArray(v)) return v.map(aJson);
  if (v && typeof v === "object" && !(v instanceof Date)) {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, aJson(x)]));
  }
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return v;
}

/** Implementa DataAccess.rpc sobre PGlite, con la misma semántica que PostgREST (parámetros nombrados). */
const IDENT = /^[a-z_][a-z0-9_]*$/;
const ident = (x: string) => {
  if (!IDENT.test(x)) throw new Error(`Identificador no válido: ${x}`);
  return x;
};
const COLUMNAS_JSON = new Set(["datos", "valores_finales", "resolucion", "hallazgos"]);
const aParam = (k: string, v: unknown) => (COLUMNAS_JSON.has(k) && v !== null && v !== undefined ? JSON.stringify(v) : v);

export function pgliteData(db: PGlite): Db {
  return {
    async seleccionar<T>(tabla: string, o: ConsultaOpciones = {}) {
      const cols = o.columnas && o.columnas !== "*" ? o.columnas.split(",").map((c) => ident(c.trim())).join(", ") : "*";
      const claves = Object.keys(o.igual ?? {});
      const where = claves.map((k, i) => (o.igual![k] === null ? `${ident(k)} is null` : `${ident(k)} = $${i + 1}`)).join(" and ");
      const params = claves.filter((k) => o.igual![k] !== null).map((k) => o.igual![k]);
      const sql = `select ${cols} from ${ident(tabla)}${where ? ` where ${where}` : ""}${o.orden ? ` order by ${ident(o.orden.columna)} ${o.orden.ascendente === false ? "desc" : "asc"}` : ""}${o.limite ? ` limit ${Number(o.limite)}` : ""}`;
      const r = await db.query(sql, params);
      return aJson(r.rows) as T[];
    },
    async insertar<T>(tabla: string, fila: Record<string, unknown>) {
      const claves = Object.keys(fila);
      const r = await db.query(
        `insert into ${ident(tabla)} (${claves.map(ident).join(", ")}) values (${claves.map((_, i) => `$${i + 1}`).join(", ")}) returning *`,
        claves.map((k) => aParam(k, fila[k]))
      );
      return aJson(r.rows[0]) as T;
    },
    async actualizar(tabla: string, id: number, cambios: Record<string, unknown>) {
      const claves = Object.keys(cambios);
      await db.query(
        `update ${ident(tabla)} set ${claves.map((k, i) => `${ident(k)} = $${i + 2}`).join(", ")} where id = $1`,
        [id, ...claves.map((k) => aParam(k, cambios[k]))]
      );
    },
    async rpc<T>(nombre: string, args: Record<string, unknown> = {}) {
      const claves = Object.keys(args);
      const params = claves.map((k) => {
        const v = args[k];
        // pgvector se simula con float8[]: '[1,2]' → '{1,2}'
        if (typeof v === "string" && /^\[[-\d.eE,\s]+\]$/.test(v)) return `{${v.slice(1, -1)}}`;
        if (v !== null && typeof v === "object" && !Array.isArray(v)) return JSON.stringify(v);
        return v;
      });
      const llamada = claves.map((k, i) => `${k} => $${i + 1}`).join(", ");
      const r = await db.query<Record<string, unknown>>(`select * from ${nombre}(${llamada})`, params);
      const filas = aJson(r.rows) as Record<string, unknown>[];
      // Funciones escalares (jsonb/bigint): PostgREST devuelve el valor, no una fila
      if (filas.length === 1 && Object.keys(filas[0]).length === 1 && Object.keys(filas[0])[0] === nombre) {
        return filas[0][nombre] as T;
      }
      return filas as T;
    },
  };
}
