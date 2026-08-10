import { useMemo } from "react";
import { Link } from "react-router-dom";
import { dataset, PERSONAS } from "../lib/store";
import { builderAnalytics, builderPortfolioSummary, builderProjects } from "../lib/builderSelectors";
import { portfolioTrend } from "../lib/portfolioSelectors";
import { portfolioServicesOpportunity } from "../lib/propertyServices";
import { generateAllInsights } from "../lib/aiInsights";
import { formatINR, formatINRCompact, formatPct } from "../lib/format";
import { Card, Pill, SectionHeading, StatTile } from "../components/ui";
import { ScoreBadge } from "../components/ScoreBadge";
import { AreaTrendChart } from "../components/charts/AreaTrendChart";
import { InsightRow } from "../components/InsightRow";

export function Builder() {
  const persona = PERSONAS.find((p) => p.role === "builder")!;
  const developerName = persona.linkedId;

  const summary = useMemo(() => builderPortfolioSummary(dataset, developerName), [developerName]);
  const projects = useMemo(() => builderProjects(dataset, developerName), [developerName]);
  const analytics = useMemo(() => builderAnalytics(dataset, developerName), [developerName]);
  const propertyIds = useMemo(() => projects.map((p) => p.property.id), [projects]);
  const trend = useMemo(() => portfolioTrend(dataset, propertyIds), [propertyIds]);
  const services = useMemo(() => portfolioServicesOpportunity(dataset, propertyIds), [propertyIds]);
  const insights = useMemo(() => generateAllInsights(dataset).filter((i) => i.propertyId && propertyIds.includes(i.propertyId)).slice(0, 6), [propertyIds]);

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wide text-bronze-700">Builder / Developer Portal</div>
        <h1 className="font-display text-3xl text-ink-950 mt-1">{developerName} — Post-Handover Portfolio</h1>
        <p className="text-ink-500 text-sm mt-1">{persona.displayName} · {persona.subtitle}</p>
        <p className="text-ink-500 text-sm mt-3 max-w-2xl">
          Every unit your buyers handed to Trellis after possession, in one view — not individual maintenance tickets, but
          how the communities you built are actually performing for the owners who trusted you with their investment.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatTile label="Projects Operated" value={String(summary.projectCount)} sub={`${formatINRCompact(summary.totalUnits)} units total`} />
        <StatTile label="Occupancy" value={formatPct(summary.occupancyPct, 1)} sub={`${summary.vacantUnits} vacant of ${summary.totalUnits}`} />
        <StatTile label="Average Rent" value={formatINR(Math.round(summary.avgRent))} sub="Across occupied units" />
        <StatTile label="Blended Trellis Score" value={String(summary.avgTrellisScore)} sub={summary.avgResidentRating ? `${summary.avgResidentRating.toFixed(1)}/5 resident rating` : undefined} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-8">
        <Card>
          <SectionHeading title="Occupancy across your portfolio" description="Trailing 18 months, all operated projects combined." />
          <AreaTrendChart data={trend.map((t) => ({ month: t.month, label: t.label, value: t.occupancy }))} color="var(--color-ink-700)" valueFormatter={(v) => `${v.toFixed(0)}%`} domain={[50, 100]} />
        </Card>
        <Card>
          <SectionHeading title="Developer Intelligence" description="Where to focus, computed from operating data — not opinion." />
          <div className="space-y-3 text-sm">
            {analytics.highestVacancy && (
              <div className="flex items-center justify-between border-b border-ink-100 pb-2.5">
                <span className="text-ink-600">Highest vacancy</span>
                <Link to={`/property/${analytics.highestVacancy.property.id}`} className="font-semibold text-ink-900 hover:text-bronze-700">
                  {analytics.highestVacancy.property.name} ({formatPct((analytics.highestVacancy.vacantUnits / (analytics.highestVacancy.totalUnits || 1)) * 100, 0)})
                </Link>
              </div>
            )}
            {analytics.highestRent && (
              <div className="flex items-center justify-between border-b border-ink-100 pb-2.5">
                <span className="text-ink-600">Highest average rent</span>
                <Link to={`/property/${analytics.highestRent.property.id}`} className="font-semibold text-ink-900 hover:text-bronze-700">
                  {analytics.highestRent.property.name} ({formatINR(Math.round(analytics.highestRent.avgRent))})
                </Link>
              </div>
            )}
            {analytics.highestSatisfaction && (
              <div className="flex items-center justify-between border-b border-ink-100 pb-2.5">
                <span className="text-ink-600">Highest resident satisfaction</span>
                <Link to={`/property/${analytics.highestSatisfaction.property.id}`} className="font-semibold text-ink-900 hover:text-bronze-700">
                  {analytics.highestSatisfaction.property.name} ({analytics.highestSatisfaction.avgResidentRating?.toFixed(1)}/5)
                </Link>
              </div>
            )}
            {analytics.mostRecurringIssueCategory && (
              <div className="flex items-center justify-between">
                <span className="text-ink-600">Most recurring issue, portfolio-wide</span>
                <span className="font-semibold text-ink-900">
                  {analytics.mostRecurringIssueCategory.category} ({analytics.mostRecurringIssueCategory.count} tickets)
                </span>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card className="mb-8">
        <SectionHeading
          title="Unsold / investor-vacant unit opportunity"
          description="Furnished units achieve a real, sourced 20–30% rental premium over unfurnished — this is the make-ready service line applied to your own unsold or investor-vacant inventory."
        />
        <div className="grid sm:grid-cols-3 gap-4">
          <StatTile label="Vacant units" value={String(services.vacantUnits)} />
          <StatTile label="Monthly uplift potential" value={formatINRCompact(services.totalMonthlyUpliftPotential)} sub={`${formatINRCompact(services.totalMakeReadyCost)} est. make-ready spend`} />
          <StatTile label="Average payback" value={`${services.avgPaybackMonths.toFixed(0)} months`} />
        </div>
      </Card>

      <Card className="mb-8">
        <SectionHeading title="Signals across your portfolio" description="The highest-priority Trellis Intelligence items across your operated projects." />
        {insights.length === 0 ? (
          <p className="text-sm text-ink-400">No active signals right now.</p>
        ) : (
          <div className="divide-y divide-ink-100">{insights.map((i) => <InsightRow key={i.id} insight={i} />)}</div>
        )}
      </Card>

      <Card padded={false}>
        <div className="p-5 sm:p-6 pb-0">
          <SectionHeading title="Project view" description="Every community from this developer that Trellis operates post-handover." />
        </div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm min-w-[820px]">
            <thead>
              <tr className="text-left text-xs text-ink-500 uppercase tracking-wide border-y border-ink-100">
                <th className="py-2.5 px-5 sm:px-6 font-medium">Project</th>
                <th className="py-2.5 px-3 font-medium">City</th>
                <th className="py-2.5 px-3 font-medium">Units</th>
                <th className="py-2.5 px-3 font-medium">Occupancy</th>
                <th className="py-2.5 px-3 font-medium">Avg Rent</th>
                <th className="py-2.5 px-3 font-medium">Open Maintenance</th>
                <th className="py-2.5 px-3 font-medium">Trellis Score</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.property.id} className="border-b border-ink-100 last:border-0 hover:bg-ink-50/60">
                  <td className="py-3 px-5 sm:px-6">
                    <Link to={`/property/${p.property.id}`} className="font-semibold text-ink-900 hover:text-bronze-700">{p.property.name}</Link>
                    <div className="text-xs text-ink-400">{p.property.locality}</div>
                  </td>
                  <td className="py-3 px-3 text-ink-600">{dataset.cities.find((c) => c.id === p.property.cityId)?.name}</td>
                  <td className="py-3 px-3 font-mono text-ink-600">{p.totalUnits}</td>
                  <td className="py-3 px-3">
                    <Pill tone={p.occupancyPct >= 85 ? "good" : p.occupancyPct >= 70 ? "watch" : "risk"}>{formatPct(p.occupancyPct, 0)}</Pill>
                  </td>
                  <td className="py-3 px-3 font-mono text-ink-600">{p.avgRent ? formatINR(Math.round(p.avgRent)) : "—"}</td>
                  <td className="py-3 px-3 text-ink-600">{p.openMaintenance}</td>
                  <td className="py-3 px-3">
                    <ScoreBadge composite={p.trellisScore} band={p.trellisScore >= 770 ? "Excellent" : p.trellisScore >= 670 ? "Good" : p.trellisScore >= 580 ? "Fair" : "Needs Attention"} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
