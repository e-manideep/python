import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface Point {
  month: string;
  label: string;
  value: number;
}

export function AreaTrendChart({ data, color, valueFormatter, height = 220, domain }: { data: Point[]; color: string; valueFormatter: (v: number) => string; height?: number; domain?: [number, number] }) {
  const gradId = `grad-${color.replace(/[^a-zA-Z0-9]/g, "")}`;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--color-ink-100)" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-ink-400)" }} axisLine={{ stroke: "var(--color-ink-200)" }} tickLine={false} interval="preserveStartEnd" minTickGap={24} />
        <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-400)" }} axisLine={false} tickLine={false} width={44} domain={domain ?? ["auto", "auto"]} tickFormatter={valueFormatter} />
        <Tooltip
          formatter={(v) => valueFormatter(Number(v))}
          labelStyle={{ color: "var(--color-ink-500)", fontSize: 12, marginBottom: 2 }}
          contentStyle={{ borderRadius: 10, border: "1px solid var(--color-ink-100)", boxShadow: "0 8px 24px rgba(11,14,15,0.08)", fontSize: 13 }}
        />
        <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#${gradId})`} dot={{ r: 2.5, fill: color, strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
