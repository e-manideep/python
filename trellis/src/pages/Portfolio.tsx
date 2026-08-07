import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { dataset, PERSONAS, useTrellisStore } from "../lib/store";
import { cityBreakdown, portfolioSnapshot, portfolioTrend, scoredProperties } from "../lib/portfolioSelectors";
import { formatINRCompact, formatNumber, formatPct } from "../lib/format";
import { Card, Pill, SectionHeading, StatTile } from "../components/ui";
import { ScoreBadge } from "../components/ScoreBadge";
import { AreaTrendChart } from "../components/charts/AreaTrendChart";
import { DistributionBar } from "../components/charts/DistributionBar";
import { generateAllInsights } from "../lib/aiInsights";
import { InsightRow } from "../components/InsightRow";

type SortKey = "score" | "name" | "occupancy" | "noiMargin";

export function Portfolio() {
  const selectedPersonaId = useTrellisStore((s) => s.selectedPersonaId);
  const persona = PERSONAS.find((p) => p.id === selectedPersonaId) ?? PERSONAS[0];
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [cityFilter, setCityFilter] = useState<string | "all">("all");

  const snap = portfolioSnapshot(dataset);
  const trend = portfolioTrend(dataset);
  const cities = cityBreakdown(dataset);
  const scored = scoredProperties(dataset);
  const insights = useMemo(() => generateAllInsights(dataset).slice(0, 5), []);

  const rows = useMemo(() => {
    let r = scored;
    if (cityFilter !== "all") r = r.filter(({ property }) => property.cityId === cityFilter);
    const sorted = [...r];
    if (sortKey === "score") sorted.sort((a, b) => a.score.composite - b.score.composite);
    if (sortKey === "name") sorted.sort((a, b) => a.property.name.localeCompare(b.property.name));
    if (sortKey === "occupancy") sorted.sort((a, b) => a.score.subScores[1].value0to100 - b.score.subScores[1].value0to100);
    if (sortKey === "noiMargin") sorted.sort((a, b) => a.score.subScores[0].value0to100 - b.score.subScores[0].value0to100);
    return sorted;
  }, [scored, sortKey, cityFilter]);

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-8">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-bronze-700">Owner / Investor Portfolio</div>
          <h1 className="font-display text-3xl text-ink-950 mt-1">Welcome back, {persona.displayName.split(" ")[0]}</h1>
          <p className="text-ink-500 text-sm mt-1">{persona.subtitle} · as of {new Date(dataset.months[dataset.months.length - 1] + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile label="Assets Under Operation" value={formatINRCompact(snap.aum)} sub={`${snap.propertyCount} properties · ${formatNumber(snap.unitCount)} units`} />
        <StatTile label="Portfolio NOI (this month)" value={formatINRCompact(snap.noi)} sub={`${formatPct(snap.noiMargin, 1)} NOI margin`} />
        <StatTile
          label="Occupancy"
          value={formatPct(snap.occupancyPct, 1)}
          trend={{ direction: snap.occupancyPctDelta >= 0 ? "up" : "down", label: `${snap.occupancyPctDelta >= 0 ? "+" : ""}${snap.occupancyPctDelta.toFixed(1)} pts / qtr`, positive: snap.occupancyPctDelta >= 0 }}
        />
        <StatTile label="Blended Trellis Score" value={String(snap.avgScore)} sub={snap.avgScoreBand} />
      </div>

      <div className="grid lg:grid-cols-3 gap-5 mb-8">
        <Card className="lg:col-span-2">
          <SectionHeading title="Net Operating Income" description="Trailing 18 months, portfolio-wide." />
          <AreaTrendChart data={trend.map((t) => ({ month: t.month, label: t.label, value: t.noi }))} color="var(--color-bronze-700)" valueFormatter={(v) => formatINRCompact(v, 0)} />
        </Card>
        <Card>
          <SectionHeading title="Score Distribution" />
          <DistributionBar counts={rows.reduce((acc, r) => ((acc[r.score.band] = (acc[r.score.band] ?? 0) + 1), acc), {} as Record<string, number>) as never} height={200} />
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-8">
        <Card>
          <SectionHeading title="Occupancy Trend" description="Portfolio-wide, trailing 18 months." />
          <AreaTrendChart data={trend.map((t) => ({ month: t.month, label: t.label, value: t.occupancy }))} color="var(--color-ink-700)" valueFormatter={(v) => `${v.toFixed(0)}%`} domain={[50, 100]} />
        </Card>
        <Card>
          <SectionHeading title="Rent Collection Efficiency" description="Portfolio-wide, trailing 18 months." />
          <AreaTrendChart data={trend.map((t) => ({ month: t.month, label: t.label, value: t.collectionEfficiencyPct }))} color="var(--color-score-good)" valueFormatter={(v) => `${v.toFixed(0)}%`} domain={[60, 100]} />
        </Card>
      </div>

      <Card className="mb-8">
        <SectionHeading title="City Breakdown" />
        <div className="grid sm:grid-cols-2 gap-4">
          {cities.map((c) => (
            <div key={c.cityId} className="rounded-xl border border-ink-100 p-4 flex items-center justify-between">
              <div>
                <div className="font-display text-lg text-ink-950">{c.name}</div>
                <div className="text-sm text-ink-500">{c.propertyCount} properties · {formatNumber(c.unitCount)} units</div>
                <div className="text-sm text-ink-500 mt-1">{formatINRCompact(c.aum)} AUM · {formatPct(c.occupancyPct, 0)} occupied</div>
              </div>
              <ScoreBadge composite={c.avgScore} band={c.avgScore >= 770 ? "Excellent" : c.avgScore >= 670 ? "Good" : c.avgScore >= 580 ? "Fair" : "Needs Attention"} />
            </div>
          ))}
        </div>
      </Card>

      <Card className="mb-8">
        <SectionHeading
          title="Trellis Intelligence — top signals"
          description="The highest-priority items across the portfolio right now."
          action={<Link to="/insights" className="text-sm font-semibold text-bronze-700 hover:text-bronze-800">View all →</Link>}
        />
        <div className="divide-y divide-ink-100">
          {insights.map((i) => (
            <InsightRow key={i.id} insight={i} />
          ))}
        </div>
      </Card>

      <Card padded={false}>
        <div className="p-5 sm:p-6 pb-0 flex items-center justify-between flex-wrap gap-3">
          <SectionHeading title="All properties" description="Sorted worst-first by default so what needs attention surfaces immediately." />
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className="text-sm border border-ink-200 rounded-lg px-2.5 py-1.5 text-ink-700 bg-white">
              <option value="all">All cities</option>
              {dataset.cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="text-sm border border-ink-200 rounded-lg px-2.5 py-1.5 text-ink-700 bg-white">
              <option value="score">Sort: Score (worst first)</option>
              <option value="name">Sort: Name</option>
              <option value="occupancy">Sort: Occupancy sub-score</option>
              <option value="noiMargin">Sort: Financial sub-score</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm min-w-[720px]">
            <thead>
              <tr className="text-left text-xs text-ink-500 uppercase tracking-wide border-y border-ink-100">
                <th className="py-2.5 px-5 sm:px-6 font-medium">Property</th>
                <th className="py-2.5 px-3 font-medium">Locality</th>
                <th className="py-2.5 px-3 font-medium">Type</th>
                <th className="py-2.5 px-3 font-medium">Units</th>
                <th className="py-2.5 px-3 font-medium">Trellis Score</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ property, score }) => (
                <tr key={property.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                  <td className="py-3 px-5 sm:px-6">
                    <Link to={`/property/${property.id}`} className="font-semibold text-ink-900 hover:text-bronze-700">{property.name}</Link>
                  </td>
                  <td className="py-3 px-3 text-ink-600">{property.locality}, {dataset.cities.find((c) => c.id === property.cityId)?.name}</td>
                  <td className="py-3 px-3"><Pill>{property.type}</Pill></td>
                  <td className="py-3 px-3 text-ink-600 font-mono">{property.totalUnits}</td>
                  <td className="py-3 px-3"><ScoreBadge composite={score.composite} band={score.band} size="sm" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
