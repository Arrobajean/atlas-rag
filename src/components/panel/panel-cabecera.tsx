"use client";

import Link from "next/link";
import { SparklesIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useFechaHoy, useSaludo } from "@/hooks/use-saludo";
import { cn } from "@/lib/utils";

export function PanelCabecera() {
  const saludo = useSaludo();
  const fecha = useFechaHoy();
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="space-y-1">
        <p className="min-h-5 text-sm text-muted-foreground first-letter:uppercase">{fecha}</p>
        <h1 className="text-2xl font-semibold tracking-tight">{saludo}, este es el estado de tu cartera</h1>
      </div>
      <Link href="/dashboard/chat" className={cn(buttonVariants({ variant: "default" }), "gap-2")}>
        <SparklesIcon className="size-4" /> Preguntar a Atlas
      </Link>
    </div>
  );
}
