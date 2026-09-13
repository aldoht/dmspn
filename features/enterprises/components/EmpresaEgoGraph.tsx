"use client";

import dynamic from "next/dynamic";
import type { Empresa, Transaccion } from "@/lib/types";

const GroupDetailGraph = dynamic(
  () =>
    import("@/features/graph/components/GroupDetailGraph").then(
      (mod) => mod.GroupDetailGraph,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center text-sm text-text-muted">
        Loading graph...
      </div>
    ),
  },
);

export function EmpresaEgoGraph({
  empresas,
  transacciones,
}: {
  empresas: Empresa[];
  transacciones: Transaccion[];
}) {
  if (empresas.length <= 1) {
    return (
      <p className="text-sm text-text-muted">
        Not enough counterparts to draw the graph.
      </p>
    );
  }

  return (
    <div className="h-150 w-full overflow-hidden rounded-md border border-border">
      <GroupDetailGraph
        empresas={empresas}
        transacciones={transacciones}
        maxAristasParalelas={1}
      />
    </div>
  );
}
