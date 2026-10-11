"use client";

import { motion } from "motion/react";
import { AtlasOrb } from "@/components/chat/atlas-orb";
import { NOMBRE_ASISTENTE } from "@/lib/asistente";

/** Saludo sobre el campo de texto cuando la conversación está vacía. */
export function ChatBienvenida() {
  return (
    <motion.div exit={{ opacity: 0, transition: { duration: 0.1 } }} className="mb-5 space-y-1 text-center">
      <AtlasOrb state="idle" size={96} etiqueta="Asistente en reposo" />
      <p className="text-2xl font-medium tracking-tight">Hola, soy {NOMBRE_ASISTENTE}</p>
      <p className="text-sm text-muted-foreground">¿Tienes nuevas ideas que explorar?</p>
    </motion.div>
  );
}
