import type { ContratoRow } from "../contratos";
import type { Dataset } from "../dataset";
import type { EdificioRow, UnidadRow } from "../portfolio";
import { addDays, chance, dni, int, iso, pick, resetRandom, SEED, shuffle, slug, TODAY, weighted } from "../util";
import { construirActa, construirEstatutos, construirNormas, type EdificioDoc, type PoliticaEdificio } from "./comunidad";
import { construirContrato, type DatosContratoDoc } from "./contrato";
import type { DocSeed } from "./render";
import { certificadoEnergetico, guiaFianzasMadrid, guiaLau, guiaVivienda2023, inventarioEntrada, procedimientoEntradaSalida, procedimientoFianzas, procedimientoIncidencias } from "./varios";

export interface PlanDocumentos {
  docs: DocSeed[];
  /** Contratos en PDF que NO están en la base de datos: para probar el lector de documentos. */
  pruebaLector: (DocSeed & { descripcion: string })[];
  /** Hechos conocidos, para evaluar respuestas del chat. */
  hechos: Record<string, unknown>;
}

const TIPO_UNIDAD_TEXTO: Record<string, string> = {
  piso: "piso", atico: "ático", duplex: "dúplex", estudio: "estudio", chalet: "chalé", habitacion: "habitación",
  local: "local comercial", oficina: "oficina", garaje: "plaza de garaje", trastero: "trastero",
};

