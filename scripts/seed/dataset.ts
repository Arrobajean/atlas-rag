import { buildGeo, type GeoDataset } from "./geo";
import { generarContratos, type AtributoSeed, type ContratoRow, type PagoRow } from "./contratos";
import { generarClientes, generarDemandas, generarGastos, generarIncidencias, generarProveedores, type ClienteRow, type DemandaRow } from "./operativa";
import { generarInquilinos, generarPropietarios, type InquilinoRow, type PropietarioRow } from "./people";
import { generarCartera, type Cartera } from "./portfolio";
import { resetRandom } from "./util";

export type Row = object;

/** Orden de inserción respetando claves foráneas. */
export const TABLAS_EN_ORDEN = [
  "zonas", "municipios", "distritos", "barrios", "sinonimos_lugar", "propietarios", "edificios", "unidades",
  "inquilinos", "clientes", "contratos", "pagos", "proveedores", "incidencias", "gastos", "demandas",
] as const;
export type Tabla = (typeof TABLAS_EN_ORDEN)[number];

export interface Dataset {
  tablas: Record<Tabla, Row[]>;
  atributos: AtributoSeed[];
  geo: GeoDataset;
  cartera: Cartera;
  propietarios: PropietarioRow[];
  inquilinos: InquilinoRow[];
  clientes: ClienteRow[];
  demandas: DemandaRow[];
  contratos: ContratoRow[];
  pagos: PagoRow[];
  casos: {
    toledo45: number;
    toledo47: number;
    trampas: { fianzaExcesiva: number; garantiaExcesiva: number; gastosGestion: number; mascotasContradice: number };
    morosos: number[];
  };
}

export interface Opciones {
  unidades: number;
  propietarios: number;
  inquilinosPool: number;
  clientes: number;
  proveedores: number;
  incidencias: number;
}

export const OPCIONES_POR_DEFECTO: Opciones = {
  unidades: 1300,
  propietarios: 380,
  inquilinosPool: 1500,
  clientes: 200,
  proveedores: 50,
  incidencias: 1500,
};

/** Renumera ids de forma contigua dejando solo los usados. Devuelve el mapa antiguo → nuevo. */
function compactar<T extends { id: number }>(filas: T[], usados: Set<number>): Map<number, number> {
  const mapa = new Map<number, number>();
  const restantes = filas.filter((f) => usados.has(f.id));
  restantes.forEach((f, i) => mapa.set(f.id, i + 1));
  filas.length = 0;
  for (const f of restantes) {
    filas.push({ ...f, id: mapa.get(f.id)! });
  }
  return mapa;
}

export function buildDataset(opts: Partial<Opciones> = {}): Dataset {
  const o = { ...OPCIONES_POR_DEFECTO, ...opts };
  resetRandom();

  const geo = buildGeo();
  const propietarios = generarPropietarios(o.propietarios);
  const cartera = generarCartera(geo, propietarios, o.unidades);

  const documentos = new Set<string>();
  propietarios.forEach((p) => documentos.add(p.documento));
  const clientes = generarClientes(o.clientes, documentos);
  const pool = generarInquilinos(o.inquilinosPool, documentos);
  const compradores = clientes.filter((c) => c.tipo !== "inquilino");

  const res = generarContratos(cartera, pool, compradores);
  const demandas = generarDemandas(clientes, geo);

  // Los compradores que ya compraron no siguen buscando
  const yaCompraron = new Set(res.contratos.filter((c) => c.tipo === "compraventa").map((c) => c.cliente_id));
  demandas.forEach((d) => {
    if (yaCompraron.has(d.cliente_id)) d.activa = false;
  });

  // Solo se guardan los inquilinos y propietarios realmente usados, con ids contiguos
  const inquilinos = [...res.inquilinosUsados];
  const mapaInq = compactar(inquilinos, new Set(inquilinos.map((i) => i.id)));
  res.contratos.forEach((c) => {
    if (c.inquilino_id !== null) c.inquilino_id = mapaInq.get(c.inquilino_id)!;
  });

  const propietariosUsados = new Set(cartera.unidades.map((u) => u.propietario_id));
  const propietariosFinal = [...propietarios];
  const mapaProp = compactar(propietariosFinal, propietariosUsados);
  cartera.unidades.forEach((u) => {
    u.propietario_id = mapaProp.get(u.propietario_id)!;
  });

  const proveedores = generarProveedores(o.proveedores);
  const incidencias = generarIncidencias(cartera, proveedores, o.incidencias);
  const gastos = generarGastos(cartera);

  const tablas: Record<Tabla, Row[]> = {
    zonas: geo.zonas,
    municipios: geo.municipios,
    distritos: geo.distritos,
    barrios: geo.barrios,
    sinonimos_lugar: geo.sinonimos,
    propietarios: propietariosFinal.map((p) => ({ ...p })),
    edificios: cartera.edificios,
    // Las habitaciones apuntan a su piso: se insertan tras él (misma sentencia, FK diferida al final)
    unidades: cartera.unidades,
    inquilinos: inquilinos.map((i) => ({ ...i })),
    clientes: clientes.map((c) => ({ ...c })),
    contratos: res.contratos,
    pagos: res.pagos,
    proveedores,
    incidencias,
    gastos,
    demandas,
  };

  return {
    tablas,
    atributos: res.atributos,
    geo,
    cartera,
    propietarios: propietariosFinal,
    inquilinos,
    clientes,
    demandas,
    contratos: res.contratos,
    pagos: res.pagos,
    casos: { toledo45: cartera.casos.toledo45, toledo47: cartera.casos.toledo47, trampas: res.trampas, morosos: res.morosos },
  };
}
