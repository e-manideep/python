import { useMemo, useState } from "react";
import { dataset } from "../lib/store";
import { generateAllInsights } from "../lib/aiInsights";
import { Card, Pill, SectionHeading } from "../components/ui";
import { InsightRow } from "../components/InsightRow";
import type { Insight } from "../types";

const CATEGORIES: Insight["category"][] = ["Rent Optimization", "Maintenance Risk", "Occupancy Forecast", "Vendor Performance", "Compliance"];

const METHOD_CARDS = [
  { title: "Rent Optimization", desc: "Compares every unit's current rent to a comp-based market benchmark for its locality and configuration. Flags units >8% under or over benchmark." },
  { title: "Maintenance Risk", desc: "Weighted score from open high-priority/overdue ticket density, category concentration (a signal of a recurring root cause), and building age." },
  { title: "Occupancy Forecast", desc: "Fits a linear trend to the trailing 6-month occupancy series per property and projects 3 months forward." },
  { title: "Vendor Performance", desc: "Ranks vendors within each category on 50% SLA compliance, 30% resident rating, 20% cost competitiveness vs. category average." },
  { title: "Compliance", desc: "Reads directly from each property's compliance register — RERA, fire safety, insurance, lease documentation, lift AMC." },
];

export function Insights() {
  const all = useMemo(() => generateAllInsights(dataset), []);
  const [category, setCategory] = useState<Insight["category"] | "all">("all");
  const [severity, setSeverity] = useState<Insight["severity"] | "all">("all");
  const [visibleCount, setVisibleCount] = useState(20);

  const filtered = all.filter((i) => (category === "all" || i.category === category) && (severity === "all" || i.severity === severity));
  const visible = filtered.slice(0, visibleCount);
  const counts = { action: all.filter((i) => i.severity === "action").length, watch: all.filter((i) => i.severity === "watch").length, info: all.filter((i) => i.severity === "info").length };

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wide text-bronze-700">Trellis Intelligence</div>
        <h1 className="font-display text-3xl text-ink-950 mt-1">A transparent recommendation engine, not a black box</h1>
        <p className="text-ink-500 mt-2 max-w-2xl">
          Every insight below is computed live from real operating data in this demo — rent rolls, work orders, compliance
          records, vendor performance. Each one shows exactly how it was derived.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <Card className="border-score-risk/20"><div className="text-xs font-medium text-ink-500 uppercase mb-1">Action needed</div><div className="font-display text-2xl text-score-risk">{counts.action}</div></Card>
        <Card><div className="text-xs font-medium text-ink-500 uppercase mb-1">Watch</div><div className="font-display text-2xl text-score-fair">{counts.watch}</div></Card>
        <Card><div className="text-xs font-medium text-ink-500 uppercase mb-1">Informational</div><div className="font-display text-2xl text-score-good">{counts.info}</div></Card>
      </div>

      <div className="grid sm:grid-cols-5 gap-3 mb-8">
        {METHOD_CARDS.map((m) => (
          <div key={m.title} className="rounded-xl border border-ink-100 bg-white p-3.5">
            <div className="text-xs font-semibold text-ink-900 mb-1">{m.title}</div>
            <p className="text-[11px] text-ink-500 leading-snug">{m.desc}</p>
          </div>
        ))}
      </div>

      <Card padded={false}>
        <div className="p-5 sm:p-6 pb-0 flex items-center justify-between flex-wrap gap-3">
          <SectionHeading title={`${filtered.length} insight${filtered.length === 1 ? "" : "s"}`} />
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as never);
                setVisibleCount(20);
              }}
              className="text-sm border border-ink-200 rounded-lg px-2.5 py-1.5 bg-white"
            >
              <option value="all">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <select
              value={severity}
              onChange={(e) => {
                setSeverity(e.target.value as never);
                setVisibleCount(20);
              }}
              className="text-sm border border-ink-200 rounded-lg px-2.5 py-1.5 bg-white"
            >
              <option value="all">All severities</option>
              <option value="action">Action needed</option>
              <option value="watch">Watch</option>
              <option value="info">Info</option>
            </select>
          </div>
        </div>
        <div className="px-5 sm:px-6 divide-y divide-ink-100">
          {visible.map((i) => <InsightRow key={i.id} insight={i} />)}
          {filtered.length === 0 && <div className="py-10 text-center text-ink-400 text-sm">No insights match these filters.</div>}
        </div>
        {visibleCount < filtered.length && (
          <div className="px-5 sm:px-6 py-4 border-t border-ink-100">
            <button onClick={() => setVisibleCount((c) => c + 20)} className="text-sm font-semibold text-bronze-700 hover:text-bronze-800">
              Show {Math.min(20, filtered.length - visibleCount)} more (of {filtered.length - visibleCount} remaining) →
            </button>
          </div>
        )}
        <div className="h-2" />
      </Card>

      <div className="mt-6 flex flex-wrap gap-2">
        {["Rent Optimization", "Maintenance Risk", "Occupancy Forecast", "Vendor Performance", "Compliance"].map((c) => <Pill key={c}>{c}</Pill>)}
      </div>
    </div>
  );
}
