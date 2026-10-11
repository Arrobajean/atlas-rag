import { getSupabaseClient } from "@/lib/rag";
import type { DataAccess } from "@/lib/chat/data";

export interface ConsultaOpciones {
  columnas?: string;
  igual?: Record<string, string | number | boolean | null>;
  orden?: { columna: string; ascendente?: boolean };
  limite?: number;
}

/** Acceso mínimo a datos (RPC + tablas) que comparten el lector y los tests. */
export interface Db extends DataAccess {
  seleccionar<T = Record<string, unknown>>(tabla: string, opciones?: ConsultaOpciones): Promise<T[]>;
  insertar<T = Record<string, unknown>>(tabla: string, fila: Record<string, unknown>): Promise<T>;
  actualizar(tabla: string, id: number, cambios: Record<string, unknown>): Promise<void>;
}

export function supabaseDb(): Db {
  const supabase = getSupabaseClient();
  return {
    async rpc<T>(nombre: string, args: Record<string, unknown> = {}) {
      const { data, error } = await supabase.rpc(nombre, args);
      if (error) throw new Error(`${nombre}: ${error.message}`);
      return data as T;
    },
    async seleccionar<T>(tabla: string, o: ConsultaOpciones = {}) {
      let q = supabase.from(tabla).select(o.columnas ?? "*");
      for (const [k, v] of Object.entries(o.igual ?? {})) q = v === null ? q.is(k, null) : q.eq(k, v);
      if (o.orden) q = q.order(o.orden.columna, { ascending: o.orden.ascendente ?? true });
      if (o.limite) q = q.limit(o.limite);
      const { data, error } = await q;
      if (error) throw new Error(`${tabla}: ${error.message}`);
      return (data ?? []) as T[];
    },
    async insertar<T>(tabla: string, fila: Record<string, unknown>) {
      const { data, error } = await supabase.from(tabla).insert(fila).select().single();
      if (error) throw new Error(`${tabla}: ${error.message}`);
      return data as T;
    },
    async actualizar(tabla: string, id: number, cambios: Record<string, unknown>) {
      const { error } = await supabase.from(tabla).update(cambios).eq("id", id);
      if (error) throw new Error(`${tabla}: ${error.message}`);
    },
  };
}
