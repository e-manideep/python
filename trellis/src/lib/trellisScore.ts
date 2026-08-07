import type { Property, ScoreBand, ScoreSnapshot, SubScore, TrellisDataset, TrellisScoreResult, WorkOrder } from "../types";
import { monthIndex, monthOf } from "./dates";
import { monthlyFinancials, occupancyPctAsOf } from "./financials";

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

function avg(nums: number[]): number {
  return nums.length ? nums.reduce((s, n) => s + n, 0) / nums.length : 0;
}

function trailingWindow(dataset: TrellisDataset, month: string, span: number): string[] {
  const idx = monthIndex(month);
  return dataset.months.filter((m) => monthIndex(m) <= idx && monthIndex(m) > idx - span);
}

function workOrdersCreatedIn(workOrders: WorkOrder[], months: Set<string>): WorkOrder[] {
  return workOrders.filter((w) => months.has(monthOf(w.createdDate)));
}

function financialSubScore(dataset: TrellisDataset, propertyId: string, months: string[]): { score: number; summary: string; drivers: string[] } {
  const rows = months.map((m) => monthlyFinancials(dataset, propertyId, m));
  const noiMargin = avg(rows.map((r) => r.noiMargin));
  const collection = avg(rows.map((r) => r.collectionEfficiencyPct));
  const yieldPct = avg(rows.map((r) => r.yieldPct));

  const noiMarginScore = clamp(((noiMargin - 35) / (78 - 35)) * 100);
  const collectionScore = clamp(((collection - 70) / (99 - 70)) * 100);
  const yieldScore = clamp(((yieldPct - 0.8) / (3.2 - 0.8)) * 100);
  const score = noiMarginScore * 0.4 + collectionScore * 0.35 + yieldScore * 0.25;

  return {
    score,
    summary: `${noiMargin.toFixed(0)}% NOI margin · ${collection.toFixed(0)}% rent collected on time · ${yieldPct.toFixed(1)}% net yield`,
    drivers: [
      `NOI margin ${noiMargin.toFixed(1)}% (trailing ${months.length}mo avg)`,
      `Collection efficiency ${collection.toFixed(1)}%`,
      `Net operating yield ${yieldPct.toFixed(2)}% on asset value`,
    ],
  };
}

function occupancySubScore(dataset: TrellisDataset, propertyId: string, month: string): { score: number; summary: string; drivers: string[] } {
  const occNow = occupancyPctAsOf(dataset, propertyId, month);
  const priorMonths = trailingWindow(dataset, month, 4);
  const occPrior = priorMonths.length > 1 ? occupancyPctAsOf(dataset, propertyId, priorMonths[0]) : occNow;
  const trendDelta = occNow - occPrior;

  const occScore = clamp(((occNow - 50) / (97 - 50)) * 100);
  const trendScore = clamp(50 + trendDelta * 8);
  const score = occScore * 0.7 + trendScore * 0.3;

  return {
    score,
    summary: `${occNow.toFixed(1)}% occupied, ${trendDelta >= 0 ? "up" : "down"} ${Math.abs(trendDelta).toFixed(1)} pts over the last quarter`,
    drivers: [`Current occupancy ${occNow.toFixed(1)}%`, `Quarter-over-quarter change ${trendDelta >= 0 ? "+" : ""}${trendDelta.toFixed(1)} pts`],
  };
}

function maintenanceSubScore(dataset: TrellisDataset, property: Property, month: string): { score: number; summary: string; drivers: string[] } {
  const windowMonths = new Set(trailingWindow(dataset, month, 6));
  const propWO = dataset.workOrders.filter((w) => w.propertyId === property.id);
  const recent = workOrdersCreatedIn(propWO, windowMonths);
  const completed = recent.filter((w) => w.status === "Completed" && w.resolvedDate);
  const withinSla = completed.filter((w) => {
    const hours = (new Date(w.resolvedDate!).getTime() - new Date(w.createdDate).getTime()) / 3.6e6;
    return hours <= w.slaHours * 1.05;
  });
  const slaComplianceScore = completed.length ? (withinSla.length / completed.length) * 100 : 88;

  const asOfNow = month === dataset.months[dataset.months.length - 1];
  const openBurden = asOfNow
    ? propWO.filter((w) => w.status === "Overdue" || ((w.status === "Open" || w.status === "Assigned" || w.status === "In Progress") && (w.priority === "High" || w.priority === "Critical"))).length
    : recent.filter((w) => w.status === "Overdue").length;
  const burdenRate = property.totalUnits > 0 ? (openBurden / property.totalUnits) * 100 : 0;
  const openCriticalScore = clamp(100 - burdenRate * 40);

  const categoryCounts = new Map<string, number>();
  for (const w of recent) categoryCounts.set(w.category, (categoryCounts.get(w.category) ?? 0) + 1);
  const topShare = recent.length ? Math.max(...categoryCounts.values()) / recent.length : 0;
  const repeatIssueScore = clamp(100 - Math.max(0, topShare * 100 - 30) * 2);

  const buildingAge = new Date(month + "-01").getFullYear() - property.yearBuilt;
  const ageScore = clamp(100 - Math.max(0, buildingAge - 5) * 2, 40, 100);

  const score = slaComplianceScore * 0.4 + openCriticalScore * 0.3 + repeatIssueScore * 0.15 + ageScore * 0.15;
  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  return {
    score,
    summary: `${slaComplianceScore.toFixed(0)}% SLA compliance · ${openBurden} unresolved priority ticket${openBurden === 1 ? "" : "s"}${topCategory ? ` · ${topCategory} is the top issue category` : ""}`,
    drivers: [
      `SLA compliance (trailing 6mo) ${slaComplianceScore.toFixed(0)}%`,
      `${openBurden} open High/Critical or overdue ticket(s) against ${property.totalUnits} units`,
      `Building age ${buildingAge}y since handover`,
    ],
  };
}

