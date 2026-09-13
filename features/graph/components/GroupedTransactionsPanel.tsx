"use client";

import { X } from "lucide-react";
import type { Transaccion } from "../../../lib/types";

type TransaccionesAgrupadasPanelProps = {
  transacciones: Transaccion[];
  onClose: () => void;
};

export function GroupedTransactionsPanel({
  transacciones,
  onClose,
}: TransaccionesAgrupadasPanelProps) {
  if (transacciones.length === 0) return null;

  const montoTotal = transacciones.reduce((sum, t) => sum + t.monto, 0);
  const ordenadas = [...transacciones].sort((a, b) =>
    a.fecha < b.fecha ? 1 : -1,
  );

  return (
    <div className="absolute right-0 top-0 h-full w-96 border-l border-border bg-surface shadow-lg">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-text-primary">
            {transacciones.length} transactions
          </h2>
          <p className="text-sm text-text-muted">
            Total: ${montoTotal.toLocaleString()}
          </p>
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="rounded-md p-1 text-text-muted hover:bg-surface-raised hover:text-text-primary"
        >
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-surface-raised text-left text-text-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {ordenadas.map((t) => (
              <tr key={t.id} className="border-b border-border-subtle">
                <td className="px-4 py-2 font-mono text-text-secondary">
                  {t.fecha}
                </td>
                <td className="px-4 py-2 font-mono text-text-primary">
                  ${t.monto.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
