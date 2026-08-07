// Capital planning / reserve-fund forecasting — the same discipline behind a condo
// "reserve study" or a REIT's capital-plan schedule: model each major building system's
// replacement cycle, estimate cost, and check whether the property is funding enough of
// a sinking fund to cover it. All assumptions are stated explicitly rather than hidden.

import type { Property, TrellisDataset } from "../types";
import { monthlyFinancials } from "./financials";
import { formatINRCompact } from "./format";
import type { Insight } from "../types";

export type CapExUrgency = "Overdue" | "Due Soon" | "Planned" | "Long-Term";

export interface CapExSystem {
  key: string;
  label: string;
  lifespanYears: number;
  lastRenewalYear: number;
  nextDueYear: number;
  yearsRemaining: number;
  estimatedCost: number;
  urgency: CapExUrgency;
  assumption: string;
}

interface SystemDef {
  key: string;
  label: string;
  lifespanYears: number;
  costPerUnit?: number;
  flatCost?: number;
  appliesTo: (p: Property) => boolean;
}

const SYSTEMS: SystemDef[] = [
  { key: "paint", label: "Exterior Painting & Waterproofing Touch-up", lifespanYears: 6, costPerUnit: 8500, appliesTo: () => true },
  { key: "roof", label: "Roof / Terrace Waterproofing", lifespanYears: 12, costPerUnit: 6200, appliesTo: () => true },
  { key: "plumbing", label: "Plumbing Riser Replacement", lifespanYears: 25, costPerUnit: 9000, appliesTo: () => true },
  { key: "electrical", label: "Common-Area Electrical Rewiring", lifespanYears: 20, costPerUnit: 7500, appliesTo: () => true },
  { key: "lift", label: "Lift Modernization", lifespanYears: 18, flatCost: 1350000, appliesTo: (p) => p.hasLift },
  { key: "stp", label: "STP / Water Treatment Overhaul", lifespanYears: 15, flatCost: 850000, appliesTo: (p) => p.type !== "Independent Villa" },
];

function currentYear(dataset: TrellisDataset): number {
  return Number(dataset.months[dataset.months.length - 1].slice(0, 4));
}

function urgencyFor(yearsRemaining: number): CapExUrgency {
  if (yearsRemaining < 0) return "Overdue";
  if (yearsRemaining <= 2) return "Due Soon";
  if (yearsRemaining <= 5) return "Planned";
  return "Long-Term";
}

export function capitalForecast(dataset: TrellisDataset, propertyId: string): CapExSystem[] {
  const property = dataset.properties.find((p) => p.id === propertyId);
  if (!property) return [];
  const nowYear = currentYear(dataset);

  return SYSTEMS.filter((s) => s.appliesTo(property)).map((s) => {
    let lastRenewalYear = property.yearBuilt;
    let assumption = `Assumes the ${s.label.toLowerCase()} cycle starts from building handover (${property.yearBuilt}) — no prior renovation record.`;

    if (s.key === "paint") {
      const lastPaintJob = dataset.workOrders
        .filter((w) => w.propertyId === propertyId && w.category === "Painting" && w.status === "Completed" && w.resolvedDate && /repaint|facade|corridor/i.test(w.description))
        .sort((a, b) => (a.resolvedDate! < b.resolvedDate! ? 1 : -1))[0];
      if (lastPaintJob?.resolvedDate) {
        lastRenewalYear = Number(lastPaintJob.resolvedDate.slice(0, 4));
        assumption = `Based on the most recent common-area repainting work order (${lastPaintJob.resolvedDate}).`;
      }
    }

    const nextDueYear = lastRenewalYear + s.lifespanYears;
    const yearsRemaining = nextDueYear - nowYear;
    const estimatedCost = s.flatCost ?? Math.round((s.costPerUnit ?? 0) * property.totalUnits);

    return {
      key: s.key,
      label: s.label,
      lifespanYears: s.lifespanYears,
      lastRenewalYear,
      nextDueYear,
      yearsRemaining,
      estimatedCost,
      urgency: urgencyFor(yearsRemaining),
      assumption,
    };
  });
}

export interface ReserveFundStatus {
  projectedNeed5yr: number;
  impliedMonthlyContributionNeeded: number;
  assumedMonthlyContribution: number;
  adequacyPct: number;
  monthlyShortfall: number;
}

