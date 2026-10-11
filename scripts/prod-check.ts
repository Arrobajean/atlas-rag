// Comprobación de extremo a extremo contra el Supabase real del .env (agente + lector).
//   pnpm prod:check
import { readFileSync } from "node:fs";
import { ejecutarAgente } from "../src/lib/chat/agent";
import { supabaseData } from "../src/lib/chat/data";
import { supabaseDb } from "../src/lib/db";
import { supabaseRepo } from "../src/lib/documents/repo";
import { crearExtraccion } from "../src/lib/lector/extraer";
import { estadoLector } from "../src/lib/lector/servicio";
import { subirEIndexar } from "../src/lib/documents/ingest";

try { process.loadEnvFile(".env"); } catch { /* sin .env */ }

const PREGUNTAS = [
  "¿Cuántos pisos libres para alquilar hay en Madrid Sur?",
  "¿Se permiten mascotas en el edificio de Calle de Toledo 45?",
  "Busca algo luminoso y tranquilo para alquilar en Chamberí por menos de 1.800 €",
];

async function main() {
  const data = supabaseData();
  for (const q of PREGUNTAS) {
    console.log(`\n══ ${q}`);
    let texto = "";
    await ejecutarAgente({
      mensajes: [{ role: "user", content: q }],
      data,
      onEvent: (e) => {
        if (e.type === "tool_start") console.log(`  ▶ ${e.descripcion}`);
        if (e.type === "tool_end") console.log(`    ${e.ok ? "✔" : "✘"} ${e.resumen}`);
        if (e.type === "text") texto += e.delta;
      },
    });
    console.log(texto.trim().slice(0, 700));
  }

  console.log("\n══ Lector: contrato de prueba (subida + lectura)");
  const bytes = new Uint8Array(readFileSync("seed-output/pdfs/prueba-lector/prueba-lector-01-nuevo-inquilino.pdf"));
  const repo = supabaseRepo();
  const sub = await subirEIndexar({ nombre: "prueba-lector-01.pdf", mime: "application/pdf", data: bytes }, { titulo: "PRUEBA lector 01", tipo: "contrato" }, { prefijoRuta: "seed/" });
  const { id } = await crearExtraccion(supabaseDb(), repo, sub.documento_id);
  const e = await estadoLector(supabaseDb(), repo, id);
  const leidos = e.campos.filter((c) => e.datos[c.clave]?.encontrado).length;
  console.log(`Documento ${sub.documento_id}, extracción ${id}: ${leidos}/${e.campos.length} campos · unidad sugerida ${e.sugerencias?.unidadSugerida} · inquilino sugerido ${e.sugerencias?.inquilinoSugerido}`);
  console.log(`Abrir en la app: /dashboard/lector/${id}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
