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
  data: { nombre: string; monto: number }[];
};

const COLORS = {
  light: {
    grid: "#DDE1DE",
    text: "#7C8A88",
    bar: "#5B4B8A",
    tooltipBg: "#FFFFFF",
    tooltipBorder: "#DDE1DE",
  },
  dark: {
    grid: "#2A3538",
    text: "#6E7A78",
    bar: "#8D7BC7",
    tooltipBg: "#151C1F",
    tooltipBorder: "#2A3538",
  },
};

export function TopContrapartesChart({ data }: Props) {
  const { resolvedTheme } = useTheme();
  const c = resolvedTheme === "dark" ? COLORS.dark : COLORS.light;

  if (data.length === 0) {
    return (
      <p className="text-sm text-text-muted">No registered counterparts.</p>
    );
  }

  const dataConLabel = data.map((d) => ({
    ...d,
    labelCorto: d.nombre.length > 24 ? `${d.nombre.slice(0, 22)}…` : d.nombre,
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={dataConLabel} layout="vertical" margin={{ left: 20 }}>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke={c.grid}
          horizontal={false}
        />
        <XAxis type="number" tick={{ fontSize: 11, fill: c.text }} />
        <YAxis
          type="category"
          dataKey="labelCorto"
          width={140}
          tick={{ fontSize: 11, fill: c.text }}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: c.tooltipBg,
            border: `1px solid ${c.tooltipBorder}`,
            borderRadius: 6,
            fontSize: 12,
          }}
          formatter={(value: number) => [`$${value.toLocaleString()}`, "Monto"]}
        />
        <Bar dataKey="monto" fill={c.bar} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
