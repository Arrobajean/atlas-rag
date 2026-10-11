import type { InquilinoRow } from "./people";
import type { Cartera, UnidadRow } from "./portfolio";
import { addDays, addMonths, chance, diffDays, firstOfMonth, float, int, iso, money, pick, ref, round, shuffle, TODAY, weighted } from "./util";

export type TipoContrato = "vivienda_habitual" | "temporada" | "habitacion" | "local" | "compraventa";
export type EstadoContrato = "borrador" | "vigente" | "finalizado" | "rescindido";

export interface ContratoRow {
  id: number;
  referencia: string;
  unidad_id: number;
  inquilino_id: number | null;
  cliente_id: number | null;
  tipo: TipoContrato;
  estado: EstadoContrato;
  fecha_firma: string | null;
  fecha_inicio: string;
  fecha_fin: string | null;
  renta_mensual: number | null;
  fianza: number | null;
  garantia_adicional: number | null;
  fianza_depositada: boolean;
  fecha_deposito_fianza: string | null;
  indice_actualizacion: "ninguno" | "ipc" | "irav" | "fijo";
  dia_pago: number | null;
  precio_venta: number | null;
  prorrogas: number;
  documento_id: number | null;
}

export interface PagoRow {
  contrato_id: number;
  periodo: string;
  importe: number;
  fecha_vencimiento: string;
  fecha_pago: string | null;
  estado: "pagado" | "pendiente" | "impagado";
}

export interface AtributoSeed {
  contrato_id: number;
  clave: string;
  valor: boolean | number;
}

export interface ContratosResult {
  contratos: ContratoRow[];
  pagos: PagoRow[];
  atributos: AtributoSeed[];
  inquilinosUsados: InquilinoRow[];
  /** Contratos con condiciones ilegales o anómalas, para probar el revisor de cláusulas. */
  trampas: { fianzaExcesiva: number; garantiaExcesiva: number; gastosGestion: number; mascotasContradice: number };
  morosos: number[];
}

/** Reparte inquilinos sin solapar contratos (salvo garaje/trastero, que pueden sumarse a una vivienda). */
class Asignador {
  private libres: InquilinoRow[];
  private usados = new Set<number>();
  private intervalos = new Map<number, { ini: Date; fin: Date; anexo: boolean }[]>();
  constructor(private todos: InquilinoRow[]) {
    this.libres = shuffle(todos);
  }

  private libreEn(id: number, ini: Date, fin: Date, anexo: boolean) {
    return (this.intervalos.get(id) ?? []).every((x) => (anexo || x.anexo) || x.fin < ini || x.ini > fin);
  }

  asignar(ini: Date, fin: Date, anexo: boolean): InquilinoRow {
    // Un garaje suele alquilarlo alguien que ya vive en el edificio
    if (anexo && chance(0.35)) {
      for (let i = 0; i < 40; i++) {
        const t = pick(this.todos);
        const activos = (this.intervalos.get(t.id) ?? []).some((x) => !x.anexo && x.ini <= TODAY && x.fin >= TODAY);
        if (activos && this.libreEn(t.id, ini, fin, true)) return this.reservar(t, ini, fin, anexo);
      }
    }
    if (this.libres.length > 0 && chance(0.88)) {
      for (let i = 0; i < this.libres.length; i++) {
        const t = this.libres[i];
        if (this.libreEn(t.id, ini, fin, anexo)) {
          this.libres.splice(i, 1);
          return this.reservar(t, ini, fin, anexo);
        }
      }
    }
    for (let i = 0; i < 200; i++) {
      const t = pick(this.todos);
      if (this.libreEn(t.id, ini, fin, anexo)) return this.reservar(t, ini, fin, anexo);
    }
    throw new Error("No hay inquilinos libres suficientes: aumenta el tamaño del pool");
  }

  private reservar(t: InquilinoRow, ini: Date, fin: Date, anexo: boolean) {
    this.usados.add(t.id);
    const lista = this.intervalos.get(t.id) ?? [];
    lista.push({ ini, fin, anexo });
    this.intervalos.set(t.id, lista);
    return t;
  }

  get inquilinosUsados() {
    return this.todos.filter((t) => this.usados.has(t.id));
  }
}

