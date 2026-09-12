import type { EmpresaNode, TransaccionEdge } from "./components/GraphCanvas";
import type { Empresa, Transaccion } from "./components/GroupDetailGraph";

// ============================================================
// MOCK: Vista general (últimas 72h) — para <GraphCanvas />
// ============================================================
//
// Diseñado a propósito con 3 clusters densos + un par de nodos
// "puente" entre clusters, para que Louvain detecte grupos reales
// en vez de que todo salga como un solo blob.

export const mockEmpresasOverview: EmpresaNode[] = [
  // Cluster A — comercio/retail (denso entre sí)
  { id: "e1", label: "Comercializadora Del Valle" },
  { id: "e2", label: "Distribuidora Norte SA" },
  { id: "e3", label: "Grupo Mercantil Reyes" },
  { id: "e4", label: "Import-Export Alameda" },
  { id: "e5", label: "Comercial Las Torres" },

  // Cluster B — construcción/inmobiliaria (denso entre sí)
  { id: "e6", label: "Constructora Peninsular" },
  { id: "e7", label: "Desarrollos Urbanos MTY" },
  { id: "e8", label: "Grupo Inmobiliario Sierra" },
  { id: "e9", label: "Edificaciones del Bajío" },

  // Cluster C — consultoría/servicios (denso entre sí, la más sospechosa)
  { id: "e10", label: "Consultores Asociados RG" },
  { id: "e11", label: "Servicios Profesionales Aurora" },
  { id: "e12", label: "Asesoría Integral Castel" },
  { id: "e13", label: "Holding Financiero Lumina" },

  // Nodos puente — conectan clusters entre sí (patrón típico de lavado)
  { id: "e14", label: "Grupo Corporativo Vertex" },
  { id: "e15", label: "Inversiones Meridiano" },
];

export const mockTransaccionesOverview: TransaccionEdge[] = [
  // --- Cluster A (comercio) ---
  { source: "e1", target: "e2", weight: 8 },
  { source: "e1", target: "e3", weight: 5 },
  { source: "e2", target: "e3", weight: 6 },
  { source: "e2", target: "e4", weight: 4 },
  { source: "e3", target: "e5", weight: 3 },
  { source: "e4", target: "e5", weight: 7 },

  // --- Cluster B (construcción) ---
  { source: "e6", target: "e7", weight: 9 },
  { source: "e6", target: "e8", weight: 6 },
  { source: "e7", target: "e8", weight: 5 },
  { source: "e7", target: "e9", weight: 4 },
  { source: "e8", target: "e9", weight: 8 },

  // --- Cluster C (consultoría) — con aristas marcadas sospechosas ---
  { source: "e10", target: "e11", weight: 12, sospechosa: true },
  { source: "e10", target: "e12", weight: 9, sospechosa: true },
  { source: "e11", target: "e13", weight: 15, sospechosa: true },
  { source: "e12", target: "e13", weight: 11, sospechosa: true },

  // --- Puentes entre clusters (lo que hace interesante el patrón) ---
  { source: "e14", target: "e3", weight: 2 },
  { source: "e14", target: "e8", weight: 2 },
  { source: "e14", target: "e13", weight: 6, sospechosa: true },
  { source: "e15", target: "e5", weight: 1 },
  { source: "e15", target: "e13", weight: 4, sospechosa: true },
];

// ============================================================
// MOCK: Detalle de un grupo — para <GroupDetailGraph />
// ============================================================
//
// Simula el drill-down del Cluster C (consultoría) al hacer clic
// en el grupo desde la vista general — mismas empresas e14/e15
// incluidas como conexiones al grupo.

export const mockEmpresasDetalle: Empresa[] = [
  { id: "e10", nombre: "Consultores Asociados RG", riesgo: "high" },
  { id: "e11", nombre: "Servicios Profesionales Aurora", riesgo: "critical" },
  { id: "e12", nombre: "Asesoría Integral Castel", riesgo: "high" },
  { id: "e13", nombre: "Holding Financiero Lumina", riesgo: "critical" },
  { id: "e14", nombre: "Grupo Corporativo Vertex", riesgo: "medium" },
  { id: "e15", nombre: "Inversiones Meridiano", riesgo: "medium" },
];

export const mockTransaccionesDetalle: Transaccion[] = [
  {
    id: "t1",
    origenId: "e10",
    destinoId: "e11",
    monto: 850_000,
    fecha: "2026-09-09",
  },
  {
    id: "t2",
    origenId: "e10",
    destinoId: "e12",
    monto: 420_000,
    fecha: "2026-09-10",
  },
  {
    id: "t3",
    origenId: "e11",
    destinoId: "e13",
    monto: 1_200_000,
    fecha: "2026-09-10",
  },
  {
    id: "t4",
    origenId: "e12",
    destinoId: "e13",
    monto: 610_000,
    fecha: "2026-09-11",
  },
  {
    id: "t5",
    origenId: "e14",
    destinoId: "e13",
    monto: 300_000,
    fecha: "2026-09-11",
  },
  {
    id: "t6",
    origenId: "e15",
    destinoId: "e13",
    monto: 275_000,
    fecha: "2026-09-12",
  },
];
