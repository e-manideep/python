import type { Insight, TrellisDataset, Vendor, VendorCategory } from "../types";
import { occupancyPctAsOf } from "./financials";
import { formatINRCompact } from "./format";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function linregSlope(points: number[]): number {
  const n = points.length;
  if (n < 2) return 0;
  const xs = points.map((_, i) => i);
  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = points.reduce((s, y) => s + y, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - xMean) * (points[i] - yMean);
    den += (xs[i] - xMean) ** 2;
  }
  return den === 0 ? 0 : num / den;
}

let idCounter = 0;
function nextId(prefix: string) {
  return `${prefix}-${idCounter++}`;
}

// ---- 1. Rent Optimization ----
export function rentOptimizationInsights(dataset: TrellisDataset): Insight[] {
  const insights: Insight[] = [];
  for (const property of dataset.properties) {
    const propUnits = dataset.units.filter((u) => u.propertyId === property.id && u.status === "Occupied");
    const underpriced = propUnits.filter((u) => u.currentRent < u.marketRent * 0.92);
    const overpriced = propUnits.filter((u) => u.currentRent > u.marketRent * 1.08);

    const monthlyUpside = underpriced.reduce((s, u) => s + (u.marketRent - u.currentRent), 0);
    if (underpriced.length >= 3 && monthlyUpside > 35000) {
      insights.push({
        id: nextId("rent"),
        category: "Rent Optimization",
        severity: monthlyUpside > 60000 ? "action" : "watch",
        propertyId: property.id,
        vendorId: null,
        title: `${underpriced.length} units at ${property.name} are priced below market`,
        detail: `${underpriced.length} occupied units are renewing at ${'>'}8% below the comparable-unit benchmark for ${property.locality}. Bringing them to market on next renewal captures additional annual income.`,
        metricLabel: "Monthly upside",
        metricValue: `${formatINRCompact(monthlyUpside)}/mo (${formatINRCompact(monthlyUpside * 12)}/yr)`,
        method: `Compares each unit's current rent to the comp-based market benchmark for its configuration and locality; flags units ${'>'}8% under benchmark.`,
      });
    }

    if (overpriced.length >= 3) {
      insights.push({
        id: nextId("rent"),
        category: "Rent Optimization",
        severity: "info",
        propertyId: property.id,
        vendorId: null,
        title: `${overpriced.length} units at ${property.name} are priced above market`,
        detail: `Units priced ${'>'}8% above the local benchmark carry elevated vacancy/churn risk at next renewal.`,
        metricLabel: "Units at risk",
        metricValue: `${overpriced.length} unit(s)`,
        method: `Compares each unit's current rent to the comp-based market benchmark; flags units ${'>'}8% over benchmark.`,
      });
    }
  }
  return insights.sort((a, b) => (b.severity === "action" ? 1 : 0) - (a.severity === "action" ? 1 : 0));
}

// ---- 2. Maintenance Risk ----
export function maintenanceRiskInsights(dataset: TrellisDataset): Insight[] {
  const insights: Insight[] = [];
  const currentMonth = dataset.months[dataset.months.length - 1];
  for (const property of dataset.properties) {
    const propWO = dataset.workOrders.filter((w) => w.propertyId === property.id);
    const openPriority = propWO.filter((w) => w.status === "Overdue" || ((w.status === "Open" || w.status === "Assigned" || w.status === "In Progress") && (w.priority === "High" || w.priority === "Critical")));
    const burdenRate = property.totalUnits > 0 ? (openPriority.length / property.totalUnits) * 100 : 0;

    const categoryCounts = new Map<string, number>();
    for (const w of propWO) categoryCounts.set(w.category, (categoryCounts.get(w.category) ?? 0) + 1);
    const topEntry = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topShare = propWO.length && topEntry ? topEntry[1] / propWO.length : 0;

    const buildingAge = new Date(currentMonth + "-01").getFullYear() - property.yearBuilt;

    let riskScore = burdenRate * 1.4 + (topShare > 0.35 ? (topShare - 0.35) * 120 : 0) + Math.max(0, buildingAge - 10) * 1.2;
    riskScore = clamp(riskScore, 0, 100);

    if (riskScore > 28) {
      insights.push({
        id: nextId("maint"),
        category: "Maintenance Risk",
        severity: riskScore > 55 ? "action" : "watch",
        propertyId: property.id,
        vendorId: null,
        title: `${property.name} flagged for elevated maintenance risk`,
        detail: `${openPriority.length} unresolved high-priority/overdue ticket(s) against ${property.totalUnits} units${topEntry ? `, with ${topEntry[0]} accounting for ${(topShare * 100).toFixed(0)}% of all tickets — a likely recurring root cause` : ""}.`,
        metricLabel: "Risk score",
        metricValue: `${riskScore.toFixed(0)} / 100`,
        method: `Weighted score from open high-priority/overdue ticket density, category concentration (recurring-issue signal), and building age.`,
      });
    }
  }
  return insights.sort((a, b) => Number(b.metricValue.split(" ")[0]) - Number(a.metricValue.split(" ")[0]));
}

// ---- 3. Occupancy Forecast ----
export function occupancyForecastInsights(dataset: TrellisDataset): Insight[] {
  const insights: Insight[] = [];
  const window = dataset.months.slice(-6);
  for (const property of dataset.properties) {
    const series = window.map((m) => occupancyPctAsOf(dataset, property.id, m));
    const slope = linregSlope(series);
    const current = series[series.length - 1];
    const forecast = clamp(current + slope * 3, 0, 100);

    if (slope < -0.6) {
      insights.push({
        id: nextId("occ"),
        category: "Occupancy Forecast",
        severity: forecast < current - 5 ? "action" : "watch",
        propertyId: property.id,
        vendorId: null,
        title: `${property.name} occupancy trending down`,
        detail: `Occupancy has declined at ~${Math.abs(slope).toFixed(1)} pts/month over the last ${window.length} months. At this trend, projected occupancy in 3 months is ${forecast.toFixed(0)}%, versus ${current.toFixed(0)}% today.`,
        metricLabel: "3-month forecast",
        metricValue: `${forecast.toFixed(0)}% (from ${current.toFixed(0)}%)`,
        method: `Linear trend fit over the trailing ${window.length}-month occupancy series, projected forward 3 months.`,
      });
    }
  }
  return insights;
}