function tipoContratoDe(u: UnidadRow): TipoContrato {
  if (u.tipo === "habitacion") return "habitacion";
  if (["local", "oficina", "garaje", "trastero"].includes(u.tipo)) return "local";
  if (u.operacion === "temporada") return "temporada";
  return "vivienda_habitual";
}

function duracionMeses(tipo: TipoContrato): number {
  switch (tipo) {
    case "vivienda_habitual": return weighted([[12, 30], [24, 15], [36, 15], [60, 40]] as const);
    case "temporada": return int(3, 11);
    case "habitacion": return weighted([[6, 30], [10, 30], [12, 40]] as const);
    default: return weighted([[36, 40], [60, 45], [24, 15]] as const);
  }
}

export function generarContratos(
  cartera: Cartera,
  inquilinos: InquilinoRow[],
  compradores: { id: number }[]
): ContratosResult {
  const contratos: ContratoRow[] = [];
  const pagos: PagoRow[] = [];
  const atributos: AtributoSeed[] = [];
  const morosos: number[] = [];
  const asignador = new Asignador(inquilinos);
  let contratoId = 0;

  const limiteHistorico = addDays(TODAY, -1825);

  const rentaBase = (u: UnidadRow, tipo: TipoContrato) =>
    (tipo === "temporada" ? u.precio_temporada_mes ?? u.precio_alquiler : u.precio_alquiler) ?? 0;

  const crear = (
    u: UnidadRow,
    tipo: TipoContrato,
    ini: Date,
    fin: Date,
    estado: EstadoContrato,
    renta: number,
    prorrogas: number
  ): ContratoRow => {
    contratoId += 1;
    const anexo = u.tipo === "garaje" || u.tipo === "trastero";
    const inq = asignador.asignar(ini, fin, anexo);
    const meses = tipo === "local" ? (weighted([[2, 55], [3, 15], [1, 30]] as const)) : tipo === "temporada" ? int(1, 2) : 1;
    const fianzaMeses = anexo ? 1 : tipo === "vivienda_habitual" ? (chance(0.01) ? 2 : 1) : meses;
    const garantiaMeses =
      anexo ? 0 : tipo === "vivienda_habitual" ? weighted([[0, 78], [1, 18], [2, 4]] as const) : tipo === "local" ? weighted([[0, 60], [2, 25], [3, 15]] as const) : 0;
    const antiguedad = diffDays(TODAY, ini);
    const depositada = antiguedad < 30 ? chance(0.6) : chance(0.975);
    const irav = ini >= new Date(Date.UTC(2025, 0, 1));
    const indice =
      tipo === "vivienda_habitual" ? weighted([["ipc", irav ? 25 : 65], ["irav", irav ? 55 : 0], ["ninguno", 20]] as const)
      : tipo === "local" ? weighted([["ipc", 70], ["ninguno", 15], ["fijo", 15]] as const)
      : weighted([["ninguno", 88], ["fijo", 12]] as const);
    const firma = addDays(ini, -int(1, 15));
    const fila: ContratoRow = {
      id: contratoId,
      referencia: ref("C", contratoId),
      unidad_id: u.id,
      inquilino_id: inq.id,
      cliente_id: null,
      tipo,
      estado,
      fecha_firma: iso(firma),
      fecha_inicio: iso(ini),
      fecha_fin: iso(fin),
      renta_mensual: money(renta),
      fianza: money(renta * fianzaMeses),
      garantia_adicional: garantiaMeses ? money(renta * garantiaMeses) : null,
      fianza_depositada: estado === "borrador" ? false : depositada,
      fecha_deposito_fianza: estado !== "borrador" && depositada ? iso(addDays(ini, int(3, 25))) : null,
      indice_actualizacion: indice,
      dia_pago: weighted([[1, 60], [5, 20], [10, 10], [2, 4], [3, 3], [4, 3]] as const),
      precio_venta: null,
      prorrogas,
      documento_id: null,
    };
    contratos.push(fila);
    return fila;
  };

  /** Contrato en curso: el fin del periodo actual cae de forma uniforme en el futuro. */
  const vigente = (u: UnidadRow): ContratoRow => {
    const tipo = tipoContratoDe(u);
    const dur = duracionMeses(tipo);
    const admiteProrrogas = tipo === "vivienda_habitual" && dur <= 24 || tipo === "habitacion";
    const prorrogas = admiteProrrogas ? int(0, 3) : 0;
    const total = dur * (1 + prorrogas);
    const fin = addDays(TODAY, int(5, Math.max(30, Math.round((dur * 365) / 12))));
    let ini = addDays(addMonths(fin, -total), 1);
    if (ini < limiteHistorico) ini = limiteHistorico;
    // Un contrato «vigente» tiene que haber empezado ya (los meses de calendario no miden lo mismo que los días)
    if (ini >= TODAY) ini = addDays(TODAY, -int(1, 20));
    const renta = round((rentaBase(u, tipo) || 500) * float(0.9, 1), 5);
    return crear(u, tipo, ini, fin, "vigente", renta, prorrogas);
  };

  /** Contratos anteriores encadenados hacia atrás desde `finMasReciente`. */
  const historicos = (u: UnidadRow, finMasReciente: Date, n: number) => {
    let fin = finMasReciente;
    for (let k = 0; k < n; k++) {
      const tipo = tipoContratoDe(u);
      const dur = duracionMeses(tipo);
      const ini = addDays(addMonths(fin, -dur), 1);
      if (ini < limiteHistorico) break;
      const rescindido = chance(0.05);
      let finReal = fin;
      if (rescindido) {
        finReal = addDays(ini, Math.round(diffDays(fin, ini) * float(0.4, 0.9)));
      }
      const anios = Math.max(0, diffDays(TODAY, finReal) / 365);
      const renta = round((rentaBase(u, tipo) || 500) * Math.max(0.7, 1 - 0.04 * anios) * float(0.93, 1), 5);
      crear(u, tipo, ini, finReal, rescindido ? "rescindido" : "finalizado", renta, 0);
      fin = addDays(ini, -1 - int(0, 60));
    }
  };

  const conContrato = cartera.unidades.filter(
    (u) => u.operacion !== "venta" && !(u.tipo !== "habitacion" && u.operacion === "habitaciones")
  );

  for (const u of conContrato) {
    if (u.estado === "alquilada") {
      const c = vigente(u);
      if (chance(0.55)) historicos(u, addDays(new Date(c.fecha_inicio + "T00:00:00Z"), -1 - int(0, 45)), int(1, 2));
    } else if (u.estado === "disponible" || u.estado === "reforma" || u.estado === "reservada") {
      const cuando = u.estado === "reforma" ? int(5, 90) : int(5, 220);
      if (chance(0.72)) historicos(u, addDays(TODAY, -cuando), int(1, 2));
      if (u.estado === "reservada" && chance(0.6)) {
        const tipo = tipoContratoDe(u);
        const ini = u.fecha_disponible ? new Date(u.fecha_disponible + "T00:00:00Z") : addDays(TODAY, int(5, 40));
        const dur = duracionMeses(tipo);
        crear(u, tipo, ini, addDays(addMonths(ini, dur), -1), "borrador", round((rentaBase(u, tipo) || 500) * float(0.95, 1), 5), 0);
      }
    }
  }

  // Compraventas: unidades vendidas con su comprador
  const vendidas = cartera.unidades.filter((u) => u.estado === "vendida");
  const disponiblesCompradores = shuffle(compradores);
  vendidas.forEach((u, i) => {
    const comprador = disponiblesCompradores[i % disponiblesCompradores.length];
    contratoId += 1;
    const firma = addDays(TODAY, -int(15, 1000));
    contratos.push({
      id: contratoId, referencia: ref("C", contratoId), unidad_id: u.id, inquilino_id: null, cliente_id: comprador.id,
      tipo: "compraventa", estado: "finalizado", fecha_firma: iso(firma), fecha_inicio: iso(firma), fecha_fin: null,
      renta_mensual: null, fianza: null, garantia_adicional: null, fianza_depositada: false, fecha_deposito_fianza: null,
      indice_actualizacion: "ninguno", dia_pago: null, precio_venta: round((u.precio_venta ?? 200000) * float(0.92, 1), 1000),
      prorrogas: 0, documento_id: null,
    });
  });

  // ── Pagos ──────────────────────────────────────────────────────────────────────────────────────
  const inicioVentana = firstOfMonth(addMonths(TODAY, -24));
  const alquileres = contratos.filter((c) => c.tipo !== "compraventa" && c.estado !== "borrador");
  const vigentes = alquileres.filter((c) => c.estado === "vigente");
  // Perfiles: algunos morosos crónicos y varios pagadores tardíos
  const morososIds = new Set(shuffle(vigentes.filter((c) => diffDays(TODAY, new Date(c.fecha_inicio + "T00:00:00Z")) > 200)).slice(0, 16).map((c) => c.id));
  const tardios = new Set(shuffle(alquileres).slice(0, Math.round(alquileres.length * 0.1)).map((c) => c.id));

  for (const c of alquileres) {
    const ini = new Date(c.fecha_inicio + "T00:00:00Z");
    const fin = new Date((c.fecha_fin as string) + "T00:00:00Z");
    const dia = c.dia_pago ?? 1;
    let periodo = firstOfMonth(ini);
    if (ini.getUTCDate() > dia) periodo = addMonths(periodo, 1);
    if (periodo < inicioVentana) periodo = inicioVentana;

    const esMoroso = morososIds.has(c.id);
    const mesesImpagados = esMoroso ? weighted([[2, 40], [3, 30], [4, 20], [6, 10]] as const) : 0;
    const rescindidoConDeuda = c.estado === "rescindido" && diffDays(TODAY, fin) < 365 && chance(0.3);
    if (esMoroso) morosos.push(c.id);

    const periodos: Date[] = [];
    for (let p = periodo; ; p = addMonths(p, 1)) {
      const venc = addDays(p, dia - 1);
      if (venc > TODAY || venc > fin) break;
      periodos.push(p);
    }
    periodos.forEach((p, idx) => {
      const venc = addDays(p, dia - 1);
      const restantes = periodos.length - idx;
      const debeSinPagar = (esMoroso && restantes <= mesesImpagados) || (rescindidoConDeuda && restantes <= 2);
      let fechaPago: Date | null = null;
      if (!debeSinPagar) {
        const retraso = tardios.has(c.id) && chance(0.4) ? int(5, 20) : chance(0.035) ? int(1, 3) : 0;
        fechaPago = addDays(venc, retraso);
        if (fechaPago > TODAY) fechaPago = null;
      }
      pagos.push({
        contrato_id: c.id,
        periodo: iso(p),
        importe: c.renta_mensual ?? 0,
        fecha_vencimiento: iso(venc),
        fecha_pago: fechaPago ? iso(fechaPago) : null,
        estado: fechaPago ? "pagado" : diffDays(TODAY, venc) > 5 ? "impagado" : "pendiente",
      });
    });
  }

  // ── Contratos «trampa» para el revisor de cláusulas ───────────────────────────────────────────
  const candidatos = shuffle(vigentes.filter((c) => c.tipo === "vivienda_habitual"));
  const [c1, c2, c3, c4] = candidatos;
  c1.fianza = money((c1.renta_mensual ?? 0) * 3); // fianza de 3 mensualidades en vivienda (máx. legal: 1)
  c2.garantia_adicional = money((c2.renta_mensual ?? 0) * 4); // garantía adicional > 2 mensualidades
  atributos.push({ contrato_id: c3.id, clave: "attr_gastos_gestion_a_cargo_inquilino", valor: true });
  atributos.push({ contrato_id: c4.id, clave: "attr_permite_mascotas", valor: false });
  // Atributos habituales en una muestra de contratos vigentes
  for (const c of shuffle(vigentes).slice(0, 120)) {
    if (c.id === c3.id || c.id === c4.id) continue;
    atributos.push({ contrato_id: c.id, clave: "attr_permite_mascotas", valor: chance(0.5) });
    atributos.push({ contrato_id: c.id, clave: "attr_permite_fumar", valor: chance(0.2) });
    atributos.push({ contrato_id: c.id, clave: "attr_meses_preaviso_desistimiento", valor: pick([1, 2, 3]) });
  }

  return {
    contratos,
    pagos,
    atributos,
    inquilinosUsados: asignador.inquilinosUsados,
    trampas: { fianzaExcesiva: c1.id, garantiaExcesiva: c2.id, gastosGestion: c3.id, mascotasContradice: c4.id },
    morosos,
  };
}
