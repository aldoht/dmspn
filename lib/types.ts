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

export type Dueno = {
  rfcPersona: string;
  nombre: string;
  pctParticipacion: number;
};

export type EmpresaDetalle = Empresa & {
  giro: string;
  domicilio: string;
  duenos: Dueno[];
  numTransaccionesRecientes: number;
  montoTotalReciente: number;
};

export type Transaccion = {
  id: string;
  origenId: string; // RFC origen
  destinoId: string; // RFC destino
  monto: number;
  fecha: string; // ISO date string (YYYY-MM-DD)
  // Geografía de la tx (Módulo 4). Opcionales para no romper mocks,
  // route ni grafo actuales: ausente = métrica geo devuelve 0.
  codigoPais?: string | null; // CODIGO_PAIS vía GEOGRAFIA_SK del FACT
  paisAltoRiesgo?: boolean; // ES_ALTO_RIESGO_GAFI (resuelto en SQL)
  sinRegulacionFormal?: boolean; // NOT TIENE_REGULACION_FORMAL (resuelto en SQL)
  // Contrapartes (Módulo 5). Opcional como geografía: ausente = métricas
  // de concentración lo excluyen (faltante no es concentración).
  cuentaDestinoId?: string | null; // NUMERO_CUENTA vía CUENTA_DESTINO_SK
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

// Alerta persistente de FACT_ALERTA para la UI (lista + badges).
// severidad en minúsculas para reusar RISK_BADGE y scoreToRisk.
export type AlertaResponse = {
  id: number;
  rfc: string;
  empresa: string;
  severidad: RiesgoLevel;
  score: number | null;
  estado: string;
  fecha: string; // "YYYY-MM-DD HH:mm" o "" si no parseable
};
