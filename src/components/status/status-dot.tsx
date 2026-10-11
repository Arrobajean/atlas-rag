import { cn } from "@/lib/utils";

export type DotTone = "ok" | "warn" | "down" | "neutral";

const TONE: Record<DotTone, string> = {
  ok: "bg-emerald-500",
  warn: "bg-amber-500",
  down: "bg-red-500",
  neutral: "bg-muted-foreground/50",
};

/** Punto de estado; con `pulse` emite un halo suave (se desactiva con reduced-motion). */
export function StatusDot({ tone, pulse = false }: { tone: DotTone; pulse?: boolean }) {
  return (
    <span className="relative flex size-2 shrink-0">
      {pulse && (
        <span
          className={cn("absolute inline-flex size-full rounded-full opacity-60 animate-ping motion-reduce:hidden", TONE[tone])}
          style={{ animationDuration: "2s" }}
        />
      )}
      <span className={cn("relative inline-flex size-2 rounded-full", TONE[tone])} />
    </span>
  );
}
