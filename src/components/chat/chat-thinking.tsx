import { AILoader } from "@/components/ui/ai-loader";

/** Mientras el asistente trabaja: solo la animación de puntos, sin texto. */
export function ChatThinking() {
  return <AILoader variant="dots" className="text-muted-foreground" />;
}
