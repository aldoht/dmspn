"use client";

import { useTheme } from "next-themes";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

type Props = {
  data: { fecha: string; numTransacciones: number; montoTotal: number }[];
};

const COLORS = {
  light: {
    grid: "#DDE1DE",
    text: "#7C8A88",
    bar: "#0F3D3E",
    tooltipBg: "#FFFFFF",
    tooltipBorder: "#DDE1DE",
  },
  dark: {
    grid: "#2A3538",
    text: "#6E7A78",
    bar: "#2FA79A",
    tooltipBg: "#151C1F",
    tooltipBorder: "#2A3538",
  },
};

export function VolumenTransaccionesChart({ data }: Props) {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === "dark" ? COLORS.dark : COLORS.light;

  if (data.length === 0) {
    return (
      <p className="text-sm text-text-muted">
        No registered transactions in the established period.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke={c.grid} vertical={false} />
        <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: c.text }} />
        <YAxis tick={{ fontSize: 11, fill: c.text }} />
        <Tooltip
          contentStyle={{
            backgroundColor: c.tooltipBg,
            border: `1px solid ${c.tooltipBorder}`,
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value: number, name: string) =>
            name === "montoTotal"
              ? [`$${value.toLocaleString()}`, "Monto"]
              : [value, "Transacciones"]
          }
        />
        <Bar dataKey="numTransacciones" fill={c.bar} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
