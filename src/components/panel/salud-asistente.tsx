import Link from "next/link";
import { ArrowRightIcon, ThumbsDownIcon, ThumbsUpIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { num, pct } from "@/lib/format";
import type { SaludAsistente as Datos } from "@/lib/types";

/** Solo administración: cómo valoran las respuestas del asistente y qué ha fallado. */
export function SaludAsistente({ datos }: { datos: Datos }) {
  const total = datos.positivas + datos.negativas;
  const aprobacion = total > 0 ? Math.round((1000 * datos.positivas) / total) / 10 : null;
  return (
    <Card className="shadow-xs">
      <CardHeader>
        <CardTitle className="text-base">Salud del asistente</CardTitle>
        <CardDescription>Valoraciones de los últimos {datos.dias} días</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">Aún no hay valoraciones esta semana.</p>
        ) : (
          <>
            <div className="space-y-1">
              <p className="text-3xl font-semibold tabular-nums tracking-tight">{pct(aprobacion)}</p>
              <p className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><ThumbsUpIcon className="size-3.5 text-emerald-500" /> {num(datos.positivas)}</span>
                <span className="flex items-center gap-1"><ThumbsDownIcon className="size-3.5 text-amber-500" /> {num(datos.negativas)}</span>
              </p>
            </div>
            {datos.fallos.length > 0 && (
              <ul className="space-y-1.5 text-xs">
                {datos.fallos.map((f) => (
                  <li key={f.created_at} className="rounded-md bg-muted/50 px-2.5 py-1.5">
                    <p className="truncate font-medium">{f.pregunta}</p>
                    {f.comentario && <p className="truncate text-muted-foreground">{f.comentario}</p>}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
        <Link href="/dashboard/valoraciones" className="flex items-center gap-1 text-xs text-primary hover:underline">
          Ver todas <ArrowRightIcon className="size-3" />
        </Link>
      </CardContent>
    </Card>
  );
}
