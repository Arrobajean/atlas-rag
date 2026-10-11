import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const MIGRATIONS_DIR = join(process.cwd(), "supabase", "migrations");

export interface Migration {
  name: string;
  sql: string;
}

/** Migraciones en orden. Los `.manual.sql` (destructivos) se omiten a propósito. */
export function readMigrations(): Migration[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") && !f.endsWith(".manual.sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(join(MIGRATIONS_DIR, name), "utf8") }));
}

/**
 * Prelude para PGlite: no incluye pgvector, así que `vector` se simula con float8[] y
 * `<=>` con distancia coseno. Solo para probar sintaxis y lógica de las migraciones en local.
 */
export const PGLITE_PRELUDE = `
create or replace function _cos_dist(a float8[], b float8[]) returns float8
language sql immutable as $$
  select 1 - sum(x * y) / nullif(sqrt(sum(x * x)) * sqrt(sum(y * y)), 0) from unnest(a, b) t(x, y)
$$;
create operator <=> (leftarg = float8[], rightarg = float8[], function = _cos_dist);
`;

export function shimForPglite(sql: string): string {
  return sql
    .replace(/create extension if not exists \w+( with schema public)?;/gi, "")
    .replace(/create index if not exists \w+\s+on \w+ using hnsw[^;]*;/gi, "")
    .replace(/vector\(768\)/g, "float8[]");
}
