"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

// pdf.js solo funciona en el navegador: se carga bajo demanda y sin SSR.
export const VisorPdf = dynamic(() => import("@/components/documentos/visor-pdf"), {
  ssr: false,
  loading: () => <Skeleton className="h-full min-h-96 w-full" />,
});
