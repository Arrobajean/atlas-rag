import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { tipoAlerta } from "@/lib/etiquetas";
import type { Resumen } from "@/lib/types";

export function AlertasResumen({ alertas }: { alertas: Resumen["alertas"] }) {
  const filas = Object.entries(alertas.porTipo).sort((a, b) => b[1] - a[1]);
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">Alertas por tipo</CardTitle>
        <CardDescription>Lo que requiere atención de los agentes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {filas.length === 0 && <p className="text-sm text-muted-foreground">Sin alertas activas.</p>}
        {filas.map(([tipo, n]) => (
          <Link key={tipo} href={`/dashboard/alertas?tipo=${tipo}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
            <span>{tipoAlerta(tipo)}</span>
            <Badge variant="secondary" className="tabular-nums">{n}</Badge>
          </Link>
        ))}
        <Link href="/dashboard/alertas" className="flex items-center gap-1 pt-1 text-xs text-primary hover:underline">
          Ver todas <ArrowRightIcon className="size-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
