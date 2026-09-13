"use client";

import { X, Building2, Users, TrendingUp } from "lucide-react";
import { useEnterpriseDetail } from "../../enterprises/hooks/useEnterpriseDetail";
import type { RiesgoLevel } from "../../../lib/types";

const RISK_BADGE: Record<RiesgoLevel, string> = {
  critical: "bg-risk-critical-bg text-risk-critical",
  high: "bg-risk-high-bg text-risk-high",
  medium: "bg-risk-medium-bg text-risk-medium",
  low: "bg-risk-low-bg text-risk-low",
  resolved: "bg-risk-resolved-bg text-risk-resolved",
};

type EmpresaDetailPanelProps = {
  rfc: string | null;
  onClose: () => void;
  onVerGrupo?: (rfc: string) => void;
  onSolicitarAgente?: (rfc: string) => void;
};

export function EnterpriseDetailPanel({
  rfc,
  onClose,
  onVerGrupo,
  onSolicitarAgente,
}: EmpresaDetailPanelProps) {
  const { empresa, loading, error } = useEnterpriseDetail(rfc);

  if (!rfc) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-96 border-l border-border bg-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-display text-lg font-semibold text-text-primary">
          Enterprise Detail
        </h2>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="rounded-md p-1 text-text-muted hover:bg-surface-raised hover:text-text-primary hover:cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      <div className="overflow-y-auto p-4">
        {loading && <p className="text-sm text-text-muted">Loading...</p>}
        {error && <p className="text-sm text-risk-critical">Error: {error}</p>}

        {!loading && empresa && (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="font-display text-xl font-semibold text-text-primary">
                {empresa.nombre}
              </h3>
              <span
                className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${RISK_BADGE[empresa.riesgo]}`}
              >
                {empresa.riesgo}
              </span>
            </div>

            <div className="flex items-start gap-2 text-sm text-text-secondary">
              <Building2 size={16} className="mt-0.5 shrink-0" />
              <div>
                <div className="capitalize">{empresa.giro}</div>
                <div className="text-text-muted">{empresa.domicilio}</div>
                <div className="mt-1 font-mono text-xs text-text-muted">
                  {empresa.id}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-primary">
                <Users size={16} />
                Registered owners
              </div>
              {empresa.duenos.length === 0 ? (
                <p className="text-sm text-text-muted">No registered owners</p>
              ) : (
                <ul className="flex flex-col gap-1">
                  {empresa.duenos.map((d) => (
                    <li
                      key={d.rfcPersona}
                      className="flex justify-between text-sm text-text-secondary"
                    >
                      <span>{d.nombre}</span>
                      <span className="font-mono text-text-muted">
                        {d.pctParticipacion}%
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-primary">
                <TrendingUp size={16} />
                Activity (last 72h)
              </div>
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Transactions</span>
                {/* TODO: Keep as 72h or move to 10d? */}
                <span className="font-mono">
                  {empresa.numTransaccionesRecientes}
                </span>
              </div>
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Total</span>
                <span className="font-mono">
                  ${empresa.montoTotalReciente.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 border-t border-border pt-4">
              {onVerGrupo && (
                <button
                  onClick={() => onVerGrupo(empresa.id)}
                  className="rounded-md transition-colors bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent/90 hover:cursor-pointer"
                >
                  View complete group
                </button>
              )}
              {onSolicitarAgente && (
                <button
                  onClick={() => onSolicitarAgente(empresa.id)}
                  className="rounded-md transition-colors border border-border bg-surface-raised px-3 py-2 text-sm font-medium text-text-primary hover:bg-border-subtle hover:cursor-pointer"
                >
                  Run check investigation
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
