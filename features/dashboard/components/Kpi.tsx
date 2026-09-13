"use client";

import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";

function formatValue(value: number, prefix = "", suffix = "") {
  return `${prefix}${value.toLocaleString()}${suffix}`;
}

type KpiProps = {
  title?: string;
  metricLabel: string;
  value: number;
  change: number;
  data: {
    label: string;
    value: number;
  }[];
  prefix?: string;
  suffix?: string;
  description?: string;
};

export function KPI({
  title,
  metricLabel,
  value,
  change,
  data,
  prefix,
  suffix,
  description,
}: KpiProps) {
  const isPositive = change >= 0;

  return (
    <div className="w-full rounded-xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        {title && (
          <p className="text-sm font-medium text-text-secondary">{title}</p>
        )}

        <span
          className={[
            "rounded-full px-2 py-1 text-xs font-semibold",
            isPositive
              ? "bg-risk-resolved-bg text-risk-resolved"
              : "bg-risk-critical-bg text-risk-critical",
          ].join(" ")}
        >
          {isPositive ? "+" : ""}
          {change}%
        </span>
      </div>

      <div className="mt-2">
        <p className="text-3xl font-semibold tracking-tight text-text-primary">
          {formatValue(value, prefix, suffix)}
        </p>
      </div>

      <div className="mt-4 h-20">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{
              top: 4,
              right: 0,
              left: 0,
              bottom: 0,
            }}
          >
            <defs>
              <linearGradient
                id="kpi-area-gradient"
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
              labelStyle={{
                color: "var(--color-text-muted)",
                marginBottom: 4,
              }}
              itemStyle={{
                color: "var(--color-text-primary)",
              }}
              formatter={(chartValue) => [
                formatValue(Number(chartValue), prefix, suffix),
                metricLabel,
              ]}
            />

            <Area
              type="monotone"
              dataKey="value"
              stroke="var(--color-brand)"
              strokeWidth={2}
              fill="url(#kpi-area-gradient)"
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

      {description && (
        <p className="mt-2 text-xs text-text-muted">{description}</p>
      )}
    </div>
  );
}
