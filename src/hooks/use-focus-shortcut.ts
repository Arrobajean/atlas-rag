"use client";

import * as React from "react";

/** Enfoca `ref` al pulsar `key` fuera de un campo de texto (p. ej. "/"). */
export function useFocusShortcut(ref: React.RefObject<HTMLElement | null>, key = "/") {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const typing = ["INPUT", "TEXTAREA"].includes(target.tagName) || target.isContentEditable;
      if (e.key === key && !typing) {
        e.preventDefault();
        ref.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ref, key]);
}
