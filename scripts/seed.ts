// Genera y carga el dataset de gestión inmobiliaria.
//   pnpm seed:test                 → carga en PGlite (memoria) y verifica; no toca Supabase
//   pnpm seed                      → carga en Supabase (SUPABASE_DB_URL si existe; si no, API REST)
//   pnpm seed -- --reset           → borra antes los datos del seed (imprescindible si ya hay datos)
import { buildDataset, TABLAS_EN_ORDEN, type Dataset } from "./seed/dataset";
import { createTestDb } from "./lib/pglite";
import { restSink, sqlSink, type Sink } from "./lib/sinks";
import { embedConCache } from "./lib/embed-cache";
import { pgliteRepo } from "./lib/pglite-repo";
import { generarArchivos, indexarSeed } from "./lib/sembrar-docs";

function cargarEnv() {
  try {
    process.loadEnvFile(".env");
  } catch {
    // sin .env: se usan las variables del entorno
  }
}

const args = new Map(
  process.argv.slice(2).filter((a) => a.startsWith("--")).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? "true"] as const;
  })
);

async function cargar(sink: Sink, ds: Dataset, reset: boolean) {
  const existentes = await sink.count("unidades");
  if (existentes > 0 && !reset) {
    throw new Error(`Ya hay ${existentes} unidades. Usa --reset para borrar los datos del seed y volver a cargar.`);
  }
  if (reset) {
    console.log("· Borrando datos anteriores del seed…");
    await sink.reset();
  }
  for (const tabla of TABLAS_EN_ORDEN) {
    const filas = ds.tablas[tabla];
    const t0 = Date.now();
    await sink.insert(tabla, filas);
    console.log(`· ${tabla.padEnd(16)} ${String(filas.length).padStart(6)} filas  (${Date.now() - t0} ms)`);
  }
  const catalogo = await sink.catalogo();
  const atributos = ds.atributos
    .filter((a) => catalogo.has(a.clave))
    .map((a) => ({ entidad: "contrato", registro_id: a.contrato_id, campo_id: catalogo.get(a.clave)!, valor: a.valor }));
  await sink.insert("atributos_valores", atributos);
  console.log(`· atributos_valores ${String(atributos.length).padStart(6)} filas`);
  await sink.finalizar();
}

function contar<T>(items: T[], f: (x: T) => string) {
  const m = new Map<string, number>();
  for (const i of items) m.set(f(i), (m.get(f(i)) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}: ${v}`).join(" · ");
}

function resumen(ds: Dataset) {
  const u = ds.cartera.unidades;
  const c = ds.contratos;
  console.log("\n── Resumen del dataset ─────────────────────────────────────────");
  console.log(`Unidades ${u.length} · edificios ${ds.cartera.edificios.length} · propietarios ${ds.propietarios.length}`);
  console.log(`Por tipo:      ${contar(u, (x) => x.tipo)}`);
  console.log(`Por operación: ${contar(u, (x) => x.operacion)}`);
  console.log(`Por estado:    ${contar(u, (x) => x.estado)}`);
  console.log(`Inquilinos ${ds.inquilinos.length} · clientes ${ds.clientes.length} · demandas ${ds.demandas.length} (${ds.demandas.filter((d) => d.activa).length} activas)`);
  console.log(`Contratos ${c.length}: ${contar(c, (x) => `${x.tipo}/${x.estado}`)}`);
  console.log(`Pagos ${ds.pagos.length} · morosos crónicos ${ds.casos.morosos.length}`);
}

async function verificar(db: { query: (s: string) => Promise<{ rows: Record<string, unknown>[] }> }) {
  console.log("\n── Comprobaciones en la base de datos ───────────────────────────");
  const q = async (titulo: string, sql: string) => {
    const r = await db.query(sql);
    console.log(`${titulo}:`, JSON.stringify(r.rows.length === 1 ? r.rows[0] : r.rows));
  };
  await q("Ocupación global", "select rpc_indicadores('{}'::jsonb) as i");
  await q("Alquiladas sin contrato vigente (debe ser 0)", "select count(*)::int as n from v_unidades where estado = 'alquilada' and contrato_vigente_id is null and cuenta_ocupacion and tipo not in ('garaje','trastero')");
  await q("Contratos vigentes en unidades no alquiladas (debe ser 0)", "select count(*)::int as n from v_unidades where estado <> 'alquilada' and contrato_vigente_id is not null and not tiene_subunidades");
  await q("Unidades por zona", "select grupo, total from rpc_contar_agrupar('{}'::jsonb, 'zona')");
  await q("Alertas por tipo", "select tipo, count(*)::int as n from v_alertas group by tipo order by n desc");
  await q("Morosidad", "select count(*)::int as contratos, round(sum(deuda))::int as deuda from v_morosidad");
}

async function main() {
  cargarEnv();
  const target = args.get("target") ?? (args.has("test") ? "pglite" : process.env.SUPABASE_DB_URL ? "pg" : "rest");
  const reset = args.has("reset");

  console.log("Generando dataset…");
  const t0 = Date.now();
  const ds = buildDataset();
  console.log(`Dataset listo en ${Date.now() - t0} ms`);
  resumen(ds);

  if (args.has("solo-resumen")) return;

  console.log(`\nCargando en: ${target}`);
  if (target === "pglite") {
    const db = await createTestDb();
    const sink = sqlSink("PGlite", db, async () => db.close());
    await cargar(sink, ds, false);
    if (args.has("con-docs")) {
      console.log("\nGenerando e indexando documentos (Gemini para embeddings y OCR; se cachea en seed-output/cache)…");
      const { archivos } = await generarArchivos(ds);
      const repo = pgliteRepo(db);
      await indexarSeed(archivos, {
        repo,
        embed: (t) => embedConCache(t, "RETRIEVAL_DOCUMENT"),
        log: console.log,
        vincularContrato: async (c, d) => {
          await db.query("update contratos set documento_id = $2 where id = $1", [c, d]);
        },
      });
      const r = await db.query("select count(*)::int as documentos, (select count(*)::int from document_chunks) as fragmentos from documentos");
      console.log("Documentos indexados:", JSON.stringify(r.rows[0]));
    }
    await verificar(db);
    await sink.cerrar();
    return;
  }
  if (target === "pg") {
    const { Client } = await import("pg");
    const client = new Client({ connectionString: process.env.SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
    await client.connect();
    const sink = sqlSink("Postgres", client, () => client.end());
    await cargar(sink, ds, reset);
    await verificar(client);
    await sink.cerrar();
    return;
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_KEY;
  if (!url || !key) throw new Error("Faltan SUPABASE_URL o SUPABASE_KEY en .env");
  const sink = restSink(url, key);
  await cargar(sink, ds, reset);
  await sink.cerrar();
}

main().catch((err) => {
  console.error("\n✘", err instanceof Error ? err.message : err);
  process.exit(1);
});
