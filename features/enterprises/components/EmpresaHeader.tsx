import { notFound } from "next/navigation";
import { getEmpresaPorRfc, getDuenosDeEmpresa } from "@/features/graph/queries";
import { scoreToRisk } from "@/features/graph/utils/scoreToRisk";
import type { RiesgoLevel } from "@/lib/types";

const RISK_BADGE: Record<RiesgoLevel, string> = {
  critical: "bg-risk-critical-bg text-risk-critical",
  high: "bg-risk-high-bg text-risk-high",
  medium: "bg-risk-medium-bg text-risk-medium",
  low: "bg-risk-low-bg text-risk-low",
  resolved: "bg-risk-resolved-bg text-risk-resolved",
};

export async function EmpresaHeader({ rfc }: { rfc: string }) {
  const empresa = await getEmpresaPorRfc(rfc);

  if (!empresa) notFound();

  const duenos = await getDuenosDeEmpresa(rfc);
  const riesgo = scoreToRisk(empresa.SCORE_TOTAL);

  return (
    <div className="flex flex-col gap-4 border-b border-border pb-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-text-primary">
          {empresa.RAZON_SOCIAL}
        </h1>
        <span
          className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-medium capitalize ${RISK_BADGE[riesgo]}`}
        >
          {riesgo}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-text-muted">RFC</p>
          <p className="font-mono text-text-primary">{empresa.RFC_EMPRESA}</p>
        </div>
        <div>
          <p className="text-text-muted">Giro</p>
          <p className="capitalize text-text-primary">{empresa.GIRO}</p>
        </div>
        <div className="col-span-2">
          <p className="text-text-muted">Domicilio</p>
          <p className="text-text-primary">{empresa.DOMICILIO_REGISTRADO}</p>
        </div>
      </div>

      <div>
        <p className="mb-1 text-sm font-medium text-text-primary">
          Dueños registrados
        </p>
        {duenos.length === 0 ? (
          <p className="text-sm text-text-muted">Sin dueños registrados.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {duenos.map((d) => (
              <li
                key={d.RFC_PERSONA}
                className="rounded-md border border-border-subtle bg-surface-raised px-2.5 py-1 text-xs text-text-secondary"
              >
                {d.NOMBRE_COMPLETO} · {d.PCT_PARTICIPACION}%
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
