import { PolarAngleAxis, PolarGrid, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { SubScore } from "../../types";

export function ScoreRadar({ subScores, color, height = 260 }: { subScores: SubScore[]; color: string; height?: number }) {
  const data = subScores.map((s) => ({ subject: s.label.replace(" Performance", "").replace(" Health", "").replace(" & Condition", "").replace("Resident ", ""), value: Math.round(s.value0to100) }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--color-ink-200)" />
        <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11, fill: "var(--color-ink-600)" }} />
        <Radar dataKey="value" stroke={color} fill={color} fillOpacity={0.22} strokeWidth={2} />
      </RadarChart>
    </ResponsiveContainer>
  );
}
