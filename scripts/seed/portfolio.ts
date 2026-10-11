import type { GeoDataset, Lugar } from "./geo";
import type { PropietarioRow } from "./people";
import { addDays, chance, float, int, iso, money, pick, ref, round, shuffle, TODAY, weighted } from "./util";

export interface EdificioRow {
  id: number;
  referencia: string;
  nombre: string | null;
  direccion: string;
  codigo_postal: string;
  municipio_id: number;
  distrito_id: number | null;
  barrio_id: number | null;
  lat: number;
  lng: number;
  anio_construccion: number;
  plantas: number;
  ascensor: boolean;
  garaje: boolean;
  portero: boolean;
  piscina: boolean;
  administrador_fincas: string | null;
  gestiona_comunidad: boolean;
  cuota_comunidad_media: number | null;
}

export type TipoUnidad = "piso" | "atico" | "duplex" | "estudio" | "chalet" | "habitacion" | "local" | "oficina" | "garaje" | "trastero";
export type Operacion = "alquiler" | "venta" | "temporada" | "habitaciones";
export type EstadoUnidad = "disponible" | "alquilada" | "reservada" | "reforma" | "vendida";

export interface UnidadRow {
  id: number;
  referencia: string;
  edificio_id: number;
  unidad_padre_id: number | null;
  propietario_id: number;
  planta: string;
  puerta: string;
  tipo: TipoUnidad;
  operacion: Operacion;
  estado: EstadoUnidad;
  superficie_m2: number;
  habitaciones: number;
  banos: number;
  precio_alquiler: number | null;
  precio_venta: number | null;
  precio_temporada_mes: number | null;
  amueblado: boolean;
  admite_mascotas: boolean;
  terraza: boolean;
  certificado_energetico: string | null;
  certificado_caducidad: string | null;
  referencia_catastral: string;
  descripcion: string;
  fecha_disponible: string | null;
}

export interface Cartera {
  edificios: EdificioRow[];
  unidades: UnidadRow[];
  lugarPorEdificio: Map<number, Lugar>;
  /** Edificios especiales para los casos difíciles del seed. */
  casos: { toledo45: number; toledo47: number };
}

const ADMINISTRADORES = [
  "Administración de Fincas Gutiérrez", "Fincas Alcalá 2000", "Gestión Integral Cervantes", "Administraciones Ortega y Asociados",
  "Fincas Sol y Luna", "Administración Comunidades Prado", "Gestiona Comunidad Madrid", "Fincas Velázquez",
  "Administración Sierra Norte", "Fincas del Sur", "Administraciones Rioja", "Comunidades y Patrimonios Hernández",
];

const NOMBRES_RESIDENCIAL = [
  "Residencial Los Almendros", "Edificio Aurora", "Residencial Parque Sur", "Edificio Miraflores", "Residencial El Encinar",
  "Edificio Castilla", "Residencial Las Terrazas", "Edificio Alameda", "Residencial Jardines del Prado", "Edificio Plaza Mayor",
];

const LETRAS = ["A", "B", "C", "D", "E"];

function muestreador(ids: number[]) {
  const pesos = ids.map((_, i) => 1 / Math.pow(i + 1, 0.85));
  const total = pesos.reduce((a, b) => a + b, 0);
  return () => {
    let r = float(0, total);
    for (let i = 0; i < ids.length; i++) {
      r -= pesos[i];
      if (r <= 0) return ids[i];
    }
    return ids[ids.length - 1];
  };
}

const escoger = <T extends { peso: number }>(items: T[]): T => weighted(items.map((i) => [i, i.peso] as const));

function referenciaCatastral(base: string, n: number) {
  return `${base}${String(n).padStart(4, "0")}${pick(["AB", "XY", "PQ", "WX", "LK", "TR"])}`;
}

function certificado(anio: number) {
  const letra =
    anio < 1980 ? weighted([["E", 25], ["F", 25], ["G", 20], ["D", 20], ["C", 10]] as const)
    : anio < 2006 ? weighted([["D", 30], ["E", 25], ["C", 20], ["F", 10], ["G", 10], ["B", 5]] as const)
    : weighted([["B", 25], ["C", 30], ["A", 10], ["D", 25], ["E", 10]] as const);
  // ~4 % caducados y ~2 % a punto de caducar: alimentan las alertas.
  const emision = addDays(TODAY, -int(0, 3650 + 150));
  return { letra, caducidad: iso(addDays(emision, 3650)) };
}

