"use client";

import * as React from "react";

const UMBRAL_PX = 96;

/**
 * Un solo scroll para el chat: sigue el final mientras el usuario está abajo y deja de seguirlo
 * si sube a leer (entonces ofrece un botón para volver).
 */
export function useAutoscroll<T extends HTMLElement>(dependencia: unknown) {
  const ref = React.useRef<T>(null);
  const abajo = React.useRef(true);
  const [mostrarBajar, setMostrarBajar] = React.useState(false);

  const bajar = React.useCallback((suave = true) => {
    const el = ref.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: suave ? "smooth" : "auto" });
  }, []);

  const alScroll = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    abajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < UMBRAL_PX;
    setMostrarBajar(!abajo.current);
  }, []);

  React.useEffect(() => {
    if (abajo.current) bajar(false);
    else setMostrarBajar(true);
  }, [dependencia, bajar]);

  return { ref, alScroll, mostrarBajar, bajar };
}
