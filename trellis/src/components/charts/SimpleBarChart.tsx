import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  label: string;
  value: number;
  tooltip?: string;
}

export function SimpleBarChart({ data, color, valueFormatter, height = 220 }: { data: Point[]; color: string; valueFormatter: (v: number) => string; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-ink-100)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-ink-400)" }} axisLine={{ stroke: "var(--color-ink-200)" }} tickLine={false} interval="preserveStartEnd" minTickGap={16} />
        <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-400)" }} axisLine={false} tickLine={false} width={44} tickFormatter={valueFormatter} />
        <Tooltip
          formatter={(v, _n, item) => [item?.payload?.tooltip ?? valueFormatter(Number(v)), ""]}
          labelStyle={{ color: "var(--color-ink-500)", fontSize: 12, marginBottom: 2 }}
          contentStyle={{ borderRadius: 10, border: "1px solid var(--color-ink-100)", boxShadow: "0 8px 24px rgba(11,14,15,0.08)", fontSize: 13 }}
        />
        <Bar dataKey="value" fill={color} radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
