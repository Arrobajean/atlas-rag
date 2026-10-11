"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { errorMessage, login } from "@/lib/api";

export function useLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const entrar = React.useCallback(
    async (password: string) => {
      setLoading(true);
      setError(null);
      try {
        await login(password);
        // Solo se acepta un destino interno para evitar redirecciones abiertas
        const next = params.get("next");
        router.replace(next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard");
        router.refresh();
      } catch (err) {
        setError(errorMessage(err, "No se pudo iniciar sesión"));
        setLoading(false);
      }
    },
    [params, router]
  );

  return { loading, error, entrar };
}
