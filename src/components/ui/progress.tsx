import * as React from "react";
import { cn } from "@/lib/utils";

/** Barra de progreso simple (0-100) con semántica ARIA. */
export function Progress({ value, className, ...props }: { value: number } & Omit<React.ComponentProps<"div">, "children">) {
  const v = Math.min(100, Math.max(0, value));
  return (
    <div role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100} className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)} {...props}>
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${v}%` }} />
    </div>
  );
}
