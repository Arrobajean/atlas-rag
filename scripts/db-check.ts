// Aplica todas las migraciones sobre un Postgres en memoria (PGlite) para validarlas antes de tocar Supabase.
import { createTestDb } from "./lib/pglite";

async function main() {
  console.log("Aplicando migraciones en PGlite…");
  const db = await createTestDb(true);
  const t = await db.query<{ n: number }>(
    "select count(*)::int as n from information_schema.tables where table_schema = 'public'"
  );
  const f = await db.query<{ n: number }>(
    "select count(*)::int as n from pg_proc p join pg_namespace s on s.oid = p.pronamespace where s.nspname = 'public'"
  );
  const c = await db.query<{ n: number }>("select count(*)::int as n from catalogo_campos");
  console.log(`OK · ${t.rows[0].n} tablas/vistas, ${f.rows[0].n} funciones, ${c.rows[0].n} campos en el catálogo`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
