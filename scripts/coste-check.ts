// Mide tokens reales por pregunta y comprueba la calidad de la búsqueda vectorial en el Supabase real.
//   pnpm coste:check
import { ejecutarAgente } from "../src/lib/chat/agent";
import { supabaseData } from "../src/lib/chat/data";
import { embedQuery, getSupabaseClient, toVector } from "../src/lib/rag";

try { process.loadEnvFile(".env"); } catch { /* sin .env */ }

const PREGUNTAS = [
  "¿Cuántos pisos libres para alquilar hay en Madrid Sur?",
  "¿Qué contratos vencen en los próximos 30 días en Madrid Centro?",
  "¿Se permiten mascotas en el edificio de Calle de Toledo 45?",
  "Busca algo luminoso y tranquilo para alquilar en Chamberí por menos de 1.800 €",
];

async function coste() {
  console.log("── Tokens por pregunta (medidos) ─────────────────────────────");
  const data = supabaseData();
  const tot = { entrada: 0, salida: 0, razonamiento: 0, llamadas: 0, consultas: 0 };
  for (const q of PREGUNTAS) {
    const u = { entrada: 0, salida: 0, razonamiento: 0, llamadas: 0, consultas: 0 };
    const t0 = Date.now();
    await ejecutarAgente({
      mensajes: [{ role: "user", content: q }], data,
      onEvent: (e) => { if (e.type === "tool_start") u.consultas++; },
      onUso: (x) => { u.entrada += x.entrada; u.salida += x.salida; u.razonamiento += x.razonamiento; u.llamadas++; },
    });
    console.log(`${String(u.llamadas).padStart(1)} llamadas al modelo · ${u.consultas} consultas a la BD · entrada ${u.entrada} · salida ${u.salida} · razonamiento ${u.razonamiento} · ${((Date.now() - t0) / 1000).toFixed(1)} s  ← ${q.slice(0, 55)}`);
    for (const k of ["entrada", "salida", "razonamiento", "llamadas", "consultas"] as const) tot[k] += u[k];
  }
  const n = PREGUNTAS.length;
  console.log(`MEDIA por pregunta: ${(tot.llamadas / n).toFixed(1)} llamadas · entrada ${Math.round(tot.entrada / n)} · salida ${Math.round((tot.salida + tot.razonamiento) / n)} tokens`);
}

async function calidad() {
  console.log("\n── Calidad de la búsqueda vectorial ─────────────────────────");
  const sb = getSupabaseClient();

  // 1) Auto-recuperación: la descripción de una propiedad debe encontrar esa propiedad como primera
  const { data: muestra } = await sb.from("unidades").select("id, referencia, descripcion").not("descripcion_embedding", "is", null).order("id").range(100, 109);
  let ok = 0;
  for (const u of muestra ?? []) {
    const v = await embedQuery(String(u.descripcion));
    const { data } = await sb.rpc("rpc_buscar_unidades_semantico", { query_embedding: toVector(v), f: { incluir_anexos: true, incluir_subunidades: true }, p_count: 3 });
    const top = (data as { id: number; similitud: number }[])[0];
    if (top?.id === u.id) ok++;
    else console.log(`  ✘ ${u.referencia}: primero ${top?.id} (${top?.similitud})`);
  }
  console.log(`Propiedades: la primera es la propia en ${ok}/${muestra?.length}`);

  // 2) Documentos: una consulta natural debe traer el documento correcto
  const casos = [
    ["¿cuál es la fianza legal en un contrato de vivienda?", "legal"],
    ["horario de silencio y ruidos en la comunidad", "normas"],
    ["procedimiento para devolver la fianza al inquilino", "fianzas"],
  ] as const;
  for (const [q, esperado] of casos) {
    const v = await embedQuery(q);
    const { data } = await sb.rpc("rpc_buscar_documentos", { query_embedding: toVector(v), query_text: q, p_count: 3 });
    const filas = data as { titulo: string; tipo: string; pagina: number; similitud: number; score: number }[];
    console.log(`«${q}»`);
    for (const f of filas) console.log(`   ${f.similitud?.toFixed(3)} · ${f.tipo} · ${f.titulo.slice(0, 70)} p.${f.pagina}`);
    void esperado;
  }

  // 3) El filtro de ámbito: solo debe devolver documentos de esa unidad, de su edificio o generales
  const { data: u1 } = await sb.rpc("rpc_ficha_unidad", { p_ref: "U-00001" });
  const idU = (u1 as { unidad: { id: number } }).unidad.id;
  const v = await embedQuery("mascotas");
  const { data: amb } = await sb.rpc("rpc_buscar_documentos", { query_embedding: toVector(v), query_text: "mascotas", p_unidad: idU, p_count: 8 });
  const ambitos = new Set((amb as { ambito: string }[]).map((a) => a.ambito));
  console.log(`Ámbitos devueltos para U-00001: ${[...ambitos].join(", ")} (esperado: unidad/edificio/general)`);
}

coste().then(calidad).catch((e) => { console.error(e); process.exit(1); });
