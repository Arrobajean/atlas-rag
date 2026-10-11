import { describeError, getSupabaseClient } from "@/lib/rag";
import { sesionDe } from "@/lib/auth";
import { ejecutarAgente } from "@/lib/chat/agent";
import { supabaseData } from "@/lib/chat/data";
import { MAX_ADJUNTOS, nombreSeguro } from "@/lib/chat/adjuntos-tipos";
import type { ChatEvent, MensajeEntrada } from "@/lib/chat/types";

export const maxDuration = 120;

// Límite de ritmo por IP (en memoria: es una barrera básica contra abusos, no un límite exacto entre instancias)
const VENTANA_MS = 10 * 60_000;
const MAX_PETICIONES = 40;
const peticiones = new Map<string, number[]>();

/** Una consulta con archivos cuesta más (inspección + análisis): cuenta como varias. */
const PESO_ADJUNTO = 4;
/** Una función en Vercel admite cuerpos de hasta 4,5 MB. */
const MAX_CUERPO_BYTES = 4_400_000;

function demasiadasPeticiones(ip: string, peso = 1): boolean {
  const ahora = Date.now();
  const recientes = (peticiones.get(ip) ?? []).filter((t) => ahora - t < VENTANA_MS);
  for (let i = 0; i < peso; i++) recientes.push(ahora);
  peticiones.set(ip, recientes);
  if (peticiones.size > 5000) peticiones.clear();
  return recientes.length > MAX_PETICIONES;
}

function mensajesDe(body: unknown): MensajeEntrada[] | null {
  const b = body as { messages?: unknown; question?: unknown };
  if (Array.isArray(b?.messages)) {
    const valid = b.messages.filter(
      (m): m is MensajeEntrada =>
        !!m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim() !== ""
    );
    // Los mensajes antiguos se recortan: el historial es una vía de entrada más
    // Solo el último mensaje conserva sus archivos; en los anteriores se queda el nombre (los bytes no se reenvían ni se creen)
    const acotados = valid.map((m, i): MensajeEntrada => {
      const esUltimo = i === valid.length - 1;
      const nombres = (Array.isArray(m.adjuntos) ? m.adjuntos.map((a) => a?.nombre) : Array.isArray(m.adjuntoNombres) ? m.adjuntoNombres : [])
        .filter((n): n is string => typeof n === "string")
        .slice(0, MAX_ADJUNTOS)
        .map(nombreSeguro);
      const base: MensajeEntrada = { role: m.role, content: esUltimo ? m.content : m.content.slice(0, 4000) };
      if (esUltimo && m.role === "user" && Array.isArray(m.adjuntos) && m.adjuntos.length > 0) return { ...base, adjuntos: m.adjuntos };
      return nombres.length > 0 ? { ...base, adjuntoNombres: nombres } : base;
    });
    return acotados.length && acotados[acotados.length - 1].role === "user" ? acotados : null;
  }
  if (typeof b?.question === "string" && b.question.trim()) return [{ role: "user", content: b.question }];
  return null;
}

/** Respuesta en NDJSON: un evento JSON por línea (texto, herramientas usadas, fuentes…). */
export async function POST(req: Request) {
  const tamano = Number(req.headers.get("content-length") ?? 0);
  if (tamano > MAX_CUERPO_BYTES) {
    return Response.json({ error: "Los archivos pesan demasiado: máximo 3 MB en total." }, { status: 413 });
  }
  const mensajes = mensajesDe(await req.json().catch(() => null));
  if (!mensajes) {
    return Response.json({ error: "Envía al menos un mensaje del usuario" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const conArchivos = !!mensajes[mensajes.length - 1].adjuntos?.length;
  if (demasiadasPeticiones(ip, conArchivos ? PESO_ADJUNTO : 1)) {
    return Response.json({ error: "Demasiadas consultas seguidas. Espera unos minutos." }, { status: 429 });
  }
  const usuario = (await sesionDe(req))?.rol ?? null;

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: ChatEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      try {
        await ejecutarAgente({
          mensajes,
          data: supabaseData(),
          onEvent: emit,
          signal: req.signal,
          onBloqueo: (motivo, mensaje) => {
            // Se registra sin bloquear la respuesta
            void getSupabaseClient().from("chat_bloqueos").insert({ motivo, mensaje: mensaje.slice(0, 2000), usuario }).then(() => undefined, () => undefined);
          },
        });
        emit({ type: "done" });
      } catch (error: unknown) {
        console.error("Error en /api/chat:", error);
        const { message, status } = describeError(error, "Error procesando la consulta");
        emit({ type: "error", message, status });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
