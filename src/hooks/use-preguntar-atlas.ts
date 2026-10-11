"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useChatAcciones } from "@/components/chat-provider";

/** Envía una pregunta al asistente desde cualquier pantalla y lleva al usuario al chat. */
export function usePreguntarAtlas() {
  const router = useRouter();
  const { send } = useChatAcciones();
  return React.useCallback(
    (pregunta: string) => {
      void send(pregunta);
      router.push("/dashboard/chat");
    },
    [send, router],
  );
}