/** Assumes a 4%-of-NOI reserve/sinking-fund policy — a standard institutional guideline (3-5% of gross income is typical practice). */
export function reserveFundStatus(dataset: TrellisDataset, propertyId: string): ReserveFundStatus {
  const nowYear = currentYear(dataset);
  const systems = capitalForecast(dataset, propertyId);
  const projectedNeed5yr = systems.filter((s) => s.nextDueYear <= nowYear + 5).reduce((sum, s) => sum + s.estimatedCost, 0);
  const impliedMonthlyContributionNeeded = projectedNeed5yr / 60;

  const lastMonth = dataset.months[dataset.months.length - 1];
  const fin = monthlyFinancials(dataset, propertyId, lastMonth);
  const assumedMonthlyContribution = Math.max(0, fin.noi) * 0.04;

  const adequacyPct = impliedMonthlyContributionNeeded > 0 ? (assumedMonthlyContribution / impliedMonthlyContributionNeeded) * 100 : 100;
  const monthlyShortfall = Math.max(0, impliedMonthlyContributionNeeded - assumedMonthlyContribution);

  return { projectedNeed5yr, impliedMonthlyContributionNeeded, assumedMonthlyContribution, adequacyPct: Math.min(999, adequacyPct), monthlyShortfall };
}

export interface PortfolioCapExYear {
  year: number;
  totalCost: number;
  items: { propertyName: string; system: string; cost: number }[];
}

export function portfolioCapexForecast(dataset: TrellisDataset, propertyIds?: string[], yearsAhead = 5): PortfolioCapExYear[] {
  const nowYear = currentYear(dataset);
  const ids = propertyIds ?? dataset.properties.map((p) => p.id);
  const years: PortfolioCapExYear[] = Array.from({ length: yearsAhead }, (_, i) => ({ year: nowYear + i, totalCost: 0, items: [] }));

  for (const propertyId of ids) {
    const property = dataset.properties.find((p) => p.id === propertyId)!;
    for (const system of capitalForecast(dataset, propertyId)) {
      const bucket = years.find((y) => y.year === system.nextDueYear);
      if (bucket) {
        bucket.totalCost += system.estimatedCost;
        bucket.items.push({ propertyName: property.name, system: system.label, cost: system.estimatedCost });
      }
    }
  }
  return years;
}

export function capitalPlanningInsights(dataset: TrellisDataset): Insight[] {
  const insights: Insight[] = [];
  let seq = 0;
  for (const property of dataset.properties) {
    const systems = capitalForecast(dataset, property.id);
    const urgent = systems.filter((s) => s.urgency === "Overdue" || s.urgency === "Due Soon");
    if (urgent.length > 0) {
      const totalCost = urgent.reduce((s, u) => s + u.estimatedCost, 0);
      const worst = urgent.sort((a, b) => a.yearsRemaining - b.yearsRemaining)[0];
      insights.push({
        id: `capex-${seq++}`,
        category: "Capital Planning",
        severity: worst.urgency === "Overdue" ? "action" : "watch",
        propertyId: property.id,
        vendorId: null,
        title: `${property.name}: ${worst.label} ${worst.urgency === "Overdue" ? "is overdue" : "due within 2 years"}`,
        detail: `${urgent.length} major system${urgent.length === 1 ? "" : "s"} due for renewal at this property (est. ${formatINRCompact(totalCost)} combined), led by ${worst.label.toLowerCase()} — last renewed ${worst.lastRenewalYear}, ${worst.lifespanYears}-year typical cycle.`,
        metricLabel: "Estimated cost",
        metricValue: formatINRCompact(totalCost),
        method: `${worst.assumption} Cost estimated per-unit (or flat for building-wide systems) from typical Indian residential renovation rates.`,
      });
    }

    const reserve = reserveFundStatus(dataset, property.id);
    if (reserve.projectedNeed5yr > 0 && reserve.adequacyPct < 65) {
      insights.push({
        id: `reserve-${seq++}`,
        category: "Capital Planning",
        severity: reserve.adequacyPct < 40 ? "action" : "watch",
        propertyId: property.id,
        vendorId: null,
        title: `${property.name} reserve fund under-provisioned for known capital needs`,
        detail: `At a 4%-of-NOI reserve policy, this property is funding ${reserve.adequacyPct.toFixed(0)}% of its projected 5-year capital need (${formatINRCompact(reserve.projectedNeed5yr)}) — a shortfall of ${formatINRCompact(reserve.monthlyShortfall)}/mo against what would be required.`,
        metricLabel: "Reserve adequacy",
        metricValue: `${reserve.adequacyPct.toFixed(0)}%`,
        method: `Compares an assumed 4%-of-NOI monthly reserve contribution to the 5-year capital plan's implied monthly funding requirement.`,
      });
    }
  }
  return insights;
}
