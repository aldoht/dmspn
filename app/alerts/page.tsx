"use client";

import { useCallback } from "react";
import { useAlerts } from "@/features/alerts/hooks/useAlerts";
import { AlertBadge } from "@/features/alerts/components/AlertBadge";

export default function AlertasPage() {
  const { alertas, loading, error, refetch, quitar } = useAlerts();

  // Cierra la alerta (resuelta, ej. falso positivo): optimista — la saca
  // de la lista al instante y si el PATCH falla, refetch la restaura.
  // Como el GET filtra abiertas, al resolver desaparece sola.
  const handleResolver = useCallback(
    async (id: number) => {
      quitar(id);
      try {
        const res = await fetch(`/api/alerts/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ estado: "resuelta" }),
        });
        if (!res.ok) {
          throw new Error(`Error ${res.status}`);
        }
      } catch (e) {
        console.error("No se pudo resolver la alerta:", e);
      } finally {
        refetch();
      }
    },
    [quitar, refetch],
  );

  return (
    <div className="bg-background w-full h-full">
      <div className="flex items-center justify-between m-3">
        <h1 className="text-3xl font-display">Alertas</h1>
        <button
          onClick={refetch}
          className="rounded-md px-3 py-1.5 text-sm font-medium transition-colors bg-surface-raised text-text-secondary hover:text-white hover:bg-brand hover:cursor-pointer"
        >
          Actualizar
        </button>
      </div>
      {loading ? (
        <div className="flex h-full items-center justify-center text-text-muted">
          Cargando alertas...
        </div>
      ) : error ? (
        <div className="flex h-full items-center justify-center text-risk-critical">
          Error: {error}
        </div>
      ) : alertas.length === 0 ? (
        <div className="flex h-full items-center justify-center text-text-muted">
          Sin alertas abiertas.
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-3">
          {alertas.map((alerta) => (
            <AlertBadge
              key={alerta.id}
              alerta={alerta}
              onClose={handleResolver}
            />
          ))}
        </div>
      )}
    </div>
  );
}
