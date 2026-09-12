"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { GroupDetailGraph } from "@/features/graph/components/GroupDetailGraph";
import { Empresa, Transaccion } from "@/lib/types";
import { useGrafoOverview } from "../hooks/useGraphOverview";
import { EnterpriseDetailPanel } from "./EnterpriseDetailPanel";

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
  const [selectedEnterprise, setSelectedEnterprise] = useState<string | null>(
    null,
  );
  const [empresasGrupo, setEmpresasGrupo] = useState<Empresa[]>([]);
  const [transaccionesGrupo, setTransaccionesGrupo] = useState<Transaccion[]>(
    [],
  );
  const { nodes, edges, loading, error, refetch } = useGrafoOverview(240);
  const commonClasses =
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:text-white hover:bg-brand hover:cursor-pointer";

  const handleNodeClick = useCallback((id: string) => {
    setSelectedEnterprise(null);
    console.log("Click on enterprise:", id);
    setSelectedEnterprise(id);
  }, []);

  const handleGroupClick = useCallback(
    async (groupId: number, nodeIds: string[]) => {
      setSelectedEnterprise(null);
      const res = await fetch("/api/graph/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfcs: nodeIds }),
      });
      const { empresas, transacciones } = await res.json();
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
          disabled={empresasGrupo.length === 0}
          className={`${commonClasses} disabled:opacity-40 ${
            vista === "detail"
              ? "bg-brand text-white"
              : "bg-surface-raised text-text-secondary"
          }`}
        >
          Group detail
        </button>
      </div>

      <div className="relative flex-1">
        {vista === "overview" ? (
          loading ? (
            <div className="flex h-full items-center justify-center text-text-muted">
              Cargando grafo...
            </div>
          ) : error ? (
            <div className="flex h-full items-center justify-center text-risk-critical">
              Error: {error}
            </div>
          ) : (
            <>
              <GraphCanvas
                nodes={nodes}
                edges={edges}
                onNodeClick={handleNodeClick}
                onGroupClick={handleGroupClick}
              />
              <EnterpriseDetailPanel
                rfc={selectedEnterprise}
                onClose={() => setSelectedEnterprise(null)}
                onVerGrupo={() => {}} // TODO: logic for getting group
                onSolicitarAgente={() => {}} // TODO: logic for agent workflow
              />
            </>
          )
        ) : (
          <GroupDetailGraph
            empresas={empresasGrupo}
            transacciones={transaccionesGrupo}
          />
        )}
      </div>
    </div>
  );
}
