import { AIContextMeter } from "@/components/ui/ai-context-meter";
import { desgloseContexto, type ContextoChat } from "@/lib/chat-contexto";

/** Cuánto de la ventana de contexto del modelo ocupa la conversación; al pasar el cursor, qué la llena. */
export function ContextMeter({ contexto }: { contexto: ContextoChat }) {
  return <AIContextMeter used={contexto.usados} limit={contexto.limite} breakdown={desgloseContexto(contexto)} />;
}
