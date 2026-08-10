// Builder / Developer Portal selectors. Everything here is a re-slice of data that
// already exists elsewhere in the product (units, work orders, scores, ratings) —
// deliberately no new fabricated "owner satisfaction" or "defect" numbers invented just
// for this view. What a developer's post-handover portfolio actually looks like: unit
// economics, occupancy, service quality, and where recurring issues concentrate.

import type { Property, TrellisDataset } from "../types";
import { currentOccupancyPct } from "./financials";
import { computeTrellisScore } from "./trellisScore";

export interface BuilderProjectStat {
  property: Property;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyPct: number;
  avgRent: number;
  trellisScore: number;
  openMaintenance: number;
  avgResidentRating: number | null;
  topIssueCategory: string | null;
}

export function builderProjects(dataset: TrellisDataset, developerName: string): BuilderProjectStat[] {
  const lastMonth = dataset.months[dataset.months.length - 1];
  return dataset.properties
    .filter((p) => p.developer === developerName)
    .map((property) => {
      const units = dataset.units.filter((u) => u.propertyId === property.id);
      const occupiedUnits = units.filter((u) => u.status === "Occupied" || u.status === "Notice Period");
      const vacantUnits = units.filter((u) => u.status === "Vacant");
      const avgRent = occupiedUnits.length ? occupiedUnits.reduce((s, u) => s + u.currentRent, 0) / occupiedUnits.length : 0;
      const score = computeTrellisScore(dataset, property.id, lastMonth);

      const propWO = dataset.workOrders.filter((w) => w.propertyId === property.id);
      const openMaintenance = propWO.filter((w) => w.status !== "Completed").length;
      const rated = propWO.filter((w) => w.residentRating != null);
      const avgResidentRating = rated.length ? rated.reduce((s, w) => s + (w.residentRating ?? 0), 0) / rated.length : null;

      const categoryCounts = new Map<string, number>();
      for (const w of propWO) categoryCounts.set(w.category, (categoryCounts.get(w.category) ?? 0) + 1);
      const topIssueCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

      return {
        property,
        totalUnits: units.length,
        occupiedUnits: occupiedUnits.length,
        vacantUnits: vacantUnits.length,
        occupancyPct: currentOccupancyPct(dataset, property.id),
        avgRent,
        trellisScore: score.composite,
        openMaintenance,
        avgResidentRating,
        topIssueCategory,
      };
    })
    .sort((a, b) => b.totalUnits - a.totalUnits);
}

export interface BuilderPortfolioSummary {
  projectCount: number;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyPct: number;
  avgRent: number;
  avgTrellisScore: number;
  openMaintenance: number;
  avgResidentRating: number | null;
}

export function builderPortfolioSummary(dataset: TrellisDataset, developerName: string): BuilderPortfolioSummary {
  const projects = builderProjects(dataset, developerName);
  const totalUnits = projects.reduce((s, p) => s + p.totalUnits, 0);
  const occupiedUnits = projects.reduce((s, p) => s + p.occupiedUnits, 0);
  const vacantUnits = projects.reduce((s, p) => s + p.vacantUnits, 0);
  const ratedProjects = projects.filter((p) => p.avgResidentRating != null);

  return {
    projectCount: projects.length,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    occupancyPct: totalUnits ? (occupiedUnits / totalUnits) * 100 : 0,
    avgRent: occupiedUnits ? projects.reduce((s, p) => s + p.avgRent * p.occupiedUnits, 0) / occupiedUnits : 0,
    avgTrellisScore: projects.length ? Math.round(projects.reduce((s, p) => s + p.trellisScore, 0) / projects.length) : 0,
    openMaintenance: projects.reduce((s, p) => s + p.openMaintenance, 0),
    avgResidentRating: ratedProjects.length ? ratedProjects.reduce((s, p) => s + (p.avgResidentRating ?? 0), 0) / ratedProjects.length : null,
  };
}

export interface BuilderAnalytics {
  highestVacancy: BuilderProjectStat | null;
  highestRent: BuilderProjectStat | null;
  highestSatisfaction: BuilderProjectStat | null;
  mostRecurringIssueCategory: { category: string; count: number } | null;
}

export function builderAnalytics(dataset: TrellisDataset, developerName: string): BuilderAnalytics {
  const projects = builderProjects(dataset, developerName);
  if (projects.length === 0) return { highestVacancy: null, highestRent: null, highestSatisfaction: null, mostRecurringIssueCategory: null };

  const highestVacancy = [...projects].sort((a, b) => b.vacantUnits / (b.totalUnits || 1) - a.vacantUnits / (a.totalUnits || 1))[0];
  const highestRent = [...projects].sort((a, b) => b.avgRent - a.avgRent)[0];
  const rated = projects.filter((p) => p.avgResidentRating != null);
  const highestSatisfaction = rated.length ? [...rated].sort((a, b) => (b.avgResidentRating ?? 0) - (a.avgResidentRating ?? 0))[0] : null;

  const developerPropertyIds = new Set(projects.map((p) => p.property.id));
  const categoryCounts = new Map<string, number>();
  for (const w of dataset.workOrders) {
    if (!developerPropertyIds.has(w.propertyId)) continue;
    categoryCounts.set(w.category, (categoryCounts.get(w.category) ?? 0) + 1);
  }
  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return {
    highestVacancy,
    highestRent,
    highestSatisfaction,
    mostRecurringIssueCategory: topCategory ? { category: topCategory[0], count: topCategory[1] } : null,
  };
}
