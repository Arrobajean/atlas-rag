import { Badge } from "@/components/ui/badge";
import { estadoUnidad, tonoEstado } from "@/lib/etiquetas";
import { cn } from "@/lib/utils";

const TONOS = {
  ok: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  info: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
  warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  muted: "bg-muted text-muted-foreground",
} as const;

export function EstadoBadge({ estado }: { estado: string }) {
  return <Badge className={cn("border-transparent font-medium", TONOS[tonoEstado(estado)])}>{estadoUnidad(estado)}</Badge>;
}
