import { pideTabla } from "./formato";
import type { Content, Part } from "@google/genai";
import { chatModel, conModelos, getGeminiClient } from "@/lib/rag";
import type { DataAccess } from "./data";
import { revisarAdjuntos, type AdjuntoAprobado, type Inspector } from "./adjuntos";
import { revisarEntrada, type MotivoBloqueo } from "./guardrails";
import { systemPrompt } from "./prompt";
import { declaraciones, describirLlamada, ejecutarHerramienta, type ContextoHerramientas } from "./tools";
import type { ChatEvent, FuenteDocumento, MensajeEntrada, PropuestaAccion } from "./types";

const MAX_ITERACIONES = 6;
const MAX_HISTORIAL = 14;

export interface OpcionesAgente {
  mensajes: MensajeEntrada[];
  data: DataAccess;
  onEvent: (e: ChatEvent) => void;
  signal?: AbortSignal;
  embed?: ContextoHerramientas["embed"];
  hoy?: Date;
  /** Tokens consumidos en cada llamada al modelo (para medir coste). */
  onUso?: (u: { entrada: number; salida: number; razonamiento: number }) => void;
  /** Se llama cuando las barreras de entrada bloquean el mensaje (para registrarlo). */
  onBloqueo?: (motivo: MotivoBloqueo, mensaje: string) => void;
  /** Desactivable solo en pruebas. */
  guardrails?: boolean;
  /** Inspector de archivos sustituible en pruebas (por defecto, una llamada al modelo sin herramientas). */
  inspeccionar?: Inspector;
}

/**
 * Bucle del agente: el modelo decide qué herramientas llamar (function calling), el servidor las
 * ejecuta, y el resultado vuelve al modelo hasta que responde con texto. Todo se emite por eventos.
 */
