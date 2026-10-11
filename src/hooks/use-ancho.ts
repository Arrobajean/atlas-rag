"use client";

import * as React from "react";

/** Ancho en píxeles de un contenedor (se actualiza al redimensionar). */
export function useAncho<T extends HTMLElement>() {
  const ref = React.useRef<T>(null);
  const [ancho, setAncho] = React.useState(0);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new ResizeObserver(([entrada]) => setAncho(Math.floor(entrada.contentRect.width)));
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, ancho };
}
