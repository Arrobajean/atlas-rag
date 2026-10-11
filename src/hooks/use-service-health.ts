"use client";

import * as React from "react";
import { getHealth } from "@/lib/api";
import type { HealthReport } from "@/lib/types";

export type OverallStatus = "checking" | "operational" | "degraded" | "down";

function overallStatus(report: HealthReport | null, failed: boolean): OverallStatus {
  if (failed) return "down";
  if (!report) return "checking";
  const up = report.services.filter((s) => s.ok).length;
  if (up === report.services.length) return "operational";
  return up === 0 ? "down" : "degraded";
}

/** Comprueba /api/health al montar, cada `intervalMs` y al volver a la pestaña. */
export function useServiceHealth(intervalMs = 60_000) {
  const [report, setReport] = React.useState<HealthReport | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [checking, setChecking] = React.useState(true);

  const check = React.useCallback(
    (isActive: () => boolean = () => true) =>
      getHealth()
        .then((data) => {
          if (!isActive()) return;
          setReport(data);
          setFailed(false);
        })
        .catch(() => {
          if (isActive()) setFailed(true);
        })
        .finally(() => {
          if (isActive()) setChecking(false);
        }),
    []
  );

  React.useEffect(() => {
    let active = true;
    const isActive = () => active;
    check(isActive);
    // No se sondea con la pestaña oculta: al volver se comprueba de inmediato (onVisible)
    const id = setInterval(() => document.visibilityState === "visible" && check(isActive), intervalMs);
    const onVisible = () => document.visibilityState === "visible" && check(isActive);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [check, intervalMs]);

  const refresh = React.useCallback(() => {
    setChecking(true);
    return check();
  }, [check]);

  return { report, checking, status: overallStatus(report, failed), refresh };
}

/** Marca de tiempo que se actualiza cada `intervalMs` para textos relativos. */
export function useNow(intervalMs = 5_000) {
  const [now, setNow] = React.useState(() => Date.now());
  React.useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}
