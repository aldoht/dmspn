"use client";

import { useMemo } from "react";
import {
  ReactFlow,
  type Node,
  type Edge,
  useNodesState,
  useEdgesState,
  EdgeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useForceLayout } from "../hooks/useForceLayout";
import { EmpresaNode } from "./EnterpriseNode";
import { Empresa, EmpresaNodeData, Transaccion } from "@/lib/types";
import { TransaccionEdge } from "./TransactionEdge";

type GroupDetailGraphProps = {
  empresas: Empresa[];
  transacciones: Transaccion[];
  onTransaccionClick?: (transaccionId: string) => void;
  onVerTransaccionesAgrupadas?: (transacciones: Transaccion[]) => void;
  maxAristasParalelas?: number;
};

const nodeTypes = { empresa: EmpresaNode };
const edgeTypes: EdgeTypes = { transaccion: TransaccionEdge };

export function GroupDetailGraph({
  empresas,
  transacciones,
  onTransaccionClick,
  onVerTransaccionesAgrupadas,
  maxAristasParalelas = 3,
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

  const initialNodes: Node<EmpresaNodeData>[] = useMemo(
    () =>
      empresas.map((empresa) => ({
        id: empresa.id,
        type: "empresa",
        position: positions.get(empresa.id) ?? { x: 0, y: 0 },
        data: { nombre: empresa.nombre, riesgo: empresa.riesgo },
      })),
    [empresas, positions],
  );

  const initialEdges: Edge[] = useMemo(() => {
    const grupos = new Map<string, Transaccion[]>();
    transacciones.forEach((t) => {
      const key = `${t.origenId}->${t.destinoId}`;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(t);
    });

    const resultado: Edge[] = [];

    grupos.forEach((txns, key) => {
      const [origenId, destinoId] = key.split("->");

      if (txns.length > maxAristasParalelas) {
        const montoTotal = txns.reduce((sum, t) => sum + t.monto, 0);
        resultado.push({
          id: `grupo-${key}`,
          source: origenId,
          target: destinoId,
          type: "transaccion",
          data: {
            label: `$${montoTotal.toLocaleString()} — ${txns.length} transacciones`,
            curvature: 0.25,
            esAgregada: true,
            transacciones: txns,
          },
          style: { stroke: "#8E1F1F", strokeWidth: 3 },
        });
      } else {
        txns.forEach((t, i) => {
          const signo = i % 2 === 0 ? 1 : -1;
          const curvature = signo * (0.15 + Math.floor(i / 2) * 0.2);
          resultado.push({
            id: t.id,
            source: t.origenId,
            target: t.destinoId,
            type: "transaccion",
            data: {
              label: `$${t.monto.toLocaleString()} — ${t.fecha}`,
              curvature,
              esAgregada: false,
            },
            style: { stroke: "#8E1F1F" },
          });
        });
      }
    });

    return resultado;
  }, [transacciones]);

  const [nodes, setNodes, onNodeChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgeChange] = useEdgesState(initialEdges);

  const handleEdgeClick = (_: unknown, edge: Edge) => {
    if (edge.data?.esAgregada) {
      onVerTransaccionesAgrupadas?.(edge.data.transacciones as Transaccion[]);
    } else {
      onVerTransaccionesAgrupadas?.([]);
      onTransaccionClick?.(edge.id);
    }
  };

  return (
    <div className="h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodeChange}
        onEdgesChange={onEdgeChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        onEdgeClick={handleEdgeClick}
      />
    </div>
  );
}