function complianceSubScore(property: Property): { score: number; summary: string; drivers: string[] } {
  const points: Record<string, number> = { Valid: 100, "Expiring Soon": 55, Expired: 10 };
  const score = avg(property.compliance.map((c) => points[c.status]));
  const issues = property.compliance.filter((c) => c.status !== "Valid");
  return {
    score,
    summary: issues.length ? `${issues.length} compliance item${issues.length === 1 ? "" : "s"} need attention: ${issues.map((i) => i.type).join(", ")}` : "All compliance items current",
    drivers: property.compliance.map((c) => `${c.type}: ${c.status}`),
  };
}

function satisfactionSubScore(dataset: TrellisDataset, propertyId: string, month: string): { score: number; summary: string; drivers: string[] } {
  const windowMonths = new Set(trailingWindow(dataset, month, 6));
  const recent = workOrdersCreatedIn(
    dataset.workOrders.filter((w) => w.propertyId === propertyId),
    windowMonths
  );
  const completed = recent.filter((w) => w.status === "Completed" && w.resolvedDate);
  const rated = completed.filter((w) => w.residentRating != null);
  const avgRating = rated.length ? avg(rated.map((w) => w.residentRating!)) : null;
  const ratingScore = avgRating != null ? clamp(((avgRating - 1) / 4) * 100) : 70;

  const ratios = completed.map((w) => (new Date(w.resolvedDate!).getTime() - new Date(w.createdDate).getTime()) / 3.6e6 / w.slaHours);
  const avgRatio = avg(ratios) || 0.7;
  const responseTimeScore = clamp(100 - Math.max(0, avgRatio - 0.6) * 80);

  const score = ratingScore * 0.8 + responseTimeScore * 0.2;
  return {
    score,
    summary: avgRating != null ? `${avgRating.toFixed(1)}/5 avg resident rating on ${rated.length} rated service${rated.length === 1 ? "" : "s"}` : "Limited rating data yet — using portfolio baseline",
    drivers: avgRating != null ? [`Average resident rating ${avgRating.toFixed(2)}/5 (${rated.length} responses)`, `Avg. resolution time ${(avgRatio * 100).toFixed(0)}% of SLA window`] : ["No resident ratings recorded in this window"],
  };
}

export function bandFor(composite: number): ScoreBand {
  if (composite >= 770) return "Excellent";
  if (composite >= 670) return "Good";
  if (composite >= 580) return "Fair";
  return "Needs Attention";
}

export function computeTrellisScore(dataset: TrellisDataset, propertyId: string, month?: string): TrellisScoreResult {
  const property = dataset.properties.find((p) => p.id === propertyId);
  if (!property) throw new Error(`Unknown property ${propertyId}`);
  const asOfMonth = month ?? dataset.months[dataset.months.length - 1];
  const finWindow = trailingWindow(dataset, asOfMonth, 3);

  const fin = financialSubScore(dataset, propertyId, finWindow);
  const occ = occupancySubScore(dataset, propertyId, asOfMonth);
  const maint = maintenanceSubScore(dataset, property, asOfMonth);
  const comp = complianceSubScore(property);
  const sat = satisfactionSubScore(dataset, propertyId, asOfMonth);

  const subScores: SubScore[] = [
    { key: "financial", label: "Financial Performance", value0to100: fin.score, weight: 0.3, summary: fin.summary, drivers: fin.drivers },
    { key: "occupancy", label: "Occupancy Health", value0to100: occ.score, weight: 0.2, summary: occ.summary, drivers: occ.drivers },
    { key: "maintenance", label: "Maintenance & Condition", value0to100: maint.score, weight: 0.2, summary: maint.summary, drivers: maint.drivers },
    { key: "compliance", label: "Compliance", value0to100: comp.score, weight: 0.15, summary: comp.summary, drivers: comp.drivers },
    { key: "satisfaction", label: "Resident Satisfaction", value0to100: sat.score, weight: 0.15, summary: sat.summary, drivers: sat.drivers },
  ];

  const weighted = subScores.reduce((s, ss) => s + ss.value0to100 * ss.weight, 0);
  const composite = Math.round(300 + (weighted / 100) * 600);

  return { propertyId, composite, band: bandFor(composite), subScores, asOfMonth };
}

export function computeScoreHistory(dataset: TrellisDataset, propertyId: string): ScoreSnapshot[] {
  return dataset.months.map((month) => {
    const result = computeTrellisScore(dataset, propertyId, month);
    const byKey = Object.fromEntries(result.subScores.map((s) => [s.key, s.value0to100]));
    return {
      propertyId,
      month,
      composite: result.composite,
      financial: byKey.financial,
      occupancy: byKey.occupancy,
      maintenance: byKey.maintenance,
      compliance: byKey.compliance,
      satisfaction: byKey.satisfaction,
    };
  });
}
