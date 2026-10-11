// Prueba el lector de contratos de extremo a extremo (Gemini real + base de datos local con el seed).
//   pnpm lector:test
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { crearExtraccion } from "../src/lib/lector/extraer";
import { confirmarExtraccion, estadoLector } from "../src/lib/lector/servicio";
import { buildDataset, TABLAS_EN_ORDEN } from "./seed/dataset";
import { createTestDb } from "./lib/pglite";
import { pgliteData } from "./lib/pglite-data";
import { pgliteRepo } from "./lib/pglite-repo";
import { generarArchivos } from "./lib/sembrar-docs";
import { sqlSink } from "./lib/sinks";

try {
  process.loadEnvFile(".env");
} catch {
  // sin .env
}

async function main() {
  const ds = buildDataset();
  const pg = await createTestDb();
  const sink = sqlSink("t", pg, async () => {});
  for (const t of TABLAS_EN_ORDEN) await sink.insert(t, ds.tablas[t]);
  await sink.finalizar();
  await generarArchivos(ds);
  const db = pgliteData(pg);
  const repo = pgliteRepo(pg);

  const pruebas = [
    "prueba-lector-01-nuevo-inquilino",
    "prueba-lector-02-inquilino-existente",
    "prueba-lector-03-escaneado",
  ];
  for (const nombre of pruebas) {
    console.log(`\n══ ${nombre}`);
    const bytes = new Uint8Array(readFileSync(join("seed-output", "pdfs", "prueba-lector", `${nombre}.pdf`)));
    const ruta = `pruebas/${nombre}.pdf`;
    await repo.archivos.subir(ruta, bytes, "application/pdf");
    const docId = await repo.crear({ titulo: nombre, tipo: "contrato", edificio_id: null, unidad_id: null, contrato_id: null, fecha_documento: null, sustituye_a: null, storage_path: ruta, mime: "application/pdf", hash_sha256: null });

    const t0 = Date.now();
    const { id, avisos } = await crearExtraccion(db, repo, docId);
    console.log(`Extracción ${id} en ${((Date.now() - t0) / 1000).toFixed(1)} s`, avisos.length ? `· avisos: ${avisos.join(" | ")}` : "");

    const e = await estadoLector(db, repo, id);
    const faltan = e.campos.filter((c) => !e.datos[c.clave]?.encontrado).map((c) => c.clave);
    console.log(`Campos leídos: ${e.campos.length - faltan.length}/${e.campos.length}${faltan.length ? ` · sin encontrar: ${faltan.join(", ")}` : ""}`);
    for (const c of e.campos.filter((x) => ["contrato_renta_mensual", "contrato_fecha_inicio", "contrato_fecha_fin", "inquilino_nombre", "inquilino_documento", "attr_permite_mascotas"].includes(x.clave))) {
      const d = e.datos[c.clave];
      console.log(`  ${c.etiqueta.padEnd(22)} = ${String(d.valor).padEnd(20)} conf ${d.confianza.toFixed(2)} pág ${d.pagina} «${(d.texto ?? "").slice(0, 60)}»`);
    }
    console.log("Sugerencias → unidad:", e.sugerencias?.unidadSugerida, "· inquilino:", e.sugerencias?.inquilinoSugerido, "· candidatos unidad:", e.sugerencias?.unidades.map((u) => `${u.referencia}(${u.score})`).join(", "));
    console.log("Comparaciones:", e.comparaciones.map((c) => `${c.clave}:${c.estado}`).join(", "));

    const res = e.resolucion;
    if (!res.unidad_id) {
      console.log("✘ No se resolvió la unidad automáticamente");
      continue;
    }
    const r = await confirmarExtraccion(db, id, e.valores, res, "test");
    console.log(`✔ Confirmado: ${r.referencia} (inquilino ${r.inquilino_id}, modo ${res.inquilino.modo})`, r.hallazgos.map((h) => `[${h.severidad}] ${h.titulo}`));
    const c = await pg.query("select estado, fianza, renta_mensual, documento_id from contratos where id = $1", [r.contrato_id]);
    const a = await pg.query("select count(*)::int as n, count(*) filter (where origen = 'ia')::int as ia, count(*) filter (where origen = 'humano')::int as humano from auditoria where extraccion_id = $1", [id]);
    console.log("BD:", JSON.stringify(c.rows[0]), "auditoría:", JSON.stringify(a.rows[0]));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
