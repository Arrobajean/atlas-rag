import type { GeoDataset } from "./geo";
import { emailDe, personaAleatoria } from "./people";
import type { Cartera } from "./portfolio";
import { addDays, chance, float, int, iso, money, pick, round, shuffle, slug, telefono, TODAY, weighted } from "./util";

// ── Clientes del CRM y sus demandas ───────────────────────────────────────────────────────────────
export interface ClienteRow {
  id: number;
  nombre: string;
  email: string;
  telefono: string;
  tipo: "inquilino" | "comprador" | "inversor";
  notas: string;
}

export interface DemandaRow {
  id: number;
  cliente_id: number;
  operacion: "alquiler" | "venta" | "temporada" | "habitaciones";
  tipos: string[];
  zona_ids: number[];
  municipio_ids: number[];
  distrito_ids: number[];
  presupuesto_min: number | null;
  presupuesto_max: number;
  habitaciones_min: number | null;
  superficie_min: number | null;
  necesita_mascotas: boolean;
  necesita_amueblado: boolean;
  necesita_terraza: boolean;
  fecha_entrada: string | null;
  notas: string;
  activa: boolean;
}

const MOTIVOS_ALQUILER = [
  "Se traslada por trabajo", "Se independiza", "Busca cambiar de barrio", "Vuelve a Madrid tras un tiempo fuera",
  "Necesita más espacio para la familia", "Llega a Madrid a estudiar un máster", "Su contrato actual termina pronto",
];
const DESEOS = [
  "piso luminoso", "zona tranquila", "cerca del metro", "con ascensor", "que admita mascotas", "con terraza o balcón",
  "cerca de colegios", "exterior", "con parking", "bien comunicado con el centro", "reformado", "zona con buen ambiente",
];

export function generarClientes(total: number, usados: Set<string>): ClienteRow[] {
  const filas: ClienteRow[] = [];
  const reparto = [["inquilino", 80], ["comprador", 85], ["inversor", 35]] as const;
  while (filas.length < total) {
    const p = personaAleatoria(0.15);
    if (usados.has(p.documento)) continue;
    usados.add(p.documento);
    const tipo = weighted(reparto.map(([t, w]) => [t, w] as const)) as ClienteRow["tipo"];
    filas.push({
      id: filas.length + 1, nombre: `${p.nombre} ${p.apellidos}`, email: emailDe(p.nombre, p.apellidos),
      telefono: telefono(), tipo, notas: "",
    });
  }
  return filas;
}

