import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";
import { pg_trgm } from "@electric-sql/pglite/contrib/pg_trgm";
import { unaccent } from "@electric-sql/pglite/contrib/unaccent";
import { PGLITE_PRELUDE, readMigrations, shimForPglite } from "./migrations";

/** Postgres en memoria con todas las migraciones aplicadas (pgvector simulado). */
export async function createTestDb(log = false): Promise<PGlite> {
  const db = new PGlite({ extensions: { unaccent, pg_trgm, btree_gist } });
  // Las extensiones se crean aparte: PGlite no las ve dentro del mismo lote que las usa.
  await db.exec("create extension if not exists unaccent;");
  await db.exec("create extension if not exists pg_trgm;");
  await db.exec("create extension if not exists btree_gist;");
  await db.exec("create role anon nologin; create role authenticated nologin; create role service_role nologin;");
  await db.exec(PGLITE_PRELUDE);
  for (const m of readMigrations()) {
    try {
      await db.exec(shimForPglite(m.sql));
      if (log) console.log(`  ✔ ${m.name}`);
    } catch (err) {
      console.error(`  ✘ ${m.name}`);
      throw err;
    }
  }
  return db;
}