interface Flags {
  luminoso: boolean;
  exterior: boolean;
  reformado: boolean;
  orientacion: string;
}

const habs = (n: number) => `${n} habitación${n === 1 ? "" : "es"}`;

function descripcion(u: Omit<UnidadRow, "descripcion" | "id" | "referencia">, e: EdificioRow, lugar: Lugar, f: Flags): string {
  const zona = u.tipo === "garaje" || u.tipo === "trastero" ? "" : pick(lugar.ambiente);
  const barrio = lugar.barrios.length ? pick(lugar.barrios).nombre : null;
  const donde = lugar.distrito ? (barrio ? `${lugar.distrito}, ${barrio}` : lugar.distrito) : lugar.municipio;
  const partes: string[] = [];

  switch (u.tipo) {
    case "piso":
      partes.push(`${f.luminoso ? "Piso luminoso" : "Piso"} de ${u.superficie_m2} m² con ${habs(u.habitaciones)} y ${u.banos} baño${u.banos === 1 ? "" : "s"} en ${donde}`);
      break;
    case "atico":
      partes.push(`Ático de ${u.superficie_m2} m² con ${habs(u.habitaciones)} y vistas despejadas en ${donde}`);
      break;
    case "duplex":
      partes.push(`Dúplex de ${u.superficie_m2} m² en dos alturas con ${u.habitaciones} dormitorios en ${donde}`);
      break;
    case "estudio":
      partes.push(`Estudio funcional de ${u.superficie_m2} m² con espacio único y cocina americana en ${donde}`);
      break;
    case "chalet":
      partes.push(`Chalet de ${u.superficie_m2} m² con ${u.habitaciones} dormitorios y jardín privado en ${lugar.municipio}`);
      break;
    case "habitacion":
      partes.push(`Habitación de ${u.superficie_m2} m² en piso compartido en ${donde}, con zonas comunes equipadas`);
      break;
    case "local":
      partes.push(`Local comercial de ${u.superficie_m2} m² a pie de calle en ${donde}, con escaparate y salida de humos`);
      break;
    case "oficina":
      partes.push(`Oficina diáfana de ${u.superficie_m2} m² en ${donde}, lista para entrar`);
      break;
    case "garaje":
      partes.push(`Plaza de garaje ${pick(["amplia", "cómoda", "de fácil acceso"])} de ${u.superficie_m2} m² en ${donde}${e.ascensor ? ", con acceso en ascensor" : ""}`);
      break;
    case "trastero":
      partes.push(`Trastero de ${u.superficie_m2} m² en ${donde}, seco y con acceso directo`);
      break;
  }
  if (zona) partes.push(zona.charAt(0).toUpperCase() + zona.slice(1));

  if (!["garaje", "trastero"].includes(u.tipo)) {
    if (f.reformado) partes.push(pick(["Cocina y baños reformados recientemente", "Reformado integral con materiales de calidad", "Reforma reciente, listo para entrar a vivir"]));
    if (["piso", "atico", "duplex", "estudio", "chalet", "habitacion"].includes(u.tipo)) {
      partes.push(f.exterior ? `Exterior, orientación ${f.orientacion}` : "Interior, muy silencioso");
      partes.push(pick(["Calefacción individual de gas natural", "Calefacción central incluida en la comunidad", "Aire acondicionado por conductos", "Suelos de parquet y armarios empotrados", "Ventanas de doble acristalamiento"]));
    }
    if (u.terraza) partes.push(pick(["Con terraza para disfrutar todo el año", "Amplia terraza de uso privado", "Balcón corrido con buenas vistas"]));
    if (e.ascensor) partes.push("Edificio con ascensor");
    else if (u.planta === "Bajo" || u.planta === "1º") partes.push("Sin barreras: fácil acceso sin ascensor");
    if (e.piscina) partes.push("Urbanización con piscina y zonas comunes");
    if (e.portero) partes.push("Finca con portero");
    if (u.amueblado) partes.push("Se entrega amueblado y equipado");
    if (u.admite_mascotas) partes.push("Se admiten mascotas");
    partes.push(pick(["Metro y autobuses a pocos minutos a pie", "Cercanías a cinco minutos", "Colegios, supermercados y parques en el entorno", "Excelente conexión con las principales vías"]));
  }
  return partes.join(". ") + ".";
}

interface ForzadoSpec {
  distrito?: string;
  municipio?: string;
  calle: string;
  numero: number;
  plantas: number;
  ascensor: boolean;
  anio: number;
}