export function generarDemandas(clientes: ClienteRow[], geo: GeoDataset): DemandaRow[] {
  const demandas: DemandaRow[] = [];
  const zonaCapital = geo.zonas.filter((z) => z.id <= 5);
  for (const c of clientes) {
    const deseos = shuffle(DESEOS).slice(0, int(2, 4));
    const perro = chance(0.22);
    const operacion: DemandaRow["operacion"] =
      c.tipo === "inquilino" ? weighted([["alquiler", 65], ["habitaciones", 15], ["temporada", 20]] as const) : "venta";

    // Zona: una zona de la capital, un distrito concreto o un municipio
    const zona_ids: number[] = [];
    const municipio_ids: number[] = [];
    const distrito_ids: number[] = [];
    let lugarTexto = "";
    const modo = weighted([["zona", 35], ["distrito", 30], ["municipio", 30], ["cualquiera", 5]] as const);
    if (modo === "zona") {
      const z = pick(zonaCapital);
      zona_ids.push(z.id);
      if (chance(0.3)) zona_ids.push(pick(zonaCapital.filter((x) => x.id !== z.id)).id);
      lugarTexto = zona_ids.map((id) => geo.zonas.find((z2) => z2.id === id)!.nombre).join(" o ");
    } else if (modo === "distrito") {
      const d = pick(geo.distritos);
      distrito_ids.push(d.id);
      if (chance(0.4)) distrito_ids.push(pick(geo.distritos.filter((x) => x.id !== d.id)).id);
      lugarTexto = distrito_ids.map((id) => geo.distritos.find((d2) => d2.id === id)!.nombre).join(" o ");
    } else if (modo === "municipio") {
      const m = pick(geo.municipios.filter((x) => !x.es_capital));
      municipio_ids.push(m.id);
      lugarTexto = m.nombre;
    }

    let presupuesto_max: number;
    let presupuesto_min: number | null = null;
    let tipos: string[] = [];
    let habitaciones_min: number | null = null;
    let superficie_min: number | null = null;
    let texto: string;
    const cuando = addDays(TODAY, int(10, 120));

    if (operacion === "venta") {
      presupuesto_max = round(c.tipo === "inversor" ? int(150, 1200) * 1000 : int(120, 900) * 1000, 5000);
      presupuesto_min = round(presupuesto_max * float(0.6, 0.8), 5000);
      habitaciones_min = c.tipo === "inversor" ? null : int(1, 4);
      superficie_min = chance(0.4) ? round(int(45, 110), 5) : null;
      tipos = c.tipo === "inversor" ? pick([["piso"], ["local"], ["piso", "local"], ["piso", "estudio"]]) : pick([["piso"], ["piso", "atico"], ["chalet"], ["piso", "duplex"]]);
      texto = c.tipo === "inversor"
        ? `Inversor: busca ${tipos.join(" o ")} para alquilar${lugarTexto ? ` en ${lugarTexto}` : ""}, con buena rentabilidad. Presupuesto hasta ${presupuesto_max.toLocaleString("es-ES")} €. Prefiere ${deseos.slice(0, 2).join(" y ")}.`
        : `Comprador: quiere ${tipos.join(" o ")}${lugarTexto ? ` en ${lugarTexto}` : ""} con ${habitaciones_min}+ habitaciones. Presupuesto hasta ${presupuesto_max.toLocaleString("es-ES")} €. Valora: ${deseos.join(", ")}${perro ? ". Tiene perro" : ""}.`;
    } else if (operacion === "habitaciones") {
      presupuesto_max = round(int(300, 700), 25);
      tipos = ["habitacion"];
      texto = `${pick(MOTIVOS_ALQUILER)}. Busca habitación${lugarTexto ? ` en ${lugarTexto}` : ""} hasta ${presupuesto_max} €/mes. Valora: ${deseos.slice(0, 2).join(", ")}.`;
    } else if (operacion === "temporada") {
      presupuesto_max = round(int(900, 2600), 50);
      presupuesto_min = round(presupuesto_max * 0.5, 50);
      tipos = pick([["piso"], ["piso", "estudio"], ["atico", "piso"]]);
      habitaciones_min = chance(0.5) ? int(1, 3) : null;
      texto = `${pick(MOTIVOS_ALQUILER)}. Alquiler de temporada${lugarTexto ? ` en ${lugarTexto}` : ""}, amueblado, hasta ${presupuesto_max} €/mes. ${deseos.slice(0, 2).join(", ")}.`;
    } else {
      presupuesto_max = round(int(750, 2600), 50);
      presupuesto_min = round(presupuesto_max * 0.6, 50);
      tipos = pick([["piso"], ["piso", "estudio"], ["piso", "atico"], ["piso", "duplex"]]);
      habitaciones_min = int(1, 3);
      texto = `${pick(MOTIVOS_ALQUILER)}. Busca ${tipos.join(" o ")}${lugarTexto ? ` en ${lugarTexto}` : ""}, ${habitaciones_min}+ habitaciones, hasta ${presupuesto_max} €/mes. Le importa: ${deseos.join(", ")}${perro ? ". Tiene un perro" : ""}.`;
    }

    c.notas = texto;
    demandas.push({
      id: demandas.length + 1, cliente_id: c.id, operacion, tipos, zona_ids, municipio_ids, distrito_ids,
      presupuesto_min, presupuesto_max, habitaciones_min, superficie_min,
      necesita_mascotas: perro || deseos.includes("que admita mascotas"),
      necesita_amueblado: operacion === "temporada" || operacion === "habitaciones" ? chance(0.7) : false,
      necesita_terraza: deseos.includes("con terraza o balcón") && chance(0.5),
      fecha_entrada: operacion === "venta" ? null : iso(cuando),
      notas: texto, activa: chance(0.85),
    });
  }
  return demandas;
}

