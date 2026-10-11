// Prueba rpc_accion (las 4 acciones del asistente) contra la base local con el seed.
//   pnpm acciones:test
import { buildDataset, TABLAS_EN_ORDEN } from "./seed/dataset";
import { createTestDb } from "./lib/pglite";
import { sqlSink } from "./lib/sinks";

async function main() {
  const ds = buildDataset();
  const db = await createTestDb();
  const sink = sqlSink("t", db, async () => {});
  for (const t of TABLAS_EN_ORDEN) await sink.insert(t, ds.tablas[t]);
  await sink.finalizar();

  let fallos = 0;
  const llamar = async (nombre: string, tipo: string, datos: object, ejecutar: boolean) => {
    try {
      const r = await db.query<{ rpc_accion: Record<string, unknown> }>("select rpc_accion($1, $2::jsonb, $3, 'test') as rpc_accion", [tipo, JSON.stringify(datos), ejecutar]);
      return { ok: true as const, r: r.rows[0].rpc_accion };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  };
  const esperar = (cond: boolean, msg: string) => {
    console.log(`${cond ? "✔" : "✘"} ${msg}`);
    if (!cond) fallos++;
  };

  const libre = (await db.query<{ referencia: string; estado: string }>("select referencia, estado from unidades where estado = 'disponible' and operacion = 'alquiler' and tipo = 'piso' limit 1")).rows[0];
  const alquilada = (await db.query<{ referencia: string }>("select referencia from unidades where estado = 'alquilada' and operacion = 'alquiler' limit 1")).rows[0];

  // 1. Incidencia
  let r = await llamar("prev", "crear_incidencia", { unidad_ref: libre.referencia, categoria: "fontaneria", prioridad: "alta", descripcion: "Fuga de agua en el baño" }, false);
  esperar(r.ok && !(r.r as { ejecutado: boolean }).ejecutado, `Vista previa incidencia: ${r.ok ? r.r.resumen : r.error}`);
  const antes = (await db.query<{ n: number }>("select count(*)::int as n from incidencias")).rows[0].n;
  r = await llamar("ejec", "crear_incidencia", { unidad_ref: libre.referencia, categoria: "fontaneria", prioridad: "alta", descripcion: "Fuga de agua en el baño" }, true);
  const despues = (await db.query<{ n: number }>("select count(*)::int as n from incidencias")).rows[0].n;
  esperar(r.ok && despues === antes + 1, `Ejecutar incidencia crea 1 fila (${antes} → ${despues})`);
  r = await llamar("x", "crear_incidencia", { unidad_ref: "U-99999", descripcion: "algo que falla" }, false);
  esperar(!r.ok && /No existe la unidad/.test(r.error), `Unidad inexistente rechazada: ${!r.ok ? r.error : ""}`);
  r = await llamar("x", "crear_incidencia", { descripcion: "sin ubicación aquí" }, false);
  esperar(!r.ok, "Sin unidad ni edificio rechazada");
  r = await llamar("x", "crear_incidencia", { unidad_ref: libre.referencia, categoria: "robo", descripcion: "categoría inventada" }, false);
  esperar(!r.ok, "Categoría inventada rechazada");

  // 2. Cliente + demanda
  const demanda = { nombre: "Lucía Prueba", telefono: "611 000 111", email: "lucia@example.com", tipo_cliente: "inquilino", operacion: "alquiler", presupuesto_max: 1400, habitaciones_min: 2, tipos_unidad: ["piso"], zonas: ["Madrid Sur"], distritos: ["Carabanchel"], necesita_mascotas: true, notas: "Busca algo luminoso y con ascensor" };
  r = await llamar("x", "crear_cliente_demanda", demanda, false);
  esperar(r.ok, `Vista previa cliente: ${r.ok ? r.r.resumen : r.error}`);
  r = await llamar("x", "crear_cliente_demanda", demanda, true);
  esperar(r.ok && !!(r.r as { demanda_id: number }).demanda_id, "Ejecutar crea cliente y demanda");
  const clienteId = r.ok ? Number((r.r as { cliente_id: number }).cliente_id) : 0;
  r = await llamar("x", "crear_cliente_demanda", demanda, false);
  esperar(!r.ok && /Ya existe un cliente con ese teléfono/.test(r.error), "Cliente duplicado por teléfono rechazado");
  r = await llamar("x", "crear_cliente_demanda", { cliente_id: clienteId, operacion: "venta", presupuesto_max: 300000 }, true);
  esperar(r.ok, "Añadir otra demanda a un cliente existente");
  r = await llamar("x", "crear_cliente_demanda", { nombre: "Otro Cliente", operacion: "alquiler", presupuesto_max: 900, zonas: ["Zona Inventada"] }, false);
  esperar(!r.ok && /zona no existe/.test(r.error), "Zona inexistente rechazada");
  r = await llamar("x", "crear_cliente_demanda", { nombre: "Otro Cliente", operacion: "alquiler" }, false);
  esperar(!r.ok, "Sin presupuesto rechazada");

  // 3. Alerta
  const alerta = (await db.query<{ clave: string }>("select clave from v_alertas limit 1")).rows[0];
  r = await llamar("x", "resolver_alerta", { clave: alerta.clave, accion: "posponer", dias: 10 }, true);
  esperar(r.ok, `Posponer alerta: ${r.ok ? r.r.resumen : r.error}`);
  const sigue = (await db.query("select 1 from v_alertas where clave = $1", [alerta.clave])).rows.length;
  esperar(sigue === 0, "La alerta pospuesta desaparece de la lista");
  r = await llamar("x", "resolver_alerta", { clave: alerta.clave }, false);
  esperar(!r.ok, "Alerta ya pospuesta rechazada");
  r = await llamar("x", "resolver_alerta", { clave: "inventada:1" }, false);
  esperar(!r.ok, "Alerta inexistente rechazada");

  // 4. Estado de unidad
  r = await llamar("x", "cambiar_estado_unidad", { unidad_ref: libre.referencia, estado: "reforma" }, true);
  esperar(r.ok, `Cambiar a reforma: ${r.ok ? r.r.resumen : r.error}`);
  const est = (await db.query<{ estado: string }>("select estado from unidades where referencia = $1", [libre.referencia])).rows[0].estado;
  esperar(est === "reforma", `La unidad quedó en «${est}»`);
  r = await llamar("x", "cambiar_estado_unidad", { unidad_ref: alquilada.referencia, estado: "disponible" }, true);
  esperar(!r.ok, `No se puede liberar una unidad alquilada: ${!r.ok ? r.error : ""}`);
  r = await llamar("x", "cambiar_estado_unidad", { unidad_ref: libre.referencia, estado: "alquilada" }, false);
  esperar(!r.ok, "No se puede poner «alquilada» a mano");
  r = await llamar("x", "borrar_todo", {}, true);
  esperar(!r.ok && /no soportada/.test(r.error), "Acción desconocida rechazada");

  const aud = (await db.query<{ n: number }>("select count(*)::int as n from auditoria where columna in ('accion_asistente', 'estado') and origen = 'ia'")).rows[0].n;
  esperar(aud >= 4, `Auditoría registrada (${aud} filas)`);
  console.log(fallos === 0 ? "\nTodo correcto" : `\n${fallos} fallos`);
  process.exit(fallos === 0 ? 0 : 1);
}
main().catch((e) => { console.error(e); process.exit(1); });