// ---- 4. Vendor Performance ----
export function vendorPerformanceInsights(dataset: TrellisDataset): Insight[] {
  const insights: Insight[] = [];
  const byCategory = new Map<VendorCategory, Vendor[]>();
  for (const v of dataset.vendors) {
    for (const c of v.categories) {
      if (!byCategory.has(c)) byCategory.set(c, []);
      byCategory.get(c)!.push(v);
    }
  }

  for (const [category, vendors] of byCategory) {
    const withJobs = vendors.filter((v) => v.jobsCompleted >= 3);
    if (withJobs.length === 0) continue;
    const avgCost = withJobs.reduce((s, v) => s + v.avgCostPerJob, 0) / withJobs.length;

    const scored = withJobs.map((v) => {
      const costScore = avgCost > 0 ? clamp(100 - ((v.avgCostPerJob - avgCost) / avgCost) * 60, 0, 100) : 70;
      const score = v.slaCompliancePct * 0.5 + (v.avgRating / 5) * 100 * 0.3 + costScore * 0.2;
      return { vendor: v, score };
    });
    scored.sort((a, b) => b.score - a.score);
    const top = scored[0];
    insights.push({
      id: nextId("vendor"),
      category: "Vendor Performance",
      severity: "info",
      propertyId: null,
      vendorId: top.vendor.id,
      title: `${top.vendor.name} is the top-ranked ${category} vendor`,
      detail: `Across ${top.vendor.jobsCompleted} completed jobs: ${top.vendor.slaCompliancePct.toFixed(0)}% SLA compliance, ${top.vendor.avgRating.toFixed(1)}/5 rating, avg. cost ${formatINRCompact(top.vendor.avgCostPerJob)} vs. category avg ${formatINRCompact(avgCost)}.`,
      metricLabel: "Composite score",
      metricValue: `${top.score.toFixed(0)} / 100`,
      method: `Ranks vendors within category by 50% SLA compliance, 30% resident rating, 20% cost competitiveness vs. category average.`,
    });

    for (const s of scored) {
      if (s.vendor.slaCompliancePct < 75 || s.vendor.avgRating < 3.5) {
        insights.push({
          id: nextId("vendor"),
          category: "Vendor Performance",
          severity: "watch",
          propertyId: null,
          vendorId: s.vendor.id,
          title: `${s.vendor.name} underperforming on ${category} jobs`,
          detail: `${s.vendor.slaCompliancePct.toFixed(0)}% SLA compliance and ${s.vendor.avgRating.toFixed(1)}/5 rating over ${s.vendor.jobsCompleted} jobs — below the category's reliability threshold.`,
          metricLabel: "SLA compliance",
          metricValue: `${s.vendor.slaCompliancePct.toFixed(0)}%`,
          method: `Flags vendors below 75% SLA compliance or 3.5/5 rating with a meaningful job sample (n≥3).`,
        });
      }
    }
  }
  return insights;
}

// ---- 5. Compliance ----
export function complianceInsights(dataset: TrellisDataset): Insight[] {
  const insights: Insight[] = [];
  for (const property of dataset.properties) {
    const expired = property.compliance.filter((c) => c.status === "Expired");
    const expiring = property.compliance.filter((c) => c.status === "Expiring Soon");
    if (expired.length) {
      insights.push({
        id: nextId("comp"),
        category: "Compliance",
        severity: "action",
        propertyId: property.id,
        vendorId: null,
        title: `${property.name} has ${expired.length} expired compliance item${expired.length === 1 ? "" : "s"}`,
        detail: `${expired.map((e) => e.type).join(", ")} lapsed. This is a direct regulatory and liability exposure.`,
        metricLabel: "Items expired",
        metricValue: `${expired.length}`,
        method: `Reads directly from the property's compliance register.`,
      });
    } else if (expiring.length) {
      insights.push({
        id: nextId("comp"),
        category: "Compliance",
        severity: "watch",
        propertyId: property.id,
        vendorId: null,
        title: `${property.name} has compliance renewals due soon`,
        detail: `${expiring.map((e) => `${e.type} (expires ${e.expiryDate})`).join(", ")}.`,
        metricLabel: "Items expiring",
        metricValue: `${expiring.length}`,
        method: `Reads directly from the property's compliance register; flags items expiring within 45 days.`,
      });
    }
  }
  return insights;
}

export function generateAllInsights(dataset: TrellisDataset): Insight[] {
  const all = [...complianceInsights(dataset), ...maintenanceRiskInsights(dataset), ...rentOptimizationInsights(dataset), ...occupancyForecastInsights(dataset), ...vendorPerformanceInsights(dataset)];
  const sevOrder: Record<Insight["severity"], number> = { action: 0, watch: 1, info: 2 };
  return all.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
}

export function insightsForProperty(dataset: TrellisDataset, propertyId: string): Insight[] {
  return generateAllInsights(dataset).filter((i) => i.propertyId === propertyId);
}

export function insightsForVendor(dataset: TrellisDataset, vendorId: string): Insight[] {
  return generateAllInsights(dataset).filter((i) => i.vendorId === vendorId);
}