export async function ejecutarAgente({ mensajes, data, onEvent, signal, embed, hoy, onUso, onBloqueo, guardrails = true, inspeccionar }: OpcionesAgente): Promise<string> {
  const ultimo = mensajes[mensajes.length - 1];
  if (guardrails && ultimo?.role === "user") {
    const revision = await revisarEntrada(ultimo.content, { hayHistorial: mensajes.length > 1, hayAdjuntos: !!ultimo.adjuntos?.length });
    if (!revision.ok) {
      onBloqueo?.(revision.motivo, ultimo.content);
      onEvent({ type: "text", delta: revision.respuesta });
      return revision.respuesta;
    }
  }

  // Los archivos son contenido de terceros: se revisan ANTES de que los vea el modelo del asistente
  let aprobados: AdjuntoAprobado[] = [];
  if (ultimo?.role === "user" && ultimo.adjuntos?.length) {
    const idRevision = "revision-adjuntos";
    onEvent({ type: "tool_start", id: idRevision, nombre: "revisar_adjuntos", descripcion: `Revisando ${ultimo.adjuntos.length === 1 ? "el archivo adjunto" : `${ultimo.adjuntos.length} archivos adjuntos`}` });
    const r = await revisarAdjuntos(ultimo.adjuntos, { inspeccionar });
    if (!r.ok) {
      onEvent({ type: "tool_end", id: idRevision, ok: false, resumen: "Archivo no aceptado" });
      onBloqueo?.(r.motivo, `${r.detalle}`.slice(0, 2000));
      onEvent({ type: "text", delta: r.respuesta });
      return r.respuesta;
    }
    aprobados = r.adjuntos;
    onEvent({ type: "tool_end", id: idRevision, ok: true, resumen: "Archivo revisado" });
  }

  const ventana = mensajes.slice(-MAX_HISTORIAL);
  // Mínimo privilegio: con archivos de terceros en la conversación no se proponen cambios en los datos
  const conAdjuntos = aprobados.length > 0 || ventana.some((m) => !!m.adjuntoNombres?.length);
  const marca = crypto.randomUUID().replace(/-/g, "").slice(0, 12);

  // Las tablas y gráficos bajo el mensaje solo se pintan si el usuario los pide
  const conTablas = pideTabla(ultimo?.role === "user" ? ultimo.content : undefined);
  const client = getGeminiClient();
  const fuentes: FuenteDocumento[] = [];
  const acciones: PropuestaAccion[] = [];
  const ctx: ContextoHerramientas = { data, fuentes, acciones, embed, soloLectura: conAdjuntos };

  const contents: Content[] = ventana.map((m, i) => {
    const parts: Part[] = [{ text: m.content }];
    if (i === ventana.length - 1 && aprobados.length > 0) {
      // Ni siquiera el nombre del archivo llega al modelo: es texto de un tercero y otra vía para colar instrucciones
      aprobados.forEach((a, i) => {
        const tipo = a.mime === "application/pdf" ? "PDF" : "imagen";
        parts.push({ text: `<<ADJUNTO-${marca}>> archivo ${i + 1} (${tipo})` }, { inlineData: { mimeType: a.mime, data: a.data } }, { text: `<<FIN-ADJUNTO-${marca}>>` });
      });
    } else if (m.adjuntoNombres?.length) {
      parts.push({ text: `[El usuario adjuntó ${m.adjuntoNombres.length === 1 ? "un archivo" : `${m.adjuntoNombres.length} archivos`} en este mensaje. El contenido ya no está disponible.]` });
    }
    return { role: m.role === "user" ? "user" : "model", parts };
  });

  let respuesta = "";
  let fuentesEmitidas = 0;
  let accionesEmitidas = 0;

  for (let iter = 0; iter < MAX_ITERACIONES; iter++) {
    if (signal?.aborted) break;

    const stream = await conModelos(chatModel(), (model) =>
      client.models.generateContentStream({
        model,
        contents,
        config: {
          systemInstruction: systemPrompt(hoy, { conAdjuntos, marca }),
          tools: [{ functionDeclarations: declaraciones({ soloLectura: conAdjuntos }) }],
          temperature: 0.3,
          maxOutputTokens: 2048,
          abortSignal: signal,
        },
      })
    );

    // Partes del turno del modelo, tal cual llegan (conservan firmas de razonamiento de las llamadas)
    const partesModelo: Part[] = [];
    const llamadas: { id: string; name: string; args: unknown }[] = [];

    let uso: { entrada: number; salida: number; razonamiento: number } | null = null;
    for await (const chunk of stream) {
      const m = chunk.usageMetadata;
      if (m) uso = { entrada: m.promptTokenCount ?? 0, salida: m.candidatesTokenCount ?? 0, razonamiento: m.thoughtsTokenCount ?? 0 };
      for (const parte of chunk.candidates?.[0]?.content?.parts ?? []) {
        partesModelo.push(parte);
        if (parte.functionCall?.name) {
          llamadas.push({
            id: parte.functionCall.id ?? `${parte.functionCall.name}-${iter}-${llamadas.length}`,
            name: parte.functionCall.name,
            args: parte.functionCall.args ?? {},
          });
        } else if (parte.text && !parte.thought) {
          respuesta += parte.text;
          onEvent({ type: "text", delta: parte.text });
        }
      }
    }

    if (uso) {
      onUso?.(uso);
      onEvent({ type: "usage", ...uso });
    }
    if (llamadas.length === 0) break;

    contents.push({ role: "model", parts: partesModelo });

    // Las llamadas del mismo turno son independientes: se ejecutan en paralelo
    const respuestas = await Promise.all(
      llamadas.map(async (l) => {
        onEvent({ type: "tool_start", id: l.id, nombre: l.name, descripcion: describirLlamada(l.name, l.args) });
        const r = await ejecutarHerramienta(l.name, l.args, ctx);
        onEvent({ type: "tool_end", id: l.id, ok: r.ok, resumen: r.resumen, presentacion: conTablas ? r.presentacion : undefined });
        return { llamada: l, resultado: r };
      })
    );

    if (fuentes.length > fuentesEmitidas) {
      onEvent({ type: "sources", fuentes: fuentes.slice() });
      fuentesEmitidas = fuentes.length;
    }

    for (const a of acciones.slice(accionesEmitidas)) onEvent({ type: "accion", accion: a });
    accionesEmitidas = acciones.length;

    contents.push({
      role: "user",
      parts: respuestas.map(({ llamada, resultado }) => ({
        functionResponse: {
          id: llamada.id,
          name: llamada.name,
          response: resultado.ok ? { output: resultado.resultado } : { error: resultado.resultado },
        },
      })),
    });
  }

  return respuesta;
}
