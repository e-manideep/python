import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { dataset, PERSONAS } from "../lib/store";
import { cityBreakdown, portfolioSnapshot, portfolioTrend, scoredProperties } from "../lib/portfolioSelectors";
import { formatINRCompact, formatNumber, formatPct } from "../lib/format";
import { Card, Pill, SectionHeading, StatTile } from "../components/ui";
import { ScoreBadge } from "../components/ScoreBadge";
import { AreaTrendChart } from "../components/charts/AreaTrendChart";
import { DistributionBar } from "../components/charts/DistributionBar";
import { SimpleBarChart } from "../components/charts/SimpleBarChart";
import { generateAllInsights } from "../lib/aiInsights";
import { InsightRow } from "../components/InsightRow";
import { leaseExpirationLadder } from "../lib/leaseRenewal";
import { portfolioCapexForecast } from "../lib/capitalPlanning";
import { portfolioSustainability } from "../lib/sustainability";
import { t12Statement } from "../lib/financialStatements";
import { T12StatementView } from "../components/T12StatementView";

type SortKey = "score" | "name" | "occupancy" | "noiMargin";

export function Portfolio() {
  const persona = PERSONAS.find((p) => p.role === "investor")!;
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [cityFilter, setCityFilter] = useState<string | "all">("all");

  const snap = portfolioSnapshot(dataset);
  const trend = portfolioTrend(dataset);
  const cities = cityBreakdown(dataset);
  const scored = scoredProperties(dataset);
  const insights = useMemo(() => generateAllInsights(dataset).slice(0, 5), []);
  const ladder = useMemo(() => leaseExpirationLadder(dataset), []);
  const maxConcentration = useMemo(() => {
    const totalLeases = dataset.leases.filter((l) => l.status !== "Ended").length;
    return Math.max(...ladder.map((m) => (totalLeases ? (m.leaseCount / totalLeases) * 100 : 0)));
  }, [ladder]);
  const capexForecast = useMemo(() => portfolioCapexForecast(dataset), []);
  const total5yrCapex = useMemo(() => capexForecast.reduce((s, y) => s + y.totalCost, 0), [capexForecast]);
  const sustainability = useMemo(() => portfolioSustainability(dataset), []);
  const portfolioT12 = useMemo(() => t12Statement(dataset), []);

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

      <div className="grid lg:grid-cols-3 gap-5 mb-8">
        <Card className="lg:col-span-2">
          <SectionHeading title="Lease Expiration Ladder" description="Active leases expiring over the next 12 months, portfolio-wide." />
          <SimpleBarChart
            data={ladder.map((m) => ({ label: m.label, value: m.leaseCount, tooltip: `${m.leaseCount} leases · ${formatINRCompact(m.revenueAtRisk)}/mo · ${m.avgRenewalProbability.toFixed(0)}% avg renewal probability` }))}
            color="var(--color-ink-700)"
            valueFormatter={(v) => v.toFixed(0)}
          />
          <p className="text-xs text-ink-500 mt-3">
            Peak month concentration: <span className="font-mono font-semibold text-ink-800">{maxConcentration.toFixed(1)}%</span> of the active lease book —{" "}
            {maxConcentration > 12 ? "above the 12% risk threshold, worth staggering future terms." : "comfortably within the 12% risk threshold."}
          </p>
        </Card>
        <Card>
          <SectionHeading title="5-Year Capital Plan" description="Estimated major system replacement cost, portfolio-wide." />
          <SimpleBarChart data={capexForecast.map((y) => ({ label: String(y.year), value: y.totalCost, tooltip: `${formatINRCompact(y.totalCost)} · ${y.items.length} item(s)` }))} color="var(--color-bronze-600)" valueFormatter={(v) => formatINRCompact(v, 0)} height={220} />
          <p className="text-xs text-ink-500 mt-3">
            {formatINRCompact(total5yrCapex)} in projected capital needs over the next 5 years across the portfolio.
          </p>
        </Card>
      </div>

      <Card className="mb-8">
        <SectionHeading title="Sustainability" description="Trellis Sustainability Index — kept separate from the operating score, mirroring how institutional ESG reporting works." />
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatTile label="Portfolio Index" value={`${sustainability.avgScore} / 100`} />
          <StatTile label="Est. Carbon Footprint" value={`${formatNumber(sustainability.totalCarbonTonnes)} tCO2e/yr`} sub="Common-area electricity, engineering estimate" />
          <StatTile label="Green Certified" value={formatPct(sustainability.certifiedPct, 0)} sub="IGBC Certified or better" />
          {sustainability.byCity.map((c) => (
            <StatTile key={c.city.id} label={`${c.city.name} Index`} value={`${c.avgScore} / 100`} sub={`${formatNumber(c.carbonTonnes)} tCO2e/yr`} />
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

      <Card className="mt-8">
        <SectionHeading title="Portfolio Operating Statement" description="Trailing 12 months, all properties combined. Each property also has its own full statement and Rent Roll on its detail page." />
        <T12StatementView statement={portfolioT12} title="Portfolio" filename="trellis-portfolio-t12.csv" />
      </Card>
    </div>
  );
}