const FORZADOS: ForzadoSpec[] = [
  // Dos edificios contiguos en la misma calle (el chat debe distinguirlos por número)
  { distrito: "Centro", calle: "Calle de Toledo", numero: 45, plantas: 5, ascensor: false, anio: 1935 },
  { distrito: "Centro", calle: "Calle de Toledo", numero: 47, plantas: 6, ascensor: true, anio: 1962 },
  // Misma calle y número en dos municipios distintos
  { municipio: "Getafe", calle: "Calle Mayor", numero: 12, plantas: 5, ascensor: true, anio: 1988 },
  { municipio: "Alcalá de Henares", calle: "Calle Mayor", numero: 12, plantas: 4, ascensor: true, anio: 1975 },
  { distrito: "Chamberí", calle: "Calle de Fuencarral", numero: 88, plantas: 7, ascensor: true, anio: 1958 },
  { distrito: "Puente de Vallecas", calle: "Avenida de la Albufera", numero: 120, plantas: 8, ascensor: true, anio: 1971 },
];

export function generarCartera(geo: GeoDataset, propietarios: PropietarioRow[], objetivo: number): Cartera {
  const edificios: EdificioRow[] = [];
  const unidades: UnidadRow[] = [];
  const lugarPorEdificio = new Map<number, Lugar>();
  const direcciones = new Set<string>();
  const propietarioAleatorio = muestreador(shuffle(propietarios.map((p) => p.id)));
  const ocupacion = new Map<Lugar, number>();
  for (const l of geo.lugares) ocupacion.set(l, float(0.86, 0.96));

  let edificioId = 0;
  let unidadId = 0;
  const forzados = [...FORZADOS];
  const casos = { toledo45: 0, toledo47: 0 };

  const nuevaUnidad = (e: EdificioRow, lugar: Lugar, base: Omit<UnidadRow, "id" | "referencia" | "edificio_id" | "referencia_catastral" | "descripcion">, catastroBase: string, propietario: number, flags: Flags): UnidadRow => {
    unidadId += 1;
    const sinDescripcion = { ...base, edificio_id: e.id, propietario_id: propietario, referencia_catastral: referenciaCatastral(catastroBase, unidadId) };
    const fila: UnidadRow = { id: unidadId, referencia: ref("U", unidadId), ...sinDescripcion, descripcion: "" };
    fila.descripcion = descripcion(fila, e, lugar, flags);
    unidades.push(fila);
    return fila;
  };

  while (unidades.length < objetivo) {
    const forzado = forzados.shift();
    const lugar = forzado
      ? geo.lugares.find((l) => (forzado.distrito ? l.distrito === forzado.distrito : l.municipio === forzado.municipio))!
      : escoger(geo.lugares);

    const pChalet = forzado ? 0 : Math.min(0.5, 0.1 * (lugar.chalets ?? 0));
    const esChalet = chance(pChalet);

    // Dirección única
    let calle = forzado?.calle ?? pick(lugar.calles);
    let numero = forzado?.numero ?? int(1, 140);
    while (!forzado && direcciones.has(`${lugar.municipio}|${calle}|${numero}`)) {
      calle = pick(lugar.calles);
      numero = int(1, 140);
    }
    direcciones.add(`${lugar.municipio}|${calle}|${numero}`);

    const centro = lugar.zonaId === 1;
    const anio = forzado?.anio ?? (esChalet ? int(1990, 2022) : centro
      ? weighted([[int(1890, 1939), 25], [int(1940, 1975), 45], [int(1976, 2000), 20], [int(2001, 2022), 10]] as const)
      : weighted([[int(1955, 1975), 22], [int(1976, 1995), 28], [int(1996, 2010), 28], [int(2011, 2023), 22]] as const));
    const plantas = forzado?.plantas ?? (esChalet ? 2 : lugar.distrito ? weighted([[4, 15], [5, 25], [6, 25], [7, 15], [8, 12], [9, 8]] as const) : weighted([[3, 12], [4, 25], [5, 25], [6, 18], [7, 12], [8, 8]] as const));
    const ascensor = forzado?.ascensor ?? (esChalet ? false : plantas >= 4 ? chance(anio < 1950 ? 0.6 : 0.92) : chance(anio > 1990 ? 0.5 : 0.1));
    const garaje = !esChalet && chance(anio >= 1985 ? 0.6 : 0.1);
    const portero = !esChalet && !!lugar.distrito && plantas >= 6 && chance(0.4);
    const piscina = !esChalet && anio >= 1995 && !centro && chance(0.22);
    const gestiona = chance(0.35);
    const cpBase = pick(lugar.cps);
    const cp = cpBase.length === 3 ? `${cpBase}${int(0, 9)}${int(0, 9)}` : cpBase;
    const barrio = lugar.barrios.length ? pick(lugar.barrios) : null;

    edificioId += 1;
    const e: EdificioRow = {
      id: edificioId,
      referencia: ref("E", edificioId),
      nombre: !esChalet && chance(0.1) ? pick(NOMBRES_RESIDENCIAL) : null,
      direccion: `${calle}, ${numero}`,
      codigo_postal: cp,
      municipio_id: lugar.municipioId,
      distrito_id: lugar.distritoId,
      barrio_id: barrio?.id ?? null,
      lat: Number((lugar.lat + float(-0.008, 0.008)).toFixed(6)),
      lng: Number((lugar.lng + float(-0.01, 0.01)).toFixed(6)),
      anio_construccion: anio,
      plantas,
      ascensor,
      garaje,
      portero,
      piscina,
      administrador_fincas: gestiona || chance(0.5) ? pick(ADMINISTRADORES) : null,
      gestiona_comunidad: gestiona,
      cuota_comunidad_media: esChalet ? null : money(int(18, 55) + (ascensor ? 12 : 0) + (portero ? 35 : 0) + (piscina ? 25 : 0) + (garaje ? 8 : 0)),
    };
    edificios.push(e);
    lugarPorEdificio.set(e.id, lugar);
    if (forzado?.numero === 45) casos.toledo45 = e.id;
    if (forzado?.numero === 47) casos.toledo47 = e.id;

    const propietarioPrincipal = propietarioAleatorio();
    const propietarioDe = () => (chance(0.65) ? propietarioPrincipal : propietarioAleatorio());
    const catastroBase = `${int(1000000, 9999999)}${pick(["VK", "VL", "UK", "VH", "UL"])}${int(1000, 9999)}${pick(["S", "N", "E"])}`;
    const occ = ocupacion.get(lugar)!;
    const conjuntoDePuertas = forzado ? LETRAS.slice(0, 4) : chance(0.3) ? ["Izq", "Dcha"] : LETRAS.slice(0, int(2, 4));

    const estadoAlquiler = (): EstadoUnidad =>
      chance(occ) ? "alquilada" : weighted([["disponible", 65], ["reforma", 15], ["reservada", 20]] as const);

    // ── Viviendas ────────────────────────────────────────────────────────────────────────────────
    if (esChalet) {
      const m2 = int(120, 380);
      const habs = Math.min(6, Math.max(3, Math.round(m2 / 55)));
      const op = weighted([["alquiler", 55], ["venta", 35], ["temporada", 10]] as const) as Operacion;
      unidadesDe(e, lugar, { m2, habs, planta: "Unifamiliar", puerta: "-", tipo: "chalet", op });
    } else {
      const totalPuertas = plantas * conjuntoDePuertas.length;
      const gestionadas = forzado ? Math.min(12, totalPuertas) : Math.min(totalPuertas, lugar.distrito ? int(4, 14) : int(3, 12));
      const huecos: { planta: number; puerta: string }[] = [];
      for (let p = 1; p <= plantas; p++) for (const l of conjuntoDePuertas) huecos.push({ planta: p, puerta: l });
      const seleccion = shuffle(huecos);
      if (forzado?.numero === 45) {
        const idx = seleccion.findIndex((h) => h.planta === 3 && h.puerta === "B");
        if (idx > -1) seleccion.unshift(...seleccion.splice(idx, 1));
      }
      seleccion.slice(0, gestionadas).forEach((h) => {
        const es3B = forzado?.numero === 45 && h.planta === 3 && h.puerta === "B";
        const ultima = h.planta === plantas && plantas >= 4;
        let tipo: TipoUnidad = "piso";
        if (ultima && chance(0.55)) tipo = "atico";
        else if (h.planta >= plantas - 1 && chance(0.04)) tipo = "duplex";
        else if (chance(centro || lugar.estudiantil ? 0.14 : 0.06)) tipo = "estudio";

        let m2 = tipo === "estudio" ? int(22, 40) : tipo === "atico" ? int(60, 140) : tipo === "duplex" ? int(80, 160) : centro ? int(35, 110) : int(55, 120);
        if (es3B) tipo = "piso";
        if (es3B) m2 = 68;
        const habs = tipo === "estudio" ? 0 : Math.max(1, Math.min(5, Math.round(m2 / 28)));
        const compartido = tipo === "piso" && m2 >= 65 && habs >= 3 && chance(lugar.estudiantil ? 0.3 : 0.06);
        const op = es3B ? "alquiler" : compartido ? "habitaciones" : (weighted([["alquiler", 58], ["venta", 27], ["temporada", 15]] as const) as Operacion);
        unidadesDe(e, lugar, { m2, habs, planta: `${h.planta}º`, puerta: h.puerta, tipo, op, especial: es3B });
      });

      // Local(es) a pie de calle y oficina
      if (chance(0.45)) {
        for (let i = 1; i <= int(1, 2); i++) {
          unidadesDe(e, lugar, { m2: int(30, 250), habs: 0, planta: "Bajo", puerta: `Local ${i}`, tipo: "local", op: weighted([["alquiler", 65], ["venta", 35]] as const) as Operacion });
        }
      }
      if (chance(0.05)) unidadesDe(e, lugar, { m2: int(30, 150), habs: 0, planta: "1º", puerta: "Of.", tipo: "oficina", op: weighted([["alquiler", 65], ["venta", 35]] as const) as Operacion });

      // Garajes y trasteros
      if (garaje) {
        for (let i = 1; i <= int(1, Math.ceil(gestionadas * 0.7)); i++) {
          unidadesDe(e, lugar, { m2: int(10, 16), habs: 0, planta: "S-1", puerta: `P${i}`, tipo: "garaje", op: weighted([["alquiler", 70], ["venta", 30]] as const) as Operacion });
        }
        if (chance(0.35)) {
          for (let i = 1; i <= int(1, Math.ceil(gestionadas * 0.4)); i++) {
            unidadesDe(e, lugar, { m2: int(3, 10), habs: 0, planta: "S-2", puerta: `T${i}`, tipo: "trastero", op: weighted([["alquiler", 70], ["venta", 30]] as const) as Operacion });
          }
        }
      }
    }

    function unidadesDe(
      ed: EdificioRow,
      lug: Lugar,
      spec: { m2: number; habs: number; planta: string; puerta: string; tipo: TipoUnidad; op: Operacion; especial?: boolean }
    ) {
      const { m2, habs, planta, puerta, tipo, op } = spec;
      const anexo = tipo === "garaje" || tipo === "trastero";
      const cert = anexo ? null : certificado(ed.anio_construccion);
      const terraza = anexo || tipo === "local" || tipo === "oficina" ? false : tipo === "atico" ? chance(0.8) : tipo === "chalet" ? true : chance(0.2);
      const amueblado = anexo || tipo === "local" ? false : chance(op === "temporada" || op === "habitaciones" ? 0.8 : 0.3);
      const flags: Flags = {
        luminoso: chance(0.5),
        exterior: chance(0.75),
        reformado: !anexo && chance(0.35),
        orientacion: pick(["sur", "este", "oeste", "sureste", "suroeste"]),
      };

      // Precios
      let mod = ed.anio_construccion < 1950 ? 0.96 : 1;
      mod *= ed.ascensor ? 1.03 : ed.plantas >= 4 ? 0.9 : 0.97;
      if (terraza) mod *= 1.06;
      if (amueblado) mod *= 1.05;
      if (flags.reformado) mod *= 1.06;
      if (tipo === "estudio") mod *= 1.12;
      if (tipo === "atico") mod *= 1.15;
      if (tipo === "duplex") mod *= 1.08;
      if (tipo === "chalet") mod *= 0.75;
      const ruido = float(0.88, 1.12);

      let alquiler: number | null = null;
      let venta: number | null = null;
      if (tipo === "garaje") {
        alquiler = round(lug.distrito ? (lug.zonaId <= 2 ? int(90, 150) : int(55, 95)) : int(35, 70), 5);
        venta = round(alquiler * int(160, 230), 500);
      } else if (tipo === "trastero") {
        alquiler = round(lug.distrito ? int(30, 65) : int(20, 45), 5);
        venta = round(alquiler * int(120, 190), 500);
      } else if (tipo === "local" || tipo === "oficina") {
        alquiler = round(lug.rentM2 * (tipo === "local" ? 0.9 : 0.8) * m2 * ruido, 10);
        venta = round(lug.saleM2 * 0.85 * m2 * ruido, 1000);
      } else {
        alquiler = round(lug.rentM2 * m2 * mod * ruido, 10);
        venta = round(lug.saleM2 * m2 * mod * ruido * (tipo === "chalet" ? 0.85 : 1), 1000);
      }

      const crearFila = (
        rowSpec: { planta: string; puerta: string; tipo: TipoUnidad; op: Operacion; m2: number; habs: number; banos: number; padre: number | null; estado: EstadoUnidad; alq: number | null; ven: number | null; temp: number | null; cert: typeof cert; terraza: boolean }
      ) => {
        const fila = nuevaUnidad(ed, lug, {
          unidad_padre_id: rowSpec.padre,
          propietario_id: 0,
          planta: rowSpec.planta,
          puerta: rowSpec.puerta,
          tipo: rowSpec.tipo,
          operacion: rowSpec.op,
          estado: rowSpec.estado,
          superficie_m2: rowSpec.m2,
          habitaciones: rowSpec.habs,
          banos: rowSpec.banos,
          precio_alquiler: rowSpec.op === "venta" && !rowSpec.alq ? null : rowSpec.op === "venta" ? (chance(0.08) ? rowSpec.alq : null) : rowSpec.alq,
          precio_venta: rowSpec.op === "venta" ? rowSpec.ven : chance(0.06) && rowSpec.op === "alquiler" ? rowSpec.ven : null,
          precio_temporada_mes: rowSpec.op === "temporada" && rowSpec.alq ? round(rowSpec.alq * 1.25, 10) : null,
          amueblado,
          admite_mascotas: chance(0.45),
          terraza: rowSpec.terraza,
          certificado_energetico: rowSpec.cert?.letra ?? null,
          certificado_caducidad: rowSpec.cert?.caducidad ?? null,
          fecha_disponible: null,
        }, catastroBase, propietarioDe(), flags);
        return fila;
      };

      const estadoPara = (o: Operacion): EstadoUnidad => {
        if (o === "venta") return weighted([["disponible", 70], ["reservada", 8], ["vendida", 22]] as const) as EstadoUnidad;
        if (o === "temporada") return chance(0.7) ? "alquilada" : "disponible";
        return estadoAlquiler();
      };

      const banos = tipo === "estudio" ? 1 : tipo === "chalet" ? int(2, 4) : anexo ? 0 : tipo === "local" || tipo === "oficina" ? 1 : Math.max(1, Math.min(3, Math.round(habs / 2) + (m2 > 90 ? 1 : 0)));

      if (op === "habitaciones") {
        // El piso completo se gestiona por habitaciones: su estado depende de las habitaciones alquiladas.
        const padre = crearFila({ planta, puerta, tipo, op, m2, habs, banos, padre: null, estado: "disponible", alq: alquiler, ven: venta, temp: null, cert, terraza });
        padre.precio_alquiler = null;
        const n = Math.min(habs, 5);
        let alguna = false;
        for (let i = 1; i <= n; i++) {
          const hab = crearFila({
            planta, puerta: `${puerta}-H${i}`, tipo: "habitacion", op: "habitaciones", m2: int(9, 20), habs: 1, banos: 0,
            padre: padre.id, estado: chance(occ) ? "alquilada" : "disponible",
            alq: round(lug.rentM2 * 12 * 1.9 * float(0.85, 1.15), 5), ven: null, temp: null, cert: null, terraza: false,
          });
          hab.amueblado = true;
          hab.certificado_energetico = null;
          hab.certificado_caducidad = null;
          if (hab.estado === "alquilada") alguna = true;
          else hab.fecha_disponible = iso(addDays(TODAY, int(-10, 40)));
        }
        padre.estado = alguna ? "alquilada" : "disponible";
        padre.amueblado = true;
      } else {
        const estado = estadoPara(op);
        const fila = crearFila({ planta, puerta, tipo, op, m2, habs, banos, padre: null, estado, alq: alquiler, ven: venta, temp: null, cert, terraza });
        if (estado === "disponible") fila.fecha_disponible = iso(addDays(TODAY, int(-15, 45)));
        if (estado === "reservada") fila.fecha_disponible = iso(addDays(TODAY, int(5, 50)));
        // Caso de demostración fijo: «Toledo 45, 3º B» siempre alquilado.
        if (spec.especial) Object.assign(fila, { estado: "alquilada", precio_alquiler: 1350, fecha_disponible: null, admite_mascotas: true });
      }
    }
  }

  return { edificios, unidades, lugarPorEdificio, casos };
}
