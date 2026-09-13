export type RiesgoLevel = "critical" | "high" | "medium" | "low" | "resolved";

export type EmpresaNode = {
  id: string; // RFC de la empresa: identificador estable entre versiones SCD2
  label: string;
};

export type TransaccionEdge = {
  source: string; // RFC origen
  target: string; // RFC destino
  weight?: number; // Monto: usado para grosor de la arista
  sospechosa?: boolean;
};

export type Empresa = {
  id: string; // RFC
  nombre: string;
  riesgo: RiesgoLevel;
};

export type Transaccion = {
  id: string;
  origenId: string; // RFC origen
  destinoId: string; // RFC destino
  monto: number;
  fecha: string; // ISO date string (YYYY-MM-DD)
};

export type EmpresaNodeData = Omit<Empresa, "id">;

export type OverviewResponse = {
  nodes: EmpresaNode[];
  edges: TransaccionEdge[];
};

export type GrupoDetalleRequest = {
  rfcs: string[];
};

export type GrupoDetalleResponse = {
  empresas: Empresa[];
  transacciones: Transaccion[];
};

export type OnNodeClick = (rfc: string) => void;
export type OnGroupClick = (groupId: number, rfcs: string[]) => void;
