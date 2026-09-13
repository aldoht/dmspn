"use client";

import { useTheme } from "next-themes";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Props = {
  data: { periodo: string; score: number }[];
};

const COLORS = {
  light: {
    grid: "#DDE1DE",
    text: "#7C8A88",
    line: "#8E1F1F",
    tooltipBg: "#FFFFFF",
    tooltipBorder: "#DDE1DE",
  },
  dark: {
    grid: "#2A3538",
    text: "#6E7A78",
    line: "#E5484D",
    tooltipBg: "#151C1F",
    tooltipBorder: "#2A3538",
  },
};

export function ScoreRiesgoChart({ data }: Props) {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === "dark" ? COLORS.dark : COLORS.light;

  if (data.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No score history for this enterprise: risk calculation pipeline has not
        been run on this enterprise.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="periodo" tick={{ fontSize: 11, fill: c.text }} />
        <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: c.text }} />
        <Tooltip
          contentStyle={{
            backgroundColor: c.tooltipBg,
            border: `1px solid ${c.tooltipBorder}`,
            borderRadius: 6,
            fontSize: 12,
          }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke={c.line}
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
