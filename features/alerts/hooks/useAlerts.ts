"use client";

import { useCallback, useEffect, useState } from "react";
import type { AlertaResponse } from "@/lib/types";

// Lee alertas persistentes (FACT_ALERTA) con polling, igual que useGrafoOverview:
// recarga al montar y cada intervalo; AbortController para desmontar.
export function useAlerts(intervaloMs = 30000) {
  const [alertas, setAlertas] = useState<AlertaResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAlertas = useCallback(
    async (signal?: AbortSignal, esPolling = false) => {
      if (!esPolling) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch("/api/alerts", { signal });
        if (!res.ok) {
          throw new Error(`Error ${res.status}: ${res.statusText}`);
        }
        const data: AlertaResponse[] = await res.json();
        setAlertas(Array.isArray(data) ? data : []);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      } finally {
        if (!esPolling) {
          setLoading(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchAlertas(controller.signal);

    const interval = setInterval(() => {
      fetchAlertas(controller.signal, true);
    }, intervaloMs);

    return () => {
      controller.abort();
      clearInterval(interval);
    };
  }, [fetchAlertas, intervaloMs]);

  const refetch = useCallback(() => fetchAlertas(), [fetchAlertas]);

  // Quita una alerta de la lista local al instante (optimista tras resolver).
  // Si el servidor falla, el llamador hace refetch() y la restaura.
  const quitar = useCallback((id: number) => {
    setAlertas((prev) => prev.filter((a) => a.id !== id));
  }, []);

  return { alertas, loading, error, refetch, quitar };
}
