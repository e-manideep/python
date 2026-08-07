import type { ScoreBand } from "../types";
import { bandClasses } from "../lib/scoreColor";

export function ScoreDial({ composite, band, label = "Trellis Score" }: { composite: number; band: ScoreBand; label?: string }) {
  const c = bandClasses(band);
  const frac = Math.max(0, Math.min(1, (composite - 300) / 600));
  const r = 80;
  const arcLen = Math.PI * r;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 112" className="w-56">
        <path d="M20 100 A80 80 0 0 1 180 100" stroke="var(--color-ink-200)" strokeWidth="14" fill="none" strokeLinecap="round" />
        <path d="M20 100 A80 80 0 0 1 180 100" stroke={c.chart} strokeWidth="14" fill="none" strokeLinecap="round" strokeDasharray={`${frac * arcLen} ${arcLen}`} />
        <text x="100" y="82" textAnchor="middle" className="font-mono font-bold" style={{ fontSize: 34, fill: "var(--color-ink-950)" }}>
          {composite}
        </text>
      </svg>
      <div className={`-mt-1 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${c.bg} ${c.text}`}>
        <span className={`inline-block w-1.5 h-1.5 rounded-full ${c.dot}`} />
        {band}
      </div>
      <div className="mt-1.5 text-xs text-ink-500 tracking-wide uppercase">{label}</div>
      <div className="mt-0.5 flex justify-between w-56 text-[10px] text-ink-400 font-mono">
        <span>300</span>
        <span>900</span>
      </div>
    </div>
  );
}
