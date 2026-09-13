import { Card } from "@/components/ui/Card";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { Suspense } from "react";
import { KPI } from "./Kpi";
import { getCriticalAlertsOpen, mapCriticalAlertsToKpi } from "../queries";

export async function DashboardPage() {
  const criticalOpen = await getCriticalAlertsOpen();

  const criticalKpi = mapCriticalAlertsToKpi(criticalOpen);

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="grid grid-cols-1 gap-6">
        <Card>
          Ola
        </Card>
        <div className="grid grid-cols-3 gap-6">
          <Card title="Critic alerts open">
            <Suspense fallback={<ChartSkeleton />}>
              <KPI
                value={criticalKpi.value}
                change={criticalKpi.change}
                data={criticalKpi.data}
              />
            </Suspense>
          </Card>

          <Card title="Open alerts by class">
            <Suspense fallback={<ChartSkeleton />}></Suspense>
          </Card>

          <Card title="Open alerts in the last 72 hours">
            <Suspense fallback={<ChartSkeleton />}></Suspense>
          </Card>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <Card title="Transactions over $200,000 MXN">
            <Suspense fallback={<ChartSkeleton />}></Suspense>
          </Card>

          <Card title="Enterprises with more than 10 transactions (1 week)">
            <Suspense fallback={<ChartSkeleton />}></Suspense>
          </Card>

          <Card title="Total volume in the last 48 hours">
            <Suspense fallback={<ChartSkeleton />}></Suspense>
          </Card>

          <Card title="Enterprises with activity for the first time in this week">
            <Suspense fallback={<ChartSkeleton />}></Suspense>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card title="False positives in the last 30 days">
            <Suspense fallback={<ChartSkeleton />}></Suspense>
          </Card>

          <Card title="Generated alerts vs resolved alerts">
            <Suspense fallback={<ChartSkeleton />}></Suspense>
          </Card>

          <Card title="Average risk score over time">
            <Suspense fallback={<ChartSkeleton />}></Suspense>
          </Card>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <Card title="Clusters with an active alert">
            <Suspense fallback={<ChartSkeleton />}></Suspense>
          </Card>

          <Card title="Pending checker requests">
            <Suspense fallback={<ChartSkeleton />}></Suspense>
          </Card>
        </div>
      </div>
    </div>
  );
}
