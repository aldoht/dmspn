"use client";

import dynamic from "next/dynamic";
import { useState, useCallback } from "react";
import { GroupDetailGraph } from "@/features/graph/components/GroupDetailGraph";
import {
  mockEmpresasOverview,
  mockTransaccionesOverview,
  mockEmpresasDetalle,
  mockTransaccionesDetalle,
} from "@/features/graph/mockData";

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
  const commonClasses =
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:text-white hover:bg-brand hover:cursor-pointer";

  const handleNodeClick = useCallback((id: string) => {
    console.log("Click on enterprise:", id);
  }, []);

  const handleGroupClick = useCallback((groupId: number, nodeIds: string[]) => {
    console.log("Click on group:", groupId, nodeIds);
  }, []);

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
          Overview (72h)
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
            nodes={mockEmpresasOverview}
            edges={mockTransaccionesOverview}
            onNodeClick={handleNodeClick}
            onGroupClick={handleGroupClick}
          />
        ) : (
          <GroupDetailGraph
            empresas={mockEmpresasDetalle}
            transacciones={mockTransaccionesDetalle}
            onTransaccionClick={handleTransactionClick}
          />
        )}
      </div>
    </div>
  );
}
