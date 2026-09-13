import type { RiesgoLevel } from "@/features/graph/types";

type AlertaItem = {
  alertaSk: number;
  severidad: RiesgoLevel;
  estado: string;
  scoreAlMomento: number;
  fechaGeneracion: string;
  fechaResolucion: string | null;
};

const SEVERIDAD_BADGE: Record<RiesgoLevel, string> = {
  critical: "bg-risk-critical-bg text-risk-critical",
  high: "bg-risk-high-bg text-risk-high",
  medium: "bg-risk-medium-bg text-risk-medium",
  low: "bg-risk-low-bg text-risk-low",
  resolved: "bg-risk-resolved-bg text-risk-resolved",
};

const ESTADO_LABEL: Record<string, string> = {
  abierta: "Abierta",
  en_revision: "En revisión",
  confirmada: "Confirmada",
  falso_positivo: "Falso positivo",
};

export function AlertasTimeline({ alertas }: { alertas: AlertaItem[] }) {
  if (alertas.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No alerts registered for this enterprise.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {alertas.map((a) => (
        <li
          key={a.alertaSk}
          className="flex items-start justify-between gap-3 rounded-md border border-border-subtle p-3"
        >
          <div>
            <span
              className={`inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${SEVERIDAD_BADGE[a.severidad]}`}
            >
              {a.severidad}
            </span>
            <p className="mt-1 text-xs text-text-muted">
              {a.fechaGeneracion}
              {a.fechaResolucion && ` → resuelta ${a.fechaResolucion}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-text-primary">
              {ESTADO_LABEL[a.estado] ?? a.estado}
            </p>
            <p className="font-mono text-xs text-text-muted">
              score {a.scoreAlMomento}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
