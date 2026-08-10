import type { Insight, TrellisDataset, Vendor, VendorCategory } from "../types";
import { formatINRCompact } from "./format";
import { atRiskLeases, forecastOccupancy, leaseExpirationLadder } from "./leaseRenewal";
import { capitalPlanningInsights as capitalPlanningInsightsImpl } from "./capitalPlanning";
import { sustainabilityInsights as sustainabilityInsightsImpl } from "./sustainability";
import { makeReadyInsights as makeReadyInsightsImpl } from "./propertyServices";

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
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

    // SLA breach rate over the property's full completed-ticket history is a far more
    // stable signal of chronic under-performance than a snapshot of what's open right now
    // (which is noisy — most tickets resolve within days regardless of the property's
    // underlying health).
    const completed = propWO.filter((w) => w.status === "Completed" && w.resolvedDate);
    const breached = completed.filter((w) => (new Date(w.resolvedDate!).getTime() - new Date(w.createdDate).getTime()) / 3.6e6 > w.slaHours * 1.05);
    const slaBreachRatePct = completed.length ? (breached.length / completed.length) * 100 : 0;

    const categoryCounts = new Map<string, number>();
    for (const w of propWO) categoryCounts.set(w.category, (categoryCounts.get(w.category) ?? 0) + 1);
    const topEntry = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0];
    const topShare = propWO.length && topEntry ? topEntry[1] / propWO.length : 0;

    const buildingAge = new Date(currentMonth + "-01").getFullYear() - property.yearBuilt;

    let riskScore = slaBreachRatePct * 1.1 + Math.max(0, topShare - 0.3) * 110 + Math.max(0, buildingAge - 8) * 1.3 + openPriority.length * 7;
    riskScore = clamp(riskScore, 0, 100);

    if (riskScore > 26) {
      insights.push({
        id: nextId("maint"),
        category: "Maintenance Risk",
        severity: riskScore > 40 ? "action" : "watch",
        propertyId: property.id,
        vendorId: null,
        title: `${property.name} flagged for elevated maintenance risk`,
        detail: `${slaBreachRatePct.toFixed(0)}% of completed tickets missed SLA over this property's service history${openPriority.length ? `, ${openPriority.length} high-priority/overdue ticket(s) open right now` : ""}${topEntry ? `, and ${topEntry[0]} accounts for ${(topShare * 100).toFixed(0)}% of all tickets — a likely recurring root cause` : ""}.`,
        metricLabel: "Risk score",
        metricValue: `${riskScore.toFixed(0)} / 100`,
        method: `Weighted score from lifetime SLA-breach rate, category concentration (recurring-issue signal), building age, and currently open high-priority/overdue tickets.`,
      });
    }
  }
  return insights.sort((a, b) => Number(b.metricValue.split(" ")[0]) - Number(a.metricValue.split(" ")[0]));
}

// ---- 3. Occupancy Forecast (probability-weighted, not a naive trend line) ----
export function occupancyForecastInsights(dataset: TrellisDataset): Insight[] {
  const insights: Insight[] = [];
  for (const property of dataset.properties) {
    const forecast = forecastOccupancy(dataset, property.id);
    const delta = forecast.forecastOccupancyPct - forecast.currentOccupancyPct;
    if (delta < -2.5) {
      insights.push({
        id: nextId("occ"),
        category: "Occupancy Forecast",
        severity: delta < -6 ? "action" : "watch",
        propertyId: property.id,
        vendorId: null,
        title: `${property.name} projected to lose occupancy over the next quarter`,
        detail: `${forecast.expectedNonRenewals.toFixed(1)} expected non-renewals over the next 3 months are only partially offset by ${forecast.expectedNewLeases.toFixed(1)} expected new lease-ups at the recent fill rate. Projected occupancy: ${forecast.forecastOccupancyPct.toFixed(0)}%, versus ${forecast.currentOccupancyPct.toFixed(0)}% today.`,
        metricLabel: "3-month forecast",
        metricValue: `${forecast.forecastOccupancyPct.toFixed(0)}% (from ${forecast.currentOccupancyPct.toFixed(0)}%)`,
        method: forecast.method,
      });
    }
  }
  return insights;
}

// ---- Renewal Risk (lease-level, revenue-weighted) ----
export function renewalRiskInsights(dataset: TrellisDataset): Insight[] {
  const insights: Insight[] = [];
  for (const property of dataset.properties) {
    const atRisk = atRiskLeases(dataset, property.id, 6, 50);
    if (atRisk.length === 0) continue;
    const revenueAtRisk = atRisk.reduce((s, a) => s + a.rentAmount, 0);
    insights.push({
      id: nextId("renew"),
      category: "Renewal Risk",
      severity: revenueAtRisk > 150000 || atRisk.length >= 5 ? "action" : "watch",
      propertyId: property.id,
      vendorId: null,
      title: `${atRisk.length} lease${atRisk.length === 1 ? "" : "s"} at ${property.name} at risk of non-renewal within 6 months`,
      detail: `Renewal probability model flags ${atRisk.length} expiring lease(s) below 50% likely-to-renew, driven mainly by ${atRisk[0].rentGapPct > 0 ? "above-market pricing" : "service/tenure factors"}. Combined rent at risk: ${formatINRCompact(revenueAtRisk)}/mo.`,
      metricLabel: "Monthly revenue at risk",
      metricValue: `${formatINRCompact(revenueAtRisk)}/mo`,
      method: `Per-lease renewal probability from tenure, rent-vs-market gap, and service rating; flags leases expiring within 6 months scoring below 50%.`,
    });
  }

  const ladder = leaseExpirationLadder(dataset);
  const totalLeases = dataset.leases.filter((l) => l.status !== "Ended").length;
  for (const month of ladder) {
    const share = totalLeases ? (month.leaseCount / totalLeases) * 100 : 0;
    if (share > 12 && month.leaseCount >= 15) {
      insights.push({
        id: nextId("ladder"),
        category: "Renewal Risk",
        severity: "watch",
        propertyId: null,
        vendorId: null,
        title: `Lease expirations concentrated in ${month.label}`,
        detail: `${month.leaseCount} leases (${share.toFixed(0)}% of the active book) expire in ${month.label}, representing ${formatINRCompact(month.revenueAtRisk)}/mo — a renewal-execution concentration risk worth staggering in future lease terms.`,
        metricLabel: "Leases expiring",
        metricValue: `${month.leaseCount} (${share.toFixed(0)}% of book)`,
        method: `Portfolio-wide lease expiration ladder over the next 12 months; flags any single month exceeding 12% of the active lease book.`,
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
  const all = [
    ...complianceInsights(dataset),
    ...maintenanceRiskInsights(dataset),
    ...rentOptimizationInsights(dataset),
    ...occupancyForecastInsights(dataset),
    ...renewalRiskInsights(dataset),
    ...vendorPerformanceInsights(dataset),
    ...capitalPlanningInsightsImpl(dataset),
    ...sustainabilityInsightsImpl(dataset),
    ...makeReadyInsightsImpl(dataset),
  ];
  const sevOrder: Record<Insight["severity"], number> = { action: 0, watch: 1, info: 2 };
  return all.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
}

export function insightsForProperty(dataset: TrellisDataset, propertyId: string): Insight[] {
  return generateAllInsights(dataset).filter((i) => i.propertyId === propertyId);
}

export function insightsForVendor(dataset: TrellisDataset, vendorId: string): Insight[] {
  return generateAllInsights(dataset).filter((i) => i.vendorId === vendorId);
}
