import { Card } from "@/components/ui/Card";
import { ChartSkeleton } from "@/components/ui/ChartSkeleton";
import { Suspense } from "react";
import {
  CriticalAlertsSection,
  AlertsBySeveritySection,
  OpenAlerts72hSection,
  LargeTransactionsSection,
  TopEnterprisesSection,
  TotalVolumeSection,
  FirstActivitySection,
  FalsePositivesSection,
  GeneratedVsResolvedSection,
  AverageRiskScoreSection,
} from "./DashboardSections";

export async function DashboardPage() {
  return (
    <div className="flex h-full flex-col gap-6 overflow-y-auto p-6">
      <div className="grid grid-cols-1 gap-6">
        <div className="grid grid-cols-3 gap-6">
          <Card title="Critical alerts open">
            <Suspense fallback={<ChartSkeleton />}>
              <CriticalAlertsSection />
            </Suspense>
          </Card>

          <Card title="Open alerts by class">
            <Suspense fallback={<ChartSkeleton />}>
              <AlertsBySeveritySection />
            </Suspense>
          </Card>

          <Card title="Open alerts in the last 72 hours">
            <Suspense fallback={<ChartSkeleton />}>
              <OpenAlerts72hSection />
            </Suspense>
          </Card>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <Card title="Transactions over $200,000 MXN in 1 week">
            <Suspense fallback={<ChartSkeleton />}>
              <LargeTransactionsSection />
            </Suspense>
          </Card>

          <Card title="Enterprises with more than 2 transactions (1 week)">
            <Suspense fallback={<ChartSkeleton />}>
              <TopEnterprisesSection />
            </Suspense>
          </Card>

          <Card title="Total volume in the last 48 hours">
            <Suspense fallback={<ChartSkeleton />}>
              <TotalVolumeSection />
            </Suspense>
          </Card>

          <Card title="Enterprises with activity for the first time this month">
            <Suspense fallback={<ChartSkeleton />}>
              <FirstActivitySection />
            </Suspense>
          </Card>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <Card title="False positives in the last 30 days">
            <Suspense fallback={<ChartSkeleton />}>
              <FalsePositivesSection />
            </Suspense>
          </Card>

          <Card title="Generated alerts vs resolved alerts">
            <Suspense fallback={<ChartSkeleton />}>
              <GeneratedVsResolvedSection />
            </Suspense>
          </Card>

          <Card title="Average risk score over time">
            <Suspense fallback={<ChartSkeleton />}>
              <AverageRiskScoreSection />
            </Suspense>
          </Card>
        </div>
      </div>
    </div>
  );
}
