"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type LargeTransactionPoint = {
  label: string;
  count: number;
};

type LargeTransactionsChartProps = {
  data: LargeTransactionPoint[];
};

function formatCount(value: number) {
  return value.toLocaleString("es-MX");
}

export function LargeTransactionsChart({
  data,
}: LargeTransactionsChartProps) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{
            top: 8,
            right: 8,
            left: 0,
            bottom: 0,
          }}
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
            tick={{
              fill: "var(--color-text-secondary)",
              fontSize: 12,
            }}
            dy={8}
          />

          <YAxis
            allowDecimals={false}
            axisLine={false}
            tickLine={false}
            tick={{
              fill: "var(--color-text-secondary)",
              fontSize: 12,
            }}
            tickFormatter={formatCount}
            width={36}
          />

          <Tooltip
            cursor={{
              stroke: "var(--color-border)",
              strokeDasharray: "4 4",
            }}
            contentStyle={{
              backgroundColor: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              color: "var(--color-text-primary)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            }}
            formatter={(value) => [
              `${formatCount(Number(value))} transaction(s)`,
              "Count",
            ]}
          />

          <Line
            type="monotone"
            dataKey="count"
            stroke="var(--color-brand)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 5,
              strokeWidth: 2,
              stroke: "var(--color-surface)",
              fill: "var(--color-brand)",
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
