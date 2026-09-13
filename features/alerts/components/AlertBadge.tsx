"use client";

import { AlertTriangle } from "lucide-react";
import type { AlertaResponse, RiesgoLevel } from "@/lib/types";

// Colores por severidad, mismo lenguaje que los nodos y paneles del grafo.
const SEVERIDAD_STYLES: Record<RiesgoLevel, string> = {
  critical: "bg-risk-critical-bg text-risk-critical border-risk-critical",
  high: "bg-risk-high-bg text-risk-high border-risk-high",
  medium: "bg-risk-medium-bg text-risk-medium border-risk-medium",
  low: "bg-risk-low-bg text-risk-low border-risk-low",
  resolved: "bg-risk-resolved-bg text-risk-resolved border-risk-resolved",
};

type AlertBadgeProps = {
  alerta: AlertaResponse;
  onClose?: (id: number) => void;
};

// Tarjeta de alerta persistente: empresa, severidad, score del algoritmo,
// estado del flujo (abierta/resuelta) y fecha de generación.
export function AlertBadge({ alerta, onClose }: AlertBadgeProps) {
  return (
    <div
      className={`rounded-md border-2 bg-surface px-3 py-2 shadow-sm ${SEVERIDAD_STYLES[alerta.severidad]}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
          <AlertTriangle size={16} />
          {alerta.empresa}
        </div>
        {onClose && (
          <button
            onClick={() => onClose(alerta.id)}
            aria-label="Marcar alerta como resuelta"
            title="Marcar como resuelta (ej. falso positivo)"
            className="rounded-md px-2 py-1 text-xs font-medium text-text-secondary border border-border bg-surface-raised hover:text-white hover:bg-brand hover:cursor-pointer"
          >
            Marcar resuelta
          </button>
        )}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-secondary">
        <span className="font-medium capitalize">{alerta.severidad}</span>
        <span>
          Score {alerta.score == null ? "—" : alerta.score.toLocaleString()}
        </span>
        <span className="capitalize">{alerta.estado}</span>
        {alerta.fecha && <span className="font-mono">{alerta.fecha}</span>}
      </div>
      <div className="mt-0.5 font-mono text-xs text-text-muted">{alerta.rfc}</div>
    </div>
  );
}
