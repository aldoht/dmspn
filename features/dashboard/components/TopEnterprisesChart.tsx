"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type TopEnterprisePoint = {
  label: string;
  count: number;
};

type TopEnterprisesChartProps = {
  data: TopEnterprisePoint[];
};

function truncateLabel(label: string, max = 12) {
  return label.length > max ? `${label.slice(0, max)}…` : label;
}

export function TopEnterprisesChart({ data }: TopEnterprisesChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid
            stroke="var(--color-border)"
            strokeDasharray="3 3"
            vertical={false}
          />

          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
            tickFormatter={(value) => truncateLabel(value)}
            interval={0}
            dy={8}
          />

          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{ fill: "var(--color-text-secondary)", fontSize: 12 }}
            width={36}
          />

          <Tooltip
            cursor={{ fill: "var(--color-border)", opacity: 0.3 }}
            contentStyle={{
              backgroundColor: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              color: "var(--color-text-primary)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            }}
            formatter={(value) => [
              `${value} transactions`,
            ]}
          />

          <Bar
            dataKey="count"
            fill="var(--color-brand)"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
