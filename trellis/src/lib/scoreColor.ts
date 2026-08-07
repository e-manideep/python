import type { ScoreBand } from "../types";

const MAP: Record<ScoreBand, { text: string; bg: string; ring: string; dot: string; chart: string }> = {
  Excellent: { text: "text-score-excellent", bg: "bg-score-excellent-bg", ring: "ring-score-excellent", dot: "bg-score-excellent", chart: "var(--color-score-excellent)" },
  Good: { text: "text-score-good", bg: "bg-score-good-bg", ring: "ring-score-good", dot: "bg-score-good", chart: "var(--color-score-good)" },
  Fair: { text: "text-score-fair", bg: "bg-score-fair-bg", ring: "ring-score-fair", dot: "bg-score-fair", chart: "var(--color-score-fair-chart)" },
  "Needs Attention": { text: "text-score-risk", bg: "bg-score-risk-bg", ring: "ring-score-risk", dot: "bg-score-risk", chart: "var(--color-score-risk)" },
};

export function bandClasses(band: ScoreBand) {
  return MAP[band];
}

export function bandDescription(band: ScoreBand): string {
  switch (band) {
    case "Excellent":
      return "Top-tier operating performance across all dimensions.";
    case "Good":
      return "Solid, healthy performance with room to optimize.";
    case "Fair":
      return "Underperforming in one or more dimensions — action recommended.";
    case "Needs Attention":
      return "Material issues detected — active intervention required.";
  }
}
