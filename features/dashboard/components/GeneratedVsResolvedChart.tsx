"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type GeneratedVsResolvedPoint = {
  label: string;
  generated: number;
  resolved: number;
};

type GeneratedVsResolvedChartProps = {
  data: GeneratedVsResolvedPoint[];
};

export function GeneratedVsResolvedChart({
  data,
}: GeneratedVsResolvedChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
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
            cursor={{ stroke: "var(--color-border)", strokeDasharray: "4 4" }}
            contentStyle={{
              backgroundColor: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              color: "var(--color-text-primary)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            }}
          />

          <Legend
            verticalAlign="top"
            height={24}
            iconType="circle"
            formatter={(value) => (
              <span
                style={{ color: "var(--color-text-secondary)", fontSize: 12 }}
              >
                {value}
              </span>
            )}
          />

          <Line
            type="monotone"
            dataKey="generated"
            name="Generated"
            stroke="var(--color-risk-critical)"
            strokeWidth={2.5}
            dot={false}
          />

          <Line
            type="monotone"
            dataKey="resolved"
            name="Resolved"
            stroke="var(--color-risk-resolved)"
            strokeWidth={2.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
