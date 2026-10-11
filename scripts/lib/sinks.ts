import { createClient } from "@supabase/supabase-js";
import type { Row } from "../seed/dataset";

/** Destino de la carga de datos: Postgres (pg / PGlite) o la API REST de Supabase. */
export interface Sink {
  nombre: string;
  /** Borra los datos del seed (no toca catálogo ni configuración). */
  reset(): Promise<void>;
  insert(tabla: string, filas: Row[]): Promise<void>;
  count(tabla: string): Promise<number>;
  /** Resuelve el id del catálogo de campos por clave. */
  catalogo(): Promise<Map<string, number>>;
  /** Sincroniza secuencias tras insertar con ids explícitos. */
  finalizar(): Promise<void>;
  cerrar(): Promise<void>;
}

// Orden de borrado: hijos antes que padres.
const BORRADO = [
  "revisiones_contrato", "atributos_valores", "pagos", "incidencias", "gastos", "demandas", "contratos",
  "unidades", "edificios", "clientes", "inquilinos", "propietarios", "proveedores",
  "sinonimos_lugar", "barrios", "distritos", "municipios", "zonas",
];

interface SqlRunner {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
}

export function sqlSink(nombre: string, db: SqlRunner, cerrar: () => Promise<void>): Sink {
  return {
    nombre,
    async reset() {
      // Los documentos del seed se borran primero (arrastran fragmentos y extracciones)
      await db.query("delete from documentos where storage_path like 'seed/%'");
      for (const t of BORRADO) await db.query(`delete from ${t}`);
    },
    async insert(tabla, filas) {
      if (filas.length === 0) return;
      const columnas = Object.keys(filas[0]).map((c) => `"${c}"`).join(", ");
      const TAM = 1500;
      for (let i = 0; i < filas.length; i += TAM) {
        const lote = filas.slice(i, i + TAM);
        await db.query(
          `insert into ${tabla} (${columnas}) select ${columnas} from jsonb_populate_recordset(null::${tabla}, $1::jsonb)`,
          [JSON.stringify(lote)]
        );
      }
    },
    async count(tabla) {
      const r = await db.query<{ n: number }>(`select count(*)::int as n from ${tabla}`);
      return r.rows[0].n;
    },
    async catalogo() {
      const r = await db.query<{ id: number; clave: string }>("select id::int as id, clave from catalogo_campos");
      return new Map(r.rows.map((x) => [x.clave, x.id]));
    },
    async finalizar() {
      await db.query("select fn_reset_sequences()");
    },
    cerrar,
  };
}

export function restSink(url: string, key: string): Sink {
  const supabase = createClient(url, key, { auth: { persistSession: false } });
  return {
    nombre: "Supabase REST",
    async reset() {
      const docs = await supabase.from("documentos").delete().like("storage_path", "seed/%");
      if (docs.error) throw new Error(`documentos: ${docs.error.message}`);
      for (const t of BORRADO) {
        const { error } = await supabase.from(t).delete().gte("id", 0);
        if (error) throw new Error(`${t}: ${error.message}`);
      }
    },
    async insert(tabla, filas) {
      const TAM = 400;
      for (let i = 0; i < filas.length; i += TAM) {
        const { error } = await supabase.from(tabla).insert(filas.slice(i, i + TAM) as never[]);
        if (error) throw new Error(`${tabla}: ${error.message}`);
      }
    },
    async count(tabla) {
      const { count, error } = await supabase.from(tabla).select("*", { count: "exact", head: true });
      if (error) throw new Error(`${tabla}: ${error.message}`);
      return count ?? 0;
    },
    async catalogo() {
      const { data, error } = await supabase.from("catalogo_campos").select("id, clave");
      if (error) throw new Error(`catalogo_campos: ${error.message}`);
      return new Map((data ?? []).map((x: { id: number; clave: string }) => [x.clave, x.id]));
    },
    async finalizar() {
      const { error } = await supabase.rpc("fn_reset_sequences");
      if (error) throw new Error(`fn_reset_sequences: ${error.message}`);
    },
    async cerrar() {},
  };
}
