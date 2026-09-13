"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { GroupDetailGraph } from "@/features/graph/components/GroupDetailGraph";
import { Empresa, Transaccion } from "@/lib/types";
import { useGrafoOverview } from "../hooks/useGraphOverview";
import { EnterpriseDetailPanel } from "./EnterpriseDetailPanel";
import { RelationDetailPanel } from "./RelationDetailPanel";
import { GroupedTransactionsPanel } from "./GroupedTransactionsPanel";

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
  const router = useRouter();
  const [vista, setVista] = useState<"overview" | "detail">("overview");
  const [selectedEnterprise, setSelectedEnterprise] = useState<string | null>(
    null,
  );
  const [empresasGrupo, setEmpresasGrupo] = useState<Empresa[]>([]);
  const [transaccionesGrupo, setTransaccionesGrupo] = useState<Transaccion[]>(
    [],
  );
  const [mapaComunidades, setMapaComunidades] = useState<
    Record<string, number>
  >({});
  const [relationEnterprises, setRelationEnterprises] = useState<Empresa[]>([]);
  const [relationTransactions, setRelationTransactions] = useState<
    Transaccion[]
  >([]);
  const [detailTransactions, setDetailTransactions] = useState<Transaccion[]>(
    [],
  );
  const { nodes, edges, loading, error, refetch } = useGrafoOverview(240);
  const commonClasses =
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:text-white hover:bg-brand hover:cursor-pointer";

  const handleNodeClick = useCallback((rfc: string) => {
    setRelationEnterprises([]);
    setRelationTransactions([]);
    setSelectedEnterprise(rfc);
  }, []);

  const handleGroupClick = useCallback(
    async (groupId: number, nodeIds: string[]) => {
      // Sin RFCs no hay nada que pedir: evita el 400 del endpoint.
      if (!nodeIds?.length) {
        return;
      }
      setSelectedEnterprise(null);
      const res = await fetch("/api/graph/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rfcs: nodeIds }),
      });
      if (!res.ok) {
        throw new Error(`Error ${res.status}: ${res.statusText}`);
      }
      // Defaults []: si el servidor responde error, el estado nunca queda
      // undefined y el botón se deshabilita en vez de crashear el render.
      const { empresas = [], transacciones = [] } = await res.json();
      setEmpresasGrupo(empresas);
      setTransaccionesGrupo(transacciones);
      setVista("detail");
    },
    [],
  );

  const handleGroupCalculation = useCallback((map: Record<string, number>) => {
    setMapaComunidades(map);
  }, []);

  // Redirige al Agent con el RFC del nodo: /agent?rfc=XXX. El Agent
  // precarga el input y ejecuta la auditoría sin pedirlo de nuevo.
  const handleSolicitarAgente = useCallback(
    (rfc: string) => {
      router.push(`/agent?rfc=${encodeURIComponent(rfc)}`);
    },
    [router],
  );

  const findGroup = useCallback(
    async (rfc: string | null) => {
      if (!rfc) {
        return;
      }
      // El mapa de comunidades llega tras el layout: sin groupId válido
      // no se pide nada (evita POST con rfcs: [] -> 400). Deps reales
      // (antes [] dejaba el mapa inicial vacío para siempre).
      const groupId = mapaComunidades[rfc];
      if (groupId === undefined) {
        return;
      }
      handleGroupClick(
        groupId,
        Object.keys(mapaComunidades).filter(
          (r) => mapaComunidades[r] === groupId,
        ),
      );
    },
    [mapaComunidades, handleGroupClick],
  );

  const handleEdgeClick = useCallback(async (rfcA: string, rfcB: string) => {
    setSelectedEnterprise(null);
    const res = await fetch("/api/graph/group", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rfcs: [rfcA, rfcB] }),
    });
    if (!res.ok) {
      throw new Error(`Error ${res.status}: ${res.statusText}`);
    }
    const { empresas = [], transacciones = [] } = await res.json();
    setRelationEnterprises(empresas as Empresa[]);
    setRelationTransactions(transacciones as Transaccion[]);
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
              Loading graph...
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
                onEdgeClick={handleEdgeClick}
                onCalculateGroups={handleGroupCalculation}
              />
              <EnterpriseDetailPanel
                rfc={selectedEnterprise}
                onClose={() => setSelectedEnterprise(null)}
                onVerGrupo={() => findGroup(selectedEnterprise)}
                onSolicitarAgente={handleSolicitarAgente}
              />
              <RelationDetailPanel
                enterprises={relationEnterprises}
                transactions={relationTransactions}
                onClose={() => {
                  setRelationEnterprises([]);
                  setRelationTransactions([]);
                }}
              />
            </>
          )
        ) : (
          <>
            <GroupDetailGraph
              empresas={empresasGrupo}
              transacciones={transaccionesGrupo}
              onTransaccionClick={(transaccionId) => {
                const transaccion = transaccionesGrupo.find(
                  (t) => t.id === transaccionId,
                );
                if (transaccion) setDetailTransactions([transaccion]);
              }}
              onVerTransaccionesAgrupadas={(transacciones) =>
                setDetailTransactions(transacciones)
              }
            />
            <GroupedTransactionsPanel
              transacciones={detailTransactions}
              onClose={() => setDetailTransactions([])}
            />
          </>
        )}
      </div>
    </div>
  );
}
