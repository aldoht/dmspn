"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export type AlertsBySeverityPoint = {
  name: string;
  value: number;
  color: string;
};

type AlertsBySeverityChartProps = {
  data: AlertsBySeverityPoint[];
};

export function AlertsBySeverityChart({ data }: AlertsBySeverityChartProps) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={entry.color}
                stroke="var(--color-surface)"
              />
            ))}
          </Pie>

          <Tooltip
            contentStyle={{
              backgroundColor: "var(--color-surface-raised)",
              border: "1px solid var(--color-border)",
              borderRadius: "8px",
              color: "var(--color-text-primary)",
              boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
            }}
            formatter={(value, name) => [`${value} alert(s)`, name]}
          />

          <Legend
            verticalAlign="bottom"
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
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