export function planificarDocumentos(ds: Dataset): PlanDocumentos {
  resetRandom(SEED + 7);
  const edificios = new Map(ds.cartera.edificios.map((e) => [e.id, e]));
  const municipios = new Map(ds.geo.municipios.map((m) => [m.id, m]));
  const unidades = new Map(ds.cartera.unidades.map((u) => [u.id, u]));
  const propietarios = new Map(ds.propietarios.map((p) => [p.id, p]));
  const inquilinos = new Map(ds.inquilinos.map((i) => [i.id, i]));
  const atributos = new Map<string, boolean | number>();
  for (const a of ds.atributos) atributos.set(`${a.contrato_id}:${a.clave}`, a.valor);

  const docs: DocSeed[] = [];
  const hechos: Record<string, unknown> = {};

  const edificioDoc = (e: EdificioRow): EdificioDoc => ({
    id: e.id, referencia: e.referencia, direccion: e.direccion, municipio: municipios.get(e.municipio_id)!.nombre,
    cp: e.codigo_postal, anio: e.anio_construccion, plantas: e.plantas, ascensor: e.ascensor, garaje: e.garaje,
    piscina: e.piscina, portero: e.portero, administrador: e.administrador_fincas ?? "Administración de Fincas Gutiérrez",
  });

  // ── Contratos con PDF ────────────────────────────────────────────────────────────────────────
  const t = ds.casos.trampas;
  const vigentes = ds.contratos.filter((c) => c.estado === "vigente" && c.tipo !== "compraventa");
  const porTipo = (tipo: string) => shuffle(vigentes.filter((c) => c.tipo === tipo));
  const elegidos = new Set<number>([1, t.fianzaExcesiva, t.garantiaExcesiva, t.gastosGestion, t.mascotasContradice]);
  for (const c of [...porTipo("vivienda_habitual").slice(0, 12), ...porTipo("habitacion").slice(0, 4), ...porTipo("temporada").slice(0, 4), ...porTipo("local").slice(0, 4)]) {
    elegidos.add(c.id);
  }
  const contratoConDesfase = shuffle(vigentes.filter((c) => c.tipo === "vivienda_habitual" && !elegidos.has(c.id)))[0];
  elegidos.add(contratoConDesfase.id);
  const contratoEscaneado = shuffle(vigentes.filter((c) => c.tipo === "vivienda_habitual" && !elegidos.has(c.id)))[0];
  elegidos.add(contratoEscaneado.id);

  const casoContrato = (c: ContratoRow): DatosContratoDoc => {
    const u = unidades.get(c.unidad_id)!;
    const e = edificios.get(u.edificio_id)!;
    const inq = inquilinos.get(c.inquilino_id!)!;
    const prop = propietarios.get(u.propietario_id)!;
    const flag = (clave: string, defecto: boolean) => (atributos.has(`${c.id}:${clave}`) ? Boolean(atributos.get(`${c.id}:${clave}`)) : defecto);
    const num = (clave: string, defecto: number) => (atributos.has(`${c.id}:${clave}`) ? Number(atributos.get(`${c.id}:${clave}`)) : defecto);
    const tipo = c.tipo as DatosContratoDoc["tipo"];
    return {
      clave: `contrato-${c.referencia}`,
      contratoId: c.id,
      contratoRef: c.referencia,
      tipo,
      fechaFirma: c.fecha_firma!,
      inicio: c.fecha_inicio,
      fin: c.fecha_fin!,
      renta: c.renta_mensual!,
      fianza: c.fianza!,
      garantia: c.garantia_adicional,
      indice: c.indice_actualizacion,
      diaPago: c.dia_pago ?? 1,
      arrendador: { nombre: prop.nombre, documento: prop.documento, sociedad: prop.tipo_persona === "sociedad" },
      inquilino: { nombre: inq.nombre, apellidos: inq.apellidos, documentoTipo: inq.documento_tipo, documento: inq.documento, email: inq.email, telefono: inq.telefono },
      inmueble: {
        direccion: e.direccion,
        municipio: municipios.get(e.municipio_id)!.nombre,
        cp: e.codigo_postal,
        tipoUnidad: TIPO_UNIDAD_TEXTO[u.tipo] ?? u.tipo,
        planta: u.planta,
        puerta: u.puerta,
        superficie: u.superficie_m2,
        habitaciones: u.habitaciones,
        referenciaCatastral: u.referencia_catastral,
        certificado: u.certificado_energetico,
        unidadRef: u.referencia,
        amueblado: u.amueblado,
      },
      edificioId: e.id,
      unidadId: u.id,
      clausulas: {
        mascotas: flag("attr_permite_mascotas", u.admite_mascotas),
        fumar: flag("attr_permite_fumar", false),
        subarriendo: flag("attr_permite_subarriendo", false),
        suministrosInquilino: flag("attr_suministros_a_cargo_inquilino", tipo !== "temporada"),
        gastosGestionInquilino: flag("attr_gastos_gestion_a_cargo_inquilino", false),
        preavisoMeses: num("attr_meses_preaviso_desistimiento", 1),
        penalizacionMeses: num("attr_penalizacion_desistimiento_meses", tipo === "vivienda_habitual" ? 1 : 0),
        seguroHogar: flag("attr_seguro_hogar_obligatorio", chance(0.3)),
      },
      motivoTemporada: tipo === "temporada" ? pick(["un proyecto laboral temporal en Madrid", "estudios de posgrado en la ciudad", "un tratamiento médico de larga duración"]) : undefined,
      actividadLocal: tipo === "local" ? pick(["cafetería", "estudio de arquitectura", "comercio de moda", "clínica de fisioterapia", "tienda de alimentación"]) : undefined,
    };
  };

  // Coherencia de los casos «trampa»: el PDF refleja lo que hay en la base de datos
  atributos.set(`1:attr_permite_mascotas`, true);
  const idsConPdf: number[] = [];
  for (const id of elegidos) {
    const c = ds.contratos.find((x) => x.id === id)!;
    const datos = casoContrato(c);
    if (id === contratoConDesfase.id) datos.renta = (c.renta_mensual ?? 0) + 150; // el PDF NO coincide con la base de datos
    if (id === contratoEscaneado.id) datos.escaneado = true;
    docs.push(construirContrato(datos));
    idsConPdf.push(id);
  }
  hechos.contratosConPdf = idsConPdf.map((id) => ds.contratos.find((c) => c.id === id)!.referencia);
  hechos.trampas = {
    fianza_excesiva: ds.contratos.find((c) => c.id === t.fianzaExcesiva)!.referencia,
    garantia_excesiva: ds.contratos.find((c) => c.id === t.garantiaExcesiva)!.referencia,
    gastos_gestion_a_inquilino: ds.contratos.find((c) => c.id === t.gastosGestion)!.referencia,
    mascotas_prohibidas_en_contrato: ds.contratos.find((c) => c.id === t.mascotasContradice)!.referencia,
    pdf_no_coincide_con_bd: { contrato: contratoConDesfase.referencia, renta_bd: contratoConDesfase.renta_mensual, renta_pdf: (contratoConDesfase.renta_mensual ?? 0) + 150 },
    pdf_escaneado: contratoEscaneado.referencia,
  };

  // ── Normas, actas y estatutos ────────────────────────────────────────────────────────────────
  const edificiosConNormas = new Set<number>([ds.casos.toledo45, ds.casos.toledo47]);
  for (const id of [t.fianzaExcesiva, t.garantiaExcesiva, t.gastosGestion, t.mascotasContradice]) {
    edificiosConNormas.add(unidades.get(ds.contratos.find((c) => c.id === id)!.unidad_id)!.edificio_id);
  }
  const candidatos = shuffle(ds.cartera.edificios.filter((e) => ds.cartera.unidades.filter((u) => u.edificio_id === e.id).length >= 5));
  for (const e of candidatos) {
    if (edificiosConNormas.size >= 16) break;
    edificiosConNormas.add(e.id);
  }

  const politicaAleatoria = (): PoliticaEdificio => ({
    mascotas: weighted([["libres", 35], ["limitadas", 35], ["prohibidas", 30]] as const),
    maxMascotas: pick([1, 2, 2, 3]),
    turistico: weighted([["prohibido", 65], ["autorizado", 35]] as const),
    silencioDesde: pick(["22:00", "22:00", "23:00"]),
    silencioHasta: pick(["07:00", "08:00", "08:00"]),
    obrasHorario: pick(["de lunes a viernes de 9:00 a 18:00", "de lunes a viernes de 9:00 a 14:00 y de 16:00 a 19:00", "de lunes a sábado de 9:00 a 14:00"]),
    obrasAgosto: chance(0.5),
    mudanzas: pick(["de lunes a viernes entre las 9:00 y las 19:00", "de lunes a sábado entre las 10:00 y las 18:00"]),
    basuras: pick([
      "Los residuos se depositarán en bolsas cerradas en los contenedores de la calle entre las 20:00 y las 23:00 horas.",
      "Las bolsas de basura se bajarán al cuarto de residuos del portal y se separarán vidrio, envases y orgánico.",
    ]),
    piscinaHorario: pick(["de 10:00 a 21:00 desde el 1 de junio hasta el 15 de septiembre", "de 11:00 a 20:00 durante los meses de verano"]),
    garajeMotos: chance(0.4),
    terrazasBarbacoa: chance(0.15),
    cuotaExtra: pick(["El fondo de reserva será del 5 % del presupuesto ordinario.", "Se establece una cuota extraordinaria anual para el mantenimiento del ascensor y de la fachada."]),
  });

  const politicas = new Map<number, PoliticaEdificio>();
  const politica45: PoliticaEdificio = { ...politicaAleatoria(), mascotas: "prohibidas", turistico: "prohibido", silencioDesde: "22:00", silencioHasta: "08:00", obrasHorario: "de lunes a viernes de 9:00 a 18:00", obrasAgosto: true };
  const politica47v1: PoliticaEdificio = { ...politicaAleatoria(), mascotas: "libres", turistico: "autorizado", silencioDesde: "23:00", silencioHasta: "08:00", obrasHorario: "de lunes a viernes de 8:30 a 19:00 y sábados de 9:00 a 13:00", obrasAgosto: false };
  const politica47v2: PoliticaEdificio = { ...politica47v1, turistico: "prohibido" };
  politicas.set(ds.casos.toledo45, politica45);
  politicas.set(ds.casos.toledo47, politica47v2);
  for (const id of edificiosConNormas) {
    if (!politicas.has(id)) politicas.set(id, politicaAleatoria());
  }
  // El edificio del contrato que prohíbe mascotas: sus normas las permiten (el contrato es más restrictivo)
  const edMascotas = unidades.get(ds.contratos.find((c) => c.id === t.mascotasContradice)!.unidad_id)!.edificio_id;
  if (edMascotas !== ds.casos.toledo45 && edMascotas !== ds.casos.toledo47) {
    politicas.set(edMascotas, { ...politicas.get(edMascotas)!, mascotas: "libres" });
  }

  // Edificios con norma anterior sustituida por un acta (además de Toledo 47)
  const conVersiones = new Set<number>([ds.casos.toledo47]);
  for (const id of edificiosConNormas) {
    if (conVersiones.size >= 3) break;
    if (id !== ds.casos.toledo45) conVersiones.add(id);
  }

  const hechosEdificios: Record<string, unknown> = {};
  for (const id of edificiosConNormas) {
    const e = edificios.get(id)!;
    const ed = edificioDoc(e);
    const p = politicas.get(id)!;
    if (conVersiones.has(id)) {
      const v1 = id === ds.casos.toledo47 ? politica47v1 : { ...p, turistico: "autorizado" as const, silencioDesde: "23:00" as const };
      docs.push({ ...construirNormas(ed, v1, "2019-05-14", "2019"), vigente: false });
      docs.push(
        construirActa(ed, "2025-03-18", "extraordinaria", "propietarios que representan el 78 % de las cuotas de participación", [
          { titulo: "Modificación de las normas de convivencia", texto: `Se acuerda modificar las normas de convivencia aprobadas en 2019 en los siguientes puntos: ${v1.turistico !== p.turistico ? "queda prohibido el uso turístico de las viviendas del edificio; " : ""}el horario de silencio pasa a ser de ${p.silencioDesde} a ${p.silencioHasta} horas. El texto refundido entrará en vigor el 1 de abril de 2025 y sustituye al anterior.`, votos: "a favor 78 % de las cuotas, en contra 9 %, abstenciones 13 %" },
          { titulo: "Ruegos y preguntas", texto: "Los propietarios recuerdan que deberán trasladar las nuevas normas a sus arrendatarios." },
        ], `acta-${e.referencia}-2025-normas`)
      );
      docs.push({ ...construirNormas(ed, p, "2025-04-01", "2025"), sustituye: `normas-${e.referencia}-2019` });
      hechosEdificios[e.referencia] = { direccion: e.direccion, normas_vigentes: "2025", turistico_2019: v1.turistico, turistico_2025: p.turistico, mascotas: p.mascotas, silencio: `${p.silencioDesde}-${p.silencioHasta}` };
    } else {
      docs.push(construirNormas(ed, p, pick(["2020-06-10", "2021-03-22", "2022-11-08", "2023-05-16"]), "vigente"));
      hechosEdificios[e.referencia] = { direccion: e.direccion, mascotas: p.mascotas, max_mascotas: p.maxMascotas, turistico: p.turistico, silencio: `${p.silencioDesde}-${p.silencioHasta}`, obras: p.obrasHorario, obras_agosto_prohibidas: p.obrasAgosto };
    }
  }
  hechos.edificiosConNormas = hechosEdificios;

  // Actas ordinarias y extraordinarias
  const conActas = shuffle([...edificiosConNormas]).slice(0, 8);
  conActas.forEach((id, i) => {
    const e = edificios.get(id)!;
    const ed = edificioDoc(e);
    const importe = pick([18000, 24500, 36000, 52000]);
    docs.push(
      construirActa(ed, pick(["2025-03-11", "2025-05-20", "2025-10-07", "2026-02-24"]), i % 3 === 2 ? "extraordinaria" : "ordinaria", "propietarios que representan el 71 % de las cuotas", [
        { titulo: "Aprobación de cuentas y presupuesto", texto: `Se aprueban las cuentas del ejercicio anterior y el presupuesto ordinario del ejercicio en curso, con un incremento de la cuota del ${pick([2, 3, 4])} %.`, votos: "aprobado por unanimidad de los presentes" },
        i % 2 === 0
          ? { titulo: "Obras de mejora", texto: `Se aprueba una derrama de ${importe.toLocaleString("es-ES")} euros para ${e.ascensor ? "la modernización del ascensor" : "la rehabilitación de la fachada"}, a pagar en dos plazos trimestrales según cuota de participación.`, votos: "a favor 82 %, en contra 10 %, abstenciones 8 %" }
          : { titulo: "Cambio de administración", texto: `Se aprueba renovar por un año más a ${ed.administrador} y actualizar sus honorarios en un ${pick([2, 3])} %.`, votos: "aprobado por mayoría" },
        { titulo: "Ruegos y preguntas", texto: "Se recuerda el cumplimiento del horario de mudanzas y la obligación de comunicar a la administración los datos de los arrendatarios." },
      ], `acta-${e.referencia}-${i}`)
    );
  });

  // Estatutos de los edificios más grandes
  shuffle([...edificiosConNormas].map((id) => edificios.get(id)!).filter((e) => e.plantas >= 5)).slice(0, 3).forEach((e) => {
    docs.push(construirEstatutos(edificioDoc(e), "2004-09-15"));
  });

  // ── Inventarios y certificados ───────────────────────────────────────────────────────────────
  const conInventario = shuffle(vigentes.filter((c) => c.tipo === "vivienda_habitual" && unidades.get(c.unidad_id)!.amueblado)).slice(0, 4);
  const u3b = ds.contratos.find((c) => c.id === 1)!;
  for (const c of [u3b, ...conInventario]) {
    const u = unidades.get(c.unidad_id)!;
    const e = edificios.get(u.edificio_id)!;
    docs.push(inventarioEntrada({ clave: `inventario-${u.referencia}`, unidadId: u.id, edificioId: e.id, direccion: `${e.direccion}, ${u.planta} ${u.puerta}`, fecha: c.fecha_inicio, amueblado: u.amueblado, habitaciones: u.habitaciones }));
  }
  shuffle(ds.cartera.unidades.filter((u) => u.certificado_energetico && u.tipo === "piso")).slice(0, 4).forEach((u) => {
    const e = edificios.get(u.edificio_id)!;
    docs.push(certificadoEnergetico({ clave: `certificado-${u.referencia}`, unidadId: u.id, edificioId: e.id, direccion: `${e.direccion}, ${u.planta} ${u.puerta}`, letra: u.certificado_energetico!, caducidad: u.certificado_caducidad!, superficie: u.superficie_m2, catastro: u.referencia_catastral }));
  });

  // ── Procedimientos internos y normativa ──────────────────────────────────────────────────────
  docs.push(procedimientoFianzas(), procedimientoEntradaSalida(), procedimientoIncidencias(), guiaLau(), guiaVivienda2023(), guiaFianzasMadrid());

  // ── Contratos de prueba para el lector (NO están en la base de datos) ───────────────────────
  const pruebaLector: PlanDocumentos["pruebaLector"] = [];
  const libres = shuffle(ds.cartera.unidades.filter((u) => u.estado === "disponible" && u.operacion === "alquiler" && u.tipo === "piso"));
  const fabricar = (u: UnidadRow, opciones: { nombre: string; apellidos: string; docTipo: string; doc: string; escaneado?: boolean; descripcion: string; sufijo: string; tipo?: DatosContratoDoc["tipo"] }) => {
    const e = edificios.get(u.edificio_id)!;
    const prop = propietarios.get(u.propietario_id)!;
    const inicio = iso(addDays(TODAY, int(7, 25)));
    const fin = iso(addDays(TODAY, 365 + int(7, 25) - 1));
    const renta = u.precio_alquiler ?? 1000;
    const datos: DatosContratoDoc = {
      clave: `prueba-lector-${opciones.sufijo}`,
      contratoRef: `PRUEBA-${opciones.sufijo.toUpperCase()}`,
      tipo: opciones.tipo ?? "vivienda_habitual",
      fechaFirma: iso(addDays(TODAY, -1)),
      inicio, fin, renta, fianza: renta, garantia: null, indice: "ipc", diaPago: 5,
      arrendador: { nombre: prop.nombre, documento: prop.documento, sociedad: prop.tipo_persona === "sociedad" },
      inquilino: { nombre: opciones.nombre, apellidos: opciones.apellidos, documentoTipo: opciones.docTipo, documento: opciones.doc, email: `${slug(opciones.nombre)}.${slug(opciones.apellidos.split(" ")[0])}@example.com`, telefono: "612 345 678" },
      inmueble: { direccion: e.direccion, municipio: municipios.get(e.municipio_id)!.nombre, cp: e.codigo_postal, tipoUnidad: "piso", planta: u.planta, puerta: u.puerta, superficie: u.superficie_m2, habitaciones: u.habitaciones, referenciaCatastral: u.referencia_catastral, certificado: u.certificado_energetico, unidadRef: u.referencia, amueblado: u.amueblado },
      clausulas: { mascotas: chance(0.5), fumar: false, subarriendo: false, suministrosInquilino: true, gastosGestionInquilino: false, preavisoMeses: 1, penalizacionMeses: 1, seguroHogar: false },
      escaneado: opciones.escaneado,
    };
    const doc = construirContrato(datos);
    pruebaLector.push({ ...doc, descripcion: `${opciones.descripcion} · Unidad ${u.referencia} (${e.direccion}, ${u.planta} ${u.puerta})` });
  };
  fabricar(libres[0], { nombre: "Marina", apellidos: "Castillo Ferrer", docTipo: "DNI", doc: dni(), sufijo: "01-nuevo-inquilino", descripcion: "Contrato limpio con un inquilino nuevo (se creará al confirmar)" });
  const existente = ds.inquilinos[int(0, ds.inquilinos.length - 1)];
  fabricar(libres[1], { nombre: existente.nombre, apellidos: existente.apellidos, docTipo: existente.documento_tipo, doc: existente.documento, sufijo: "02-inquilino-existente", descripcion: `Inquilino que YA existe en la base de datos (${existente.documento}): el lector debe proponer vincularlo` });
  fabricar(libres[2], { nombre: "Óscar", apellidos: "Nieto Valverde", docTipo: "DNI", doc: dni(), sufijo: "03-escaneado", escaneado: true, descripcion: "PDF escaneado sin capa de texto (requiere OCR)" });

  hechos.pruebaLector = pruebaLector.map((p) => p.descripcion);
  return { docs, pruebaLector, hechos };
}
