import { z } from "zod";
import { manejar } from "@/lib/api-server";
import { exigirAdmin, sesionDe } from "@/lib/auth";
import { chatModel, getSupabaseClient } from "@/lib/rag";

const Cuerpo = z.object({
  voto: z.enum(["up", "down"]),
  pregunta: z.string().min(1).max(4000),
  respuesta: z.string().min(1).max(20000),
  herramientas: z.array(z.object({ nombre: z.string().max(80), descripcion: z.string().max(300), resumen: z.string().max(300).optional() })).max(30),
  fuentes: z.number().int().min(0).max(100),
  comentario: z.string().trim().max(1000).optional(),
});

/** Guarda la valoración (👍/👎) de una respuesta. Cualquier usuario puede valorar. */
export async function POST(req: Request) {
  return manejar(async () => {
    const v = Cuerpo.parse(await req.json());
    const { data, error } = await getSupabaseClient()
      .from("valoraciones_chat")
      .insert({ ...v, comentario: v.comentario || null, modelo: chatModel(), usuario: (await sesionDe(req))?.rol ?? null })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: data.id as number };
  }, "No se pudo guardar la valoración");
}

const TAM = 25;

/** Valoraciones y registro de acciones del asistente: solo administradores. */
export async function GET(req: Request) {
  const denegado = await exigirAdmin(req);
  if (denegado) return denegado;
  return manejar(async () => {
    const p = new URL(req.url).searchParams;
    const voto = p.get("voto");
    const pagina = Math.max(Number(p.get("pagina")) || 1, 1);
    const sb = getSupabaseClient();

    const cuenta = async (filtro?: (q: ReturnType<typeof base>) => ReturnType<typeof base>) => {
      const q = filtro ? filtro(base()) : base();
      const { count, error } = await q;
      if (error) throw new Error(error.message);
      return count ?? 0;
    };
    const base = () => sb.from("valoraciones_chat").select("id", { count: "exact", head: true });

    let lista = sb.from("valoraciones_chat").select("*", { count: "exact" }).order("created_at", { ascending: false }).range((pagina - 1) * TAM, pagina * TAM - 1);
    if (voto === "up" || voto === "down") lista = lista.eq("voto", voto);

    const [total, utiles, mejorables, conComentario, items, acciones, bloqueos] = await Promise.all([
      cuenta(),
      cuenta((q) => q.eq("voto", "up")),
      cuenta((q) => q.eq("voto", "down")),
      cuenta((q) => q.not("comentario", "is", null)),
      lista,
      sb.from("auditoria").select("id, usuario, tabla, registro_id, valor_nuevo, created_at").eq("columna", "accion_asistente").order("created_at", { ascending: false }).limit(30),
      sb.from("chat_bloqueos").select("id, motivo, mensaje, usuario, created_at").order("created_at", { ascending: false }).limit(30),
    ]);
    if (items.error) throw new Error(items.error.message);
    return {
      resumen: { total, utiles, mejorables, con_comentario: conComentario },
      items: items.data ?? [],
      total: items.count ?? 0,
      acciones: acciones.data ?? [],
      bloqueos: bloqueos.data ?? [],
    };
  }, "No se pudieron leer las valoraciones");
}
