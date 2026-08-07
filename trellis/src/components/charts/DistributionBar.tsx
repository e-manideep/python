import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ScoreBand } from "../../types";
import { bandClasses } from "../../lib/scoreColor";

const BAND_ORDER: ScoreBand[] = ["Needs Attention", "Fair", "Good", "Excellent"];

export function DistributionBar({ counts, height = 200, compact = false }: { counts: Record<ScoreBand, number>; height?: number; compact?: boolean }) {
  const data = BAND_ORDER.map((band) => ({ band, count: counts[band] ?? 0 }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--color-ink-100)" />
        <XAxis dataKey="band" tick={compact ? false : { fontSize: 11, fill: "var(--color-ink-500)" }} axisLine={{ stroke: "var(--color-ink-200)" }} tickLine={false} />
        {!compact && <YAxis tick={{ fontSize: 11, fill: "var(--color-ink-400)" }} axisLine={false} tickLine={false} width={28} allowDecimals={false} />}
        <Tooltip
          formatter={(v) => [`${v} propert${Number(v) === 1 ? "y" : "ies"}`, ""]}
          contentStyle={{ borderRadius: 10, border: "1px solid var(--color-ink-100)", boxShadow: "0 8px 24px rgba(11,14,15,0.08)", fontSize: 13 }}
        />
        <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={64}>
          {data.map((d) => (
            <Cell key={d.band} fill={bandClasses(d.band).chart} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
