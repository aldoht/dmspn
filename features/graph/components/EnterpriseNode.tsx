import { Handle, Position } from "@xyflow/react";

export type EmpresaNodeData = {
  nombre: string;
  riesgo: "critical" | "high" | "medium" | "low" | "resolved";
};

const RISK_STYLES: Record<EmpresaNodeData["riesgo"], string> = {
  critical: "bg-risk-critical-bg text-risk-critical border-risk-critical",
  high: "bg-risk-high-bg text-risk-high border-risk-high",
  medium: "bg-risk-medium-bg text-risk-medium border-risk-medium",
  low: "bg-risk-low-bg text-risk-low border-risk-low",
  resolved: "bg-risk-resolved-bg text-risk-resolved border-risk-resolved",
};

export function EmpresaNode({ data }: { data: EmpresaNodeData }) {
  return (
    <div
      className={`rounded-md border-2 bg-surface px-3 py-2 shadow-sm ${RISK_STYLES[data.riesgo]}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="text-sm font-medium text-text-primary">{data.nombre}</div>
      <div className="text-xs capitalize">{data.riesgo}</div>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
