import { getSupabaseClient } from "@/lib/rag";

/**
 * Único punto de acceso a datos del agente: llamadas RPC con parámetros nombrados.
 * En producción va a Supabase; los tests lo sustituyen por PGlite.
 */
export interface DataAccess {
  rpc<T = unknown>(nombre: string, args?: Record<string, unknown>): Promise<T>;
}

export function supabaseData(): DataAccess {
  const supabase = getSupabaseClient();
  return {
    async rpc<T>(nombre: string, args: Record<string, unknown> = {}) {
      const { data, error } = await supabase.rpc(nombre, args);
      if (error) throw new Error(`${nombre}: ${error.message}`);
      return data as T;
    },
  };
}
