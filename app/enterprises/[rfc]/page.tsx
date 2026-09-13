import { Suspense } from "react";
import { EmpresaHeader } from "@/features/enterprises/components/EmpresaHeader";
import {
  ScoreRiesgoSection,
  VolumenTransaccionesSection,
  TopContrapartesSection,
  AlertasSection,
} from "@/features/enterprises/components/EmpresaChartSections";
import { EgoGraphSection } from "@/features/enterprises/components/EgoGraphSection";
import { Card } from "@/components/ui/Card";

function ChartSkeleton() {
  return (
    <div className="flex h-50 items-center justify-center text-sm text-text-muted">
      Cargando...
    </div>
  );
}

export default async function EmpresaDetailPage({
  params,
}: {
  params: Promise<{ rfc: string }>;
}) {
  const { rfc } = await params;

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <EmpresaHeader rfc={rfc} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Risk score in time">
          <Suspense fallback={<ChartSkeleton />}>
            <ScoreRiesgoSection rfc={rfc} />
          </Suspense>
        </Card>

        <Card title="Transaction volume (30 days)">
          <Suspense fallback={<ChartSkeleton />}>
            <VolumenTransaccionesSection rfc={rfc} />
          </Suspense>
        </Card>

        <Card title="Top counterparts by amount">
          <Suspense fallback={<ChartSkeleton />}>
            <TopContrapartesSection rfc={rfc} />
          </Suspense>
        </Card>

        <Card title="Alert history">
          <Suspense fallback={<ChartSkeleton />}>
            <AlertasSection rfc={rfc} />
          </Suspense>
        </Card>
      </div>

      <Card title="Direct relation graph">
        <Suspense fallback={<ChartSkeleton />}>
          <EgoGraphSection rfc={rfc} />
        </Suspense>
      </Card>
    </div>
  );
}
