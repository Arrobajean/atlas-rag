// Aplica las migraciones de supabase/migrations/ sobre tu proyecto de Supabase.
//   pnpm db:migrate          → con SUPABASE_DB_URL en .env aplica las migraciones pendientes
//   pnpm db:bundle           → sin URL: genera supabase/all-migrations.sql para pegar en el SQL Editor
//   pnpm db:bundle -- --desde=0011  → solo las migraciones desde la 0011 (supabase/pendientes.sql): lo normal tras la primera vez
//
// SUPABASE_DB_URL: Supabase > Connect > "Session pooler" (o Direct connection), en formato URI.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { readMigrations } from "./lib/migrations";

try {
  process.loadEnvFile(".env");
} catch {
  // sin .env
}

const bundle = process.argv.includes("--bundle");
const desde = process.argv.find((a) => a.startsWith("--desde="))?.split("=")[1];

async function main() {
  const todas = readMigrations();
  const migraciones = desde ? todas.filter((m) => m.name >= desde) : todas;

  if (bundle || !process.env.SUPABASE_DB_URL) {
    const salida = join(process.cwd(), "supabase", desde ? "pendientes.sql" : "all-migrations.sql");
    mkdirSync(join(process.cwd(), "supabase"), { recursive: true });
    const sql = migraciones.map((m) => `-- ══ ${m.name} ══\n${m.sql}`).join("\n\n");
    writeFileSync(salida, sql, "utf8");
    console.log(`Generado ${salida} (${migraciones.length} migraciones, ${(sql.length / 1024).toFixed(0)} KB).`);
    if (!bundle) {
      console.log("No hay SUPABASE_DB_URL en .env: pega ese archivo en Supabase > SQL Editor > New query > Run.");
    }
    return;
  }

  const { Client } = await import("pg");
  const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query(
      "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())"
    );
    const hechas = new Set((await client.query<{ name: string }>("select name from schema_migrations")).rows.map((r) => r.name));
    for (const m of migraciones) {
      if (hechas.has(m.name)) {
        console.log(`  · ${m.name} (ya aplicada)`);
        continue;
      }
      process.stdout.write(`  ▶ ${m.name} … `);
      await client.query("begin");
      try {
        await client.query(m.sql);
        await client.query("insert into schema_migrations (name) values ($1)", [m.name]);
        await client.query("commit");
        console.log("ok");
      } catch (err) {
        await client.query("rollback");
        console.log("ERROR");
        throw err;
      }
    }
    // schema_migrations queda fuera del alcance de la API pública
    await client.query("alter table schema_migrations enable row level security");
    console.log("Migraciones al día.");
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\n✘", err instanceof Error ? err.message : err);
  process.exit(1);
});