// ── Proveedores, incidencias y gastos ─────────────────────────────────────────────────────────────
export interface ProveedorRow { id: number; nombre: string; cif: string; categoria: string; telefono: string; email: string }
export interface IncidenciaRow {
  id: number;
  unidad_id: number | null;
  edificio_id: number | null;
  categoria: string;
  prioridad: string;
  estado: string;
  descripcion: string;
  coste: number | null;
  proveedor_id: number | null;
  fecha_apertura: string;
  fecha_cierre: string | null;
}
export interface GastoRow { edificio_id: number | null; unidad_id: number | null; concepto: string; importe: number; fecha: string }

const CATEGORIAS: { categoria: string; oficio: string; textos: string[]; coste: [number, number]; invierno?: boolean }[] = [
  { categoria: "fontaneria", oficio: "Fontanería", coste: [60, 600], textos: ["Fuga de agua en el baño", "Grifo de la cocina que gotea", "Atasco en el desagüe de la ducha", "Cisterna que no deja de perder agua"] },
  { categoria: "electricidad", oficio: "Electricidad", coste: [50, 500], textos: ["Salta el diferencial con frecuencia", "Enchufes del salón sin corriente", "Cambio de mecanismos y revisión del cuadro", "Lámpara del pasillo con cortocircuito"] },
  { categoria: "calefaccion", oficio: "Calefacción y climatización", coste: [80, 900], invierno: true, textos: ["La caldera no arranca", "Radiadores fríos en el dormitorio", "Revisión anual de caldera", "Aire acondicionado sin enfriar"] },
  { categoria: "ascensor", oficio: "Ascensores", coste: [150, 2500], textos: ["Ascensor averiado entre plantas", "Ruidos y tirones al subir", "Puerta de cabina que no cierra bien"] },
  { categoria: "cerrajeria", oficio: "Cerrajería", coste: [70, 450], textos: ["Cambio de bombín tras cambio de inquilino", "Puerta de entrada atascada", "Cerradura del portal rota"] },
  { categoria: "humedades", oficio: "Impermeabilización y obras", coste: [200, 3500], invierno: true, textos: ["Humedad por condensación en el dormitorio", "Mancha de humedad en el techo del baño", "Filtración desde la terraza superior"] },
  { categoria: "electrodomesticos", oficio: "Electrodomésticos", coste: [60, 700], textos: ["Lavadora que no centrifuga", "Nevera que no enfría", "Horno con la resistencia fundida", "Lavavajillas que pierde agua"] },
  { categoria: "plagas", oficio: "Control de plagas", coste: [90, 400], textos: ["Cucarachas en la cocina", "Presencia de hormigas en el balcón", "Tratamiento preventivo de chinches"] },
  { categoria: "pintura", oficio: "Pintura", coste: [300, 2200], textos: ["Pintura del piso tras la salida del inquilino", "Repaso de paredes y techos", "Pintura de la zona común del portal"] },
  { categoria: "otros", oficio: "Mantenimiento general", coste: [40, 600], textos: ["Persiana atascada", "Puerta de armario descolgada", "Ventana que no cierra bien", "Silicona del baño deteriorada"] },
];

export function generarProveedores(total: number): ProveedorRow[] {
  const filas: ProveedorRow[] = [];
  const apellidos = ["García", "Martínez", "López", "Sánchez", "Pérez", "Gómez", "Fernández", "Ruiz", "Díaz", "Moreno"];
  for (let i = 0; i < total; i++) {
    const c = CATEGORIAS[i % CATEGORIAS.length];
    const ap = pick(apellidos);
    const nombre = `${c.oficio.split(" ")[0]} ${ap} ${pick(["e Hijos", "S.L.", "Servicios", "24h", "Madrid"])}`;
    filas.push({
      id: i + 1, nombre, cif: `B${int(1000000, 9999999)}${int(0, 9)}`, categoria: c.categoria, telefono: telefono(),
      email: `contacto@${slug(nombre)}.example.com`,
    });
  }
  return filas;
}

