import { Link, useParams } from "react-router-dom";
import { dataset } from "../lib/store";
import { computeScoreHistory, computeTrellisScore } from "../lib/trellisScore";
import { assetValue, trailingFinancials } from "../lib/financials";
import { insightsForProperty } from "../lib/aiInsights";
import { formatDate, formatINRCompact, formatPct } from "../lib/format";
import { monthLabel } from "../lib/dates";
import { Card, EmptyState, Pill, SectionHeading, StatTile } from "../components/ui";
import { ScoreDial } from "../components/ScoreDial";
import { ScoreBadge } from "../components/ScoreBadge";
import { ScoreRadar } from "../components/charts/ScoreRadar";
import { AreaTrendChart } from "../components/charts/AreaTrendChart";
import { InsightRow } from "../components/InsightRow";
import { bandClasses } from "../lib/scoreColor";

const WO_STATUS_TONE: Record<string, "risk" | "watch" | "good" | "neutral"> = {
  Open: "watch",
  Assigned: "neutral",
  "In Progress": "neutral",
  Completed: "good",
  Overdue: "risk",
};

export function PropertyDetail() {
  const { id } = useParams();
  const property = dataset.properties.find((p) => p.id === id);

  if (!property) {
    return (
      <div className="max-w-3xl mx-auto px-5 py-16">
        <EmptyState title="Property not found" description="This property doesn't exist in the current demo dataset." />
        <div className="text-center"><Link to="/portfolio" className="text-bronze-700 font-semibold text-sm">← Back to portfolio</Link></div>
      </div>
    );
  }

  const lastMonth = dataset.months[dataset.months.length - 1];
  const score = computeTrellisScore(dataset, property.id, lastMonth);
  const history = computeScoreHistory(dataset, property.id);
  const finTrend = trailingFinancials(dataset, property.id, dataset.months);
  const units = dataset.units.filter((u) => u.propertyId === property.id);
  const workOrders = dataset.workOrders
    .filter((w) => w.propertyId === property.id)
    .sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1))
    .slice(0, 12);
  const city = dataset.cities.find((c) => c.id === property.cityId);
  const owner = dataset.owners.find((o) => o.id === property.ownerId);
  const insights = insightsForProperty(dataset, property.id);
  const propertyVendorIds = new Set(dataset.workOrders.filter((w) => w.propertyId === property.id && w.vendorId).map((w) => w.vendorId));
  const vendors = dataset.vendors.filter((v) => propertyVendorIds.has(v.id));
  const posts = dataset.communityPosts.filter((p) => p.propertyId === property.id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 4);
  const c = bandClasses(score.band);
  const av = assetValue(dataset, property.id);
  const lastFin = finTrend[finTrend.length - 1];

  return (
    <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
      <Link to="/portfolio" className="text-sm text-ink-500 hover:text-ink-800">← Portfolio</Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mt-3 mb-8">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-3xl text-ink-950">{property.name}</h1>
            <Pill>{property.type}</Pill>
          </div>
          <p className="text-ink-500 mt-1">{property.locality}, {city?.name} · Built {property.yearBuilt} · {property.developer}</p>
          <p className="text-ink-500 text-sm mt-1">Owner: {owner?.name} ({owner?.type}) · RERA {property.reraNumber}</p>
        </div>
        <ScoreBadge composite={score.composite} band={score.band} size="lg" />
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-5 mb-8">
        <Card className="flex flex-col items-center justify-center">
          <ScoreDial composite={score.composite} band={score.band} />
        </Card>
        <Card>
          <SectionHeading title="Score breakdown" description={`Weighted composite as of ${monthLabel(lastMonth)}. Each dimension is computed from live operating data — nothing here is estimated.`} />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {score.subScores.map((s) => (
                <div key={s.key}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-ink-800">{s.label} <span className="text-ink-400 font-normal">({(s.weight * 100).toFixed(0)}%)</span></span>
                    <span className="font-mono text-ink-600">{s.value0to100.toFixed(0)}/100</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-ink-100 overflow-hidden">
                    <div className={`h-full rounded-full ${c.dot}`} style={{ width: `${s.value0to100}%` }} />
                  </div>
                  <p className="text-xs text-ink-500 mt-1">{s.summary}</p>
                </div>
              ))}
            </div>
            <ScoreRadar subScores={score.subScores} color={c.chart} />
          </div>
        </Card>
      </div>

      <Card className="mb-8">
        <SectionHeading title="Score history" description="18-month trend — the composite score responds to real changes in operations, not noise." />
        <AreaTrendChart data={history.map((h) => ({ month: h.month, label: monthLabel(h.month), value: h.composite }))} color={c.chart} valueFormatter={(v) => v.toFixed(0)} domain={[300, 900]} />
      </Card>

      {insights.length > 0 && (
        <Card className="mb-8">
          <SectionHeading title="Trellis Intelligence on this property" description="Explainable recommendations, generated from this property's real data." />
          <div className="divide-y divide-ink-100">
            {insights.map((i) => <InsightRow key={i.id} insight={i} />)}
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <StatTile label="Asset Value" value={formatINRCompact(av)} sub={`${units.length} units`} />
        <StatTile label="Monthly NOI" value={formatINRCompact(lastFin.noi)} sub={`${formatPct(lastFin.noiMargin, 1)} margin`} />
        <StatTile label="Net Yield" value={formatPct(lastFin.yieldPct, 2)} sub={`${formatPct(lastFin.collectionEfficiencyPct, 0)} collection efficiency`} />
      </div>

      <Card className="mb-8">
        <SectionHeading title="NOI trend" description="Trailing 18 months for this property." />
        <AreaTrendChart data={finTrend.map((f) => ({ month: f.month, label: monthLabel(f.month), value: f.noi }))} color="var(--color-bronze-700)" valueFormatter={(v) => formatINRCompact(v, 0)} />
      </Card>

      <Card padded={false} className="mb-8">
        <div className="p-5 sm:p-6 pb-0"><SectionHeading title={`Units (${units.length})`} description="Current rent vs. the comp-based market benchmark for this locality and configuration." /></div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-ink-500 uppercase tracking-wide border-y border-ink-100">
                <th className="py-2.5 px-5 sm:px-6 font-medium">Unit</th>
                <th className="py-2.5 px-3 font-medium">Config</th>
                <th className="py-2.5 px-3 font-medium">Area</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium">Current Rent</th>
                <th className="py-2.5 px-3 font-medium">Market Benchmark</th>
              </tr>
            </thead>
            <tbody>
              {units.slice(0, 20).map((u) => {
                const delta = u.currentRent - u.marketRent;
                const deltaPct = (delta / u.marketRent) * 100;
                return (
                  <tr key={u.id} className="border-b border-ink-100 last:border-0">
                    <td className="py-2.5 px-5 sm:px-6 font-medium text-ink-900">{u.unitNumber}</td>
                    <td className="py-2.5 px-3 text-ink-600">{u.config}</td>
                    <td className="py-2.5 px-3 text-ink-600 font-mono">{u.areaSqft} sqft</td>
                    <td className="py-2.5 px-3"><Pill tone={u.status === "Occupied" ? "good" : u.status === "Vacant" ? "risk" : "watch"}>{u.status}</Pill></td>
                    <td className="py-2.5 px-3 font-mono text-ink-800">₹{u.currentRent.toLocaleString("en-IN")}</td>
                    <td className="py-2.5 px-3 font-mono text-ink-500">
                      ₹{u.marketRent.toLocaleString("en-IN")} {Math.abs(deltaPct) > 5 && <span className={deltaPct < 0 ? "text-score-risk" : "text-score-good"}>({deltaPct > 0 ? "+" : ""}{deltaPct.toFixed(0)}%)</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {units.length > 20 && <div className="text-center text-xs text-ink-400 py-3">Showing 20 of {units.length} units.</div>}
        </div>
      </Card>

      <Card padded={false} className="mb-8">
        <div className="p-5 sm:p-6 pb-0"><SectionHeading title="Recent maintenance activity" /></div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-ink-500 uppercase tracking-wide border-y border-ink-100">
                <th className="py-2.5 px-5 sm:px-6 font-medium">Category</th>
                <th className="py-2.5 px-3 font-medium">Description</th>
                <th className="py-2.5 px-3 font-medium">Priority</th>
                <th className="py-2.5 px-3 font-medium">Status</th>
                <th className="py-2.5 px-3 font-medium">Raised</th>
              </tr>
            </thead>
            <tbody>
              {workOrders.map((w) => (
                <tr key={w.id} className="border-b border-ink-100 last:border-0">
                  <td className="py-2.5 px-5 sm:px-6 text-ink-800">{w.category}</td>
                  <td className="py-2.5 px-3 text-ink-600">{w.description}</td>
                  <td className="py-2.5 px-3"><Pill tone={w.priority === "Critical" || w.priority === "High" ? "risk" : "neutral"}>{w.priority}</Pill></td>
                  <td className="py-2.5 px-3"><Pill tone={WO_STATUS_TONE[w.status]}>{w.status}</Pill></td>
                  <td className="py-2.5 px-3 text-ink-500">{formatDate(w.createdDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-5 mb-8">
        <Card>
          <SectionHeading title="Vendors active on this property" />
          {vendors.length === 0 ? (
            <EmptyState title="No vendor activity yet" />
          ) : (
            <div className="space-y-3">
              {vendors.map((v) => (
                <div key={v.id} className="flex items-center justify-between text-sm border-b border-ink-100 pb-3 last:border-0 last:pb-0">
                  <div>
                    <div className="font-semibold text-ink-900">{v.name}</div>
                    <div className="text-ink-500 text-xs">{v.categories.join(", ")}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-ink-800">{v.avgRating.toFixed(1)}★</div>
                    <div className="text-xs text-ink-500">{v.slaCompliancePct.toFixed(0)}% SLA</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card>
          <SectionHeading title="Compliance" />
          <div className="space-y-2.5">
            {property.compliance.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <span className="text-ink-700">{item.type}</span>
                <Pill tone={item.status === "Valid" ? "good" : item.status === "Expiring Soon" ? "watch" : "risk"}>{item.status} · {formatDate(item.expiryDate)}</Pill>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHeading title="Community feed" description="Recent notices and events for residents at this property." />
        {posts.length === 0 ? (
          <EmptyState title="No recent posts" />
        ) : (
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="border-b border-ink-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <Pill>{post.category}</Pill>
                  <span className="text-xs text-ink-400">{formatDate(post.date)} · {post.authorName}</span>
                </div>
                <div className="text-sm font-semibold text-ink-900">{post.title}</div>
                <p className="text-sm text-ink-500 mt-0.5">{post.body}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
