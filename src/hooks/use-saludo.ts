"use client";

import * as React from "react";
import { saludoPorHora } from "@/lib/panel";

const sinSuscripcion = () => () => {};

/** Saludo según la hora local. En el servidor (y al hidratar) es neutro para no desajustar el HTML. */
export function useSaludo(): string {
  return React.useSyncExternalStore(
    sinSuscripcion,
    () => saludoPorHora(new Date().getHours()),
    () => "Hola",
  );
}

/** Fecha de hoy en texto largo ("miércoles, 1 de octubre"); vacía hasta que se hidrata. */
export function useFechaHoy(): string {
  return React.useSyncExternalStore(
    sinSuscripcion,
    () => new Date().toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" }),
    () => "",
  );
}