export function generarIncidencias(cartera: Cartera, proveedores: ProveedorRow[], total: number): IncidenciaRow[] {
  const filas: IncidenciaRow[] = [];
  const candidatas = cartera.unidades.filter((u) => !["garaje", "trastero"].includes(u.tipo) && u.operacion !== "venta");
  const edificiosMayores = cartera.edificios.filter((e) => e.ascensor);
  while (filas.length < total) {
    const cat = pick(CATEGORIAS);
    const dias = int(1, 730);
    let fecha = addDays(TODAY, -dias);
    if (cat.invierno && chance(0.7)) {
      // Concentra calefacción y humedades entre octubre y febrero
      const mes = pick([9, 10, 11, 0, 1]);
      fecha = new Date(Date.UTC(fecha.getUTCFullYear(), mes, int(1, 28)));
      if (fecha > TODAY) fecha = new Date(Date.UTC(fecha.getUTCFullYear() - 1, mes, int(1, 28)));
    }
    const enEdificio = cat.categoria === "ascensor" || chance(0.1);
    const unidad = enEdificio ? null : pick(candidatas);
    const edificio = enEdificio ? pick(cat.categoria === "ascensor" ? edificiosMayores : cartera.edificios) : null;
    const reciente = diffDays(fecha) < 45;
    const estado = reciente ? weighted([["abierta", 40], ["en_curso", 35], ["cerrada", 25]] as const) : weighted([["cerrada", 92], ["en_curso", 5], ["abierta", 3]] as const);
    const proveedor = pick(proveedores.filter((p) => p.categoria === cat.categoria || cat.categoria === "otros"));
    const cierre = estado === "cerrada" ? addDays(fecha, int(1, 30)) : null;
    filas.push({
      id: filas.length + 1,
      unidad_id: unidad?.id ?? null,
      edificio_id: edificio?.id ?? null,
      categoria: cat.categoria,
      prioridad: cat.categoria === "ascensor" ? weighted([["alta", 60], ["urgente", 25], ["media", 15]] as const) : weighted([["baja", 25], ["media", 45], ["alta", 22], ["urgente", 8]] as const),
      estado,
      descripcion: pick(cat.textos),
      coste: estado === "cerrada" ? money(round(float(cat.coste[0], cat.coste[1]), 5)) : null,
      proveedor_id: estado === "abierta" && chance(0.5) ? null : proveedor.id,
      fecha_apertura: iso(fecha),
      fecha_cierre: cierre && cierre <= TODAY ? iso(cierre) : null,
    });
    // Si el cierre calculado queda en el futuro, la incidencia sigue en curso
    const ultima = filas[filas.length - 1];
    if (ultima.estado === "cerrada" && !ultima.fecha_cierre) {
      ultima.estado = "en_curso";
      ultima.coste = null;
    }
  }
  return filas;
}

const diffDays = (d: Date) => Math.round((TODAY.getTime() - d.getTime()) / 86_400_000);

export function generarGastos(cartera: Cartera): GastoRow[] {
  const filas: GastoRow[] = [];
  const anio = TODAY.getUTCFullYear();
  for (const e of cartera.edificios) {
    filas.push({ edificio_id: e.id, unidad_id: null, concepto: "seguro", importe: money(int(300, 1800)), fecha: `${anio}-01-15` });
    if (chance(0.2)) filas.push({ edificio_id: e.id, unidad_id: null, concepto: "derrama", importe: money(round(int(5, 60) * 1000, 500)), fecha: iso(addDays(TODAY, -int(20, 400))) });
  }
  for (const u of cartera.unidades) {
    if (["garaje", "trastero", "habitacion"].includes(u.tipo)) continue;
    filas.push({ edificio_id: null, unidad_id: u.id, concepto: "ibi", importe: money(round(u.superficie_m2 * float(1.5, 4.5), 1)), fecha: `${anio}-09-30` });
  }
  return filas;
}
