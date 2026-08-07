import type { ScoreBand } from "../types";
import { bandClasses } from "../lib/scoreColor";

export function ScoreBadge({ composite, band, size = "md" }: { composite: number; band: ScoreBand; size?: "sm" | "md" | "lg" }) {
  const c = bandClasses(band);
  const sizing = size === "lg" ? "px-4 py-2 text-2xl gap-2" : size === "md" ? "px-3 py-1.5 text-base gap-1.5" : "px-2 py-1 text-xs gap-1";
  return (
    <span className={`inline-flex items-center rounded-full font-mono font-semibold ${c.bg} ${c.text} ${sizing}`}>
      <span className={`inline-block rounded-full ${size === "lg" ? "w-2.5 h-2.5" : "w-1.5 h-1.5"} ${c.dot}`} />
      {composite}
      <span className="font-sans font-medium opacity-80 text-[0.75em]">{band}</span>
    </span>
  );
}
