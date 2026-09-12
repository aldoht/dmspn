"use client";

import { useMemo } from "react";
import { ReactFlow, type Node, type Edge } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useForceLayout } from "../hooks/useForceLayout";
import { EmpresaNode } from "./EnterpriseNode";
import { Empresa, EmpresaNodeData, Transaccion } from "@/lib/types";

type GroupDetailGraphProps = {
  empresas: Empresa[];
  transacciones: Transaccion[];
  onTransaccionClick?: (transaccionId: string) => void;
};

const nodeTypes = { empresa: EmpresaNode };

export function GroupDetailGraph({
  empresas,
  transacciones,
  onTransaccionClick,
}: GroupDetailGraphProps) {
  const nodeIds = useMemo(() => empresas.map((e) => e.id), [empresas]);
  const links = useMemo(
    () =>
      transacciones.map((t) => ({
        source: t.origenId,
        target: t.destinoId,
      })),
    [transacciones],
  );

  const positions = useForceLayout(nodeIds, links);

  const nodes: Node<EmpresaNodeData>[] = useMemo(
    () =>
      empresas.map((empresa) => ({
        id: empresa.id,
        type: "empresa",
        position: positions.get(empresa.id) ?? { x: 0, y: 0 },
        data: { nombre: empresa.nombre, riesgo: empresa.riesgo },
      })),
    [empresas, positions],
  );

  const edges: Edge[] = useMemo(
    () =>
      transacciones.map((t) => ({
        id: t.id,
        source: t.origenId,
        target: t.destinoId,
        label: `$${t.monto.toLocaleString()} — ${t.fecha}`,
        style: { stroke: "#8E1F1F" },
      })),
    [transacciones],
  );

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        onEdgeClick={(_, edge) => onTransaccionClick?.(edge.id)}
      />
    </div>
  );
}
