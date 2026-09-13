import { Card } from "@/components/ui/Card";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { Suspense } from "react";
import { KPI } from "./Kpi";
import { AlertsBySeverityChart } from "./AlertsBySeverityChart";
import { TopEnterprisesChart } from "./TopEnterprisesChart";
import { GeneratedVsResolvedChart } from "./GeneratedVsResolvedChart";
import { AverageRiskScoreChart } from "./AverageRiskScoreChart";
import {
  getCriticalAlertsOpen,
  getTransactionsOverAmount,
  getOpenAlertsBySeverity,
  getOpenAlertsLast72h,
  getEnterprisesWithMoreThan10Transactions,
  mapCriticalAlertsToKpi,
  mapTransactionsToChart,
  mapAlertsBySeverityToChart,
  mapOpenAlerts72hToKpi,
  mapEnterprisesToChart,
  getFalsePositivesLast30d,
  getGeneratedVsResolvedAlerts,
  getAverageRiskScoreOverTime,
  mapFalsePositivesToKpi,
  mapGeneratedVsResolvedToChart,
  mapAverageRiskScoreToChart,
  getTotalVolumeLast48h,
  getEnterprisesFirstActivityThisMonth,
  getClustersWithActiveAlert,
  mapTotalVolumeToKpi,
  mapFirstActivityToKpi,
  mapClustersWithActiveAlertToKpi,
} from "../queries";
import { LargeTransactionsChart } from "./LargeTransactionsChart";

export async function DashboardPage() {
  const criticalOpen = await getCriticalAlertsOpen();
  const criticalKpi = mapCriticalAlertsToKpi(criticalOpen);

  const transactions = await getTransactionsOverAmount();
  const transactionsChartData = mapTransactionsToChart(transactions);

  const alertsBySeverity = await getOpenAlertsBySeverity();
  const alertsBySeverityChartData =
    mapAlertsBySeverityToChart(alertsBySeverity);

  const alertsLast72h = await getOpenAlertsLast72h();
  const alertsLast72hKpi = mapOpenAlerts72hToKpi(alertsLast72h);

  const topEnterprises = await getEnterprisesWithMoreThan10Transactions();
  const topEnterprisesChartData = mapEnterprisesToChart(topEnterprises);

  const falsePositives = await getFalsePositivesLast30d();
  const falsePositivesKpi = mapFalsePositivesToKpi(falsePositives);

  const generatedVsResolved = await getGeneratedVsResolvedAlerts();
  const generatedVsResolvedChartData =
    mapGeneratedVsResolvedToChart(generatedVsResolved);

  const averageRiskScore = await getAverageRiskScoreOverTime();
  const averageRiskScoreChartData =
    mapAverageRiskScoreToChart(averageRiskScore);

  const totalVolume48h = await getTotalVolumeLast48h();
  const totalVolumeKpi = mapTotalVolumeToKpi(totalVolume48h);

  const firstActivity = await getEnterprisesFirstActivityThisMonth();
  const firstActivityKpi = mapFirstActivityToKpi(firstActivity);

  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="grid grid-cols-1 gap-6">
        <Card>Ola</Card>
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
            <Suspense fallback={<ChartSkeleton />}>
              <AlertsBySeverityChart data={alertsBySeverityChartData} />
            </Suspense>
          </Card>

          <Card title="Open alerts in the last 72 hours">
            <Suspense fallback={<ChartSkeleton />}>
              <KPI
                value={alertsLast72hKpi.value}
                change={alertsLast72hKpi.change}
                data={alertsLast72hKpi.data}
              />
            </Suspense>
          </Card>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <Card title="Transactions over $200,000 MXN in 1 week">
            <Suspense fallback={<ChartSkeleton />}>
              <LargeTransactionsChart data={transactionsChartData} />
            </Suspense>
          </Card>

          <Card title="Enterprises with more than 2 transactions (1 week)">
            <Suspense fallback={<ChartSkeleton />}>
              <TopEnterprisesChart data={topEnterprisesChartData} />
            </Suspense>
          </Card>

          <Card title="Total volume in the last 48 hours">
            <Suspense fallback={<ChartSkeleton />}>
              <KPI
                value={totalVolumeKpi.value}
                change={totalVolumeKpi.change}
                data={totalVolumeKpi.data}
                prefix="$"
              />
            </Suspense>
          </Card>

          <Card title="Enterprises with activity for the first time in this month">
            <Suspense fallback={<ChartSkeleton />}>
              <KPI
                value={firstActivityKpi.value}
                change={firstActivityKpi.change}
                data={firstActivityKpi.data}
              />
            </Suspense>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card title="False positives in the last 30 days">
            <Suspense fallback={<ChartSkeleton />}>
              <KPI
                value={falsePositivesKpi.value}
                change={falsePositivesKpi.change}
                data={falsePositivesKpi.data}
              />
            </Suspense>
          </Card>

          <Card title="Generated alerts vs resolved alerts">
            <Suspense fallback={<ChartSkeleton />}>
              <GeneratedVsResolvedChart data={generatedVsResolvedChartData} />
            </Suspense>
          </Card>

          <Card title="Average risk score over time">
            <Suspense fallback={<ChartSkeleton />}>
              <AverageRiskScoreChart data={averageRiskScoreChartData} />
            </Suspense>
          </Card>
        </div>
      </div>
    </div>
  );
}
