"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { GroupDetailGraph } from "@/features/graph/components/GroupDetailGraph";
import { Empresa, Transaccion } from "@/lib/types";
import { useGrafoOverview } from "../hooks/useGraphOverview";

const GraphCanvas = dynamic(
  () =>
    import("@/features/graph/components/GraphCanvas").then(
      (mod) => mod.GraphCanvas,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center text-text-muted">
        Loading graph...
      </div>
    ),
  },
);

export default function GraphPreviewPage() {
  const [vista, setVista] = useState<"overview" | "detail">("overview");
  const [empresasGrupo, setEmpresasGrupo] = useState<Empresa[]>([]);
  const [transaccionesGrupo, setTransaccionesGrupo] = useState<Transaccion[]>(
    [],
  );
  const { nodes, edges, loading, error, refetch } = useGrafoOverview(240);
  const commonClasses =
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:text-white hover:bg-brand hover:cursor-pointer";

  const handleNodeClick = useCallback((id: string) => {
    console.log("Click on enterprise:", id);
  }, []);

  const handleGroupClick = useCallback(
    async (groupId: number, nodeIds: string[]) => {
      const res = await fetch("/api/graph/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfcs: nodeIds }),
      });
      const { empresas, transacciones } = await res.json();
      console.log(empresas, transacciones);
      setEmpresasGrupo(empresas);
      setTransaccionesGrupo(transacciones);
      setVista("detail");
    },
    [],
  );

  const handleTransactionClick = useCallback((transactionId: string) => {
    console.log("Click on transaction:", transactionId);
  }, []);

  return (
    <div className="flex h-full flex-col">
      <div className="flex gap-2 border-b border-border p-4">
        <button
          onClick={() => setVista("overview")}
          className={`${commonClasses} ${
            vista === "overview"
              ? "bg-brand text-white"
              : "bg-surface-raised text-text-secondary"
          }`}
        >
          Overview (10d)
        </button>
        <button
          onClick={() => setVista("detail")}
          className={`${commonClasses} ${
            vista === "detail"
              ? "bg-brand text-white"
              : "bg-surface-raised text-text-secondary"
          }`}
        >
          Group Detail
        </button>
      </div>

      <div className="flex-1">
        {vista === "overview" ? (
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            onNodeClick={handleNodeClick}
            onGroupClick={handleGroupClick}
          />
        ) : (
          <GroupDetailGraph
            empresas={empresasGrupo}
            transacciones={transaccionesGrupo}
            onTransaccionClick={handleTransactionClick}
          />
        )}
      </div>
    </div>
  );
}
