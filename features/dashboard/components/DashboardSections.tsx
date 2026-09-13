import { KPI } from "./Kpi";
import { AlertsBySeverityChart } from "./AlertsBySeverityChart";
import { TopEnterprisesChart } from "./TopEnterprisesChart";
import { GeneratedVsResolvedChart } from "./GeneratedVsResolvedChart";
import { AverageRiskScoreChart } from "./AverageRiskScoreChart";
import { LargeTransactionsChart } from "./LargeTransactionsChart";
import {
  getCriticalAlertsOpen,
  getCriticalAlertsOpenCountAsOf,
  mapCriticalAlertsToKpi,
  getTransactionsOverAmount,
  mapTransactionsToChart,
  getOpenAlertsBySeverity,
  mapAlertsBySeverityToChart,
  getOpenAlertsLast72h,
  getOpenAlertsPreviousWindowCount,
  mapOpenAlerts72hToKpi,
  getEnterprisesWithMoreThan10Transactions,
  mapEnterprisesToChart,
  getFalsePositivesLast30d,
  getFalsePositivesPreviousWindowCount,
  mapFalsePositivesToKpi,
  getGeneratedVsResolvedAlerts,
  mapGeneratedVsResolvedToChart,
  getAverageRiskScoreOverTime,
  mapAverageRiskScoreToChart,
  getTotalVolumeLast48h,
  getTotalVolumePreviousWindow,
  mapTotalVolumeToKpi,
  getEnterprisesFirstActivityThisMonth,
  getEnterprisesFirstActivityPreviousMonthCount,
  mapFirstActivityToKpi,
} from "../queries";

export async function CriticalAlertsSection() {
  const [alerts, previousCount] = await Promise.all([
    getCriticalAlertsOpen(),
    getCriticalAlertsOpenCountAsOf(24),
  ]);
  const kpi = mapCriticalAlertsToKpi(alerts, previousCount);
  return (
    <KPI
      metricLabel="Critical alerts"
      value={kpi.value}
      change={kpi.change}
      data={kpi.data}
      description="vs. 24 hours ago"
    />
  );
}

export async function AlertsBySeveritySection() {
  const rows = await getOpenAlertsBySeverity();
  return <AlertsBySeverityChart data={mapAlertsBySeverityToChart(rows)} />;
}

export async function OpenAlerts72hSection() {
  const [alerts, previousCount] = await Promise.all([
    getOpenAlertsLast72h(),
    getOpenAlertsPreviousWindowCount(72),
  ]);
  const kpi = mapOpenAlerts72hToKpi(alerts, previousCount);
  return (
    <KPI
      metricLabel="Open alerts"
      value={kpi.value}
      change={kpi.change}
      data={kpi.data}
      description="vs. previous 72 hours"
    />
  );
}

export async function LargeTransactionsSection() {
  const transactions = await getTransactionsOverAmount();
  return <LargeTransactionsChart data={mapTransactionsToChart(transactions)} />;
}

export async function TopEnterprisesSection() {
  const rows = await getEnterprisesWithMoreThan10Transactions();
  return <TopEnterprisesChart data={mapEnterprisesToChart(rows)} />;
}

export async function TotalVolumeSection() {
  const [rows, previousTotal] = await Promise.all([
    getTotalVolumeLast48h(),
    getTotalVolumePreviousWindow(48),
  ]);
  const kpi = mapTotalVolumeToKpi(rows, previousTotal);
  return (
    <KPI
      metricLabel="Total volume"
      value={kpi.value}
      change={kpi.change}
      data={kpi.data}
      prefix="$"
      description="vs. previous 48 hours"
    />
  );
}

export async function FirstActivitySection() {
  const [rows, previousCount] = await Promise.all([
    getEnterprisesFirstActivityThisMonth(),
    getEnterprisesFirstActivityPreviousMonthCount(),
  ]);
  const kpi = mapFirstActivityToKpi(rows, previousCount);
  return (
    <KPI
      metricLabel="New enterprises"
      value={kpi.value}
      change={kpi.change}
      data={kpi.data}
      description="vs. previous month"
    />
  );
}

export async function FalsePositivesSection() {
  const [rows, previousCount] = await Promise.all([
    getFalsePositivesLast30d(),
    getFalsePositivesPreviousWindowCount(30),
  ]);
  const kpi = mapFalsePositivesToKpi(rows, previousCount);
  return (
    <KPI
      metricLabel="False positives"
      value={kpi.value}
      change={kpi.change}
      data={kpi.data}
      description="vs. previous 30 days"
    />
  );
}

export async function GeneratedVsResolvedSection() {
  const rows = await getGeneratedVsResolvedAlerts();
  return (
    <GeneratedVsResolvedChart data={mapGeneratedVsResolvedToChart(rows)} />
  );
}

export async function AverageRiskScoreSection() {
  const rows = await getAverageRiskScoreOverTime();
  return <AverageRiskScoreChart data={mapAverageRiskScoreToChart(rows)} />;
}
