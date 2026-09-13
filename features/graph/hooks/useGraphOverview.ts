"use client";

import { EmpresaNode, TransaccionEdge } from "@/lib/types";
import { useEffect, useState, useCallback } from "react";

export function useGrafoOverview(horas = 72) {
  const [nodes, setNodes] = useState<EmpresaNode[]>([]);
  const [edges, setEdges] = useState<TransaccionEdge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/graph/overview?horas=${horas}`, {
          signal,
        });
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);

        const data: { nodes: EmpresaNode[]; edges: TransaccionEdge[] } =
          await res.json();
        setNodes(data.nodes);
        setEdges(data.edges);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message);
        }
      } finally {
        setLoading(false);
      }
    },
    [horas],
  );

  useEffect(() => {
    const controller = new AbortController();
    fetchOverview(controller.signal);
    return () => controller.abort();
  }, [fetchOverview]);

  const refetch = useCallback(() => fetchOverview(), [fetchOverview]);

  return { nodes, edges, loading, error, refetch };
}
