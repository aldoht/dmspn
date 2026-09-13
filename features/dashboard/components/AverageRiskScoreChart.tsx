"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type AverageRiskScorePoint = {
  label: string;
  score: number;
};

type AverageRiskScoreChartProps = {
  data: AverageRiskScorePoint[];
};

export function AverageRiskScoreChart({ data }: AverageRiskScoreChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient
              id="risk-score-gradient"
              x1="0"
              y1="0"
              x2="0"
              y2="1"
            >
              <stop
                offset="0%"
                stopColor="var(--color-brand)"
                stopOpacity={0.22}
              />
              <stop
                offset="100%"
                stopColor="var(--color-brand)"
                stopOpacity={0}
              />
            </linearGradient>
          </defs>

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
            formatter={(value) => [Number(value).toFixed(2), "Avg. score"]}
          />

          <Area
            type="monotone"
            dataKey="score"
            stroke="var(--color-brand)"
            strokeWidth={2}
            fill="url(#risk-score-gradient)"
            dot={false}
            activeDot={{
              r: 4,
              fill: "var(--color-brand)",
              stroke: "var(--color-surface)",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
