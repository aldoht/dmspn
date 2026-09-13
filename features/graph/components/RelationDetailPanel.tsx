"use client";

import { X, Building2, Users, TrendingUp } from "lucide-react";
import type { Empresa, RiesgoLevel, Transaccion } from "../../../lib/types";

const RISK_BADGE: Record<RiesgoLevel, string> = {
  critical: "bg-risk-critical-bg text-risk-critical",
  high: "bg-risk-high-bg text-risk-high",
  medium: "bg-risk-medium-bg text-risk-medium",
  low: "bg-risk-low-bg text-risk-low",
  resolved: "bg-risk-resolved-bg text-risk-resolved",
};

type RelationDetailPanelProps = {
  enterprises: Empresa[];
  transactions: Transaccion[];
  onClose: () => void;
};

export function RelationDetailPanel({
  enterprises,
  transactions,
  onClose,
}: RelationDetailPanelProps) {
  if (enterprises.length === 0 || transactions.length === 0) return null;

  return (
    <div className="absolute right-0 top-0 h-full w-96 border-l border-border bg-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-border p-4">
        <h2 className="font-display text-lg font-semibold text-text-primary">
          Relationship detail
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
        <div className="flex flex-col gap-5">
          {enterprises.map((e) => (
            <div key={e.id} className="flex flex-col gap-5">
              <div>
                <h3 className="font-display text-xl font-semibold text-text-primary">
                  {e.nombre}
                </h3>

                <span
                  className={`mt-1 inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${
                    RISK_BADGE[e.riesgo]
                  }`}
                >
                  {e.riesgo}
                </span>
              </div>

              <div className="flex items-start gap-2 text-sm text-text-secondary">
                <Building2 size={16} className="mt-0.5 shrink-0" />

                <div>
                  <div className="mt-1 font-mono text-xs text-text-muted">
                    {e.id}
                  </div>
                </div>
              </div>
            </div>
          ))}

          <hr />

          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-medium text-text-primary">
              <TrendingUp size={16} />
              Activity (last 72h)
            </div>

            <div className="flex justify-between text-sm text-text-secondary">
              <span>Transactions</span>
              <span className="font-mono">
                {transactions.length} transactions
              </span>
            </div>

            <div className="flex justify-between text-sm text-text-secondary">
              <span>Total</span>

              <span className="font-mono">
                $
                {transactions
                  .reduce((total, transaction) => total + transaction.monto, 0)
                  .toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
