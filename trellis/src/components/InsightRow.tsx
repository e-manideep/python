import { Link } from "react-router-dom";
import type { Insight } from "../types";
import { dataset } from "../lib/store";
import { Pill } from "./ui";

const SEVERITY_TONE: Record<Insight["severity"], "risk" | "watch" | "good"> = {
  action: "risk",
  watch: "watch",
  info: "good",
};

const SEVERITY_LABEL: Record<Insight["severity"], string> = {
  action: "Action needed",
  watch: "Watch",
  info: "Info",
};

export function InsightRow({ insight }: { insight: Insight }) {
  const property = insight.propertyId ? dataset.properties.find((p) => p.id === insight.propertyId) : null;
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Pill tone={SEVERITY_TONE[insight.severity]}>{SEVERITY_LABEL[insight.severity]}</Pill>
            <span className="text-xs text-ink-400">{insight.category}</span>
          </div>
          <div className="text-sm font-semibold text-ink-900">
            {property ? <Link to={`/property/${property.id}`} className="hover:text-bronze-700">{insight.title}</Link> : insight.title}
          </div>
          <p className="text-sm text-ink-500 mt-0.5 max-w-2xl">{insight.detail}</p>
          <p className="text-xs text-ink-400 mt-1.5 italic">Method: {insight.method}</p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-xs text-ink-400">{insight.metricLabel}</div>
          <div className="font-mono font-semibold text-ink-900">{insight.metricValue}</div>
        </div>
      </div>
    </div>
  );
}
