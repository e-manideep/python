// Property Services: the make-ready / interiors / renovation revenue line, not just
// leasing and maintenance coordination. Grounded in two real, sourced data points:
// - Furnished units achieve ~20-30% better rental returns than unfurnished (Chennai IT-
//   corridor market data), so a make-ready spend is modeled as capturing the midpoint,
//   ~25%, of that uplift — not an invented number.
// - India's interior/renovation market is $36.9B (2025) and growing faster than new-build
//   interior work (13.35% CAGR for renovation vs. overall market ~8%), i.e. this is a real,
//   growing category, not a hypothetical add-on.

import type { Insight, TrellisDataset, Unit, UnitConfig } from "../types";
import { formatINRCompact } from "./format";

export const FURNISHED_UPLIFT_PCT = 0.25; // midpoint of the observed 20-30% range

const MAKE_READY_COST_BY_CONFIG: Record<UnitConfig, number> = {
  "1BHK": 180000,
  "2BHK": 250000,
  "3BHK": 320000,
  "4BHK": 400000,
  Villa: 500000,
};

export interface ServiceTier {
  tier: "Basic" | "Mid-Range" | "Premium";
  includes: string[];
  costMultiplier: number; // applied to the base make-ready cost for the unit's config
}

export const SERVICE_TIERS: ServiceTier[] = [
  { tier: "Basic", includes: ["Painting", "Lighting fixtures", "Curtains", "Modular storage", "Deep cleaning"], costMultiplier: 0.55 },
  { tier: "Mid-Range", includes: ["Modular kitchen", "Wardrobes", "False ceiling", "Flooring touch-up", "Bathroom fittings"], costMultiplier: 1.0 },
  { tier: "Premium", includes: ["Full interior design", "Custom furniture", "Smart-home fittings", "Premium kitchen", "Home automation"], costMultiplier: 1.8 },
];

export interface MakeReadyOpportunity {
  unitId: string;
  unitNumber: string;
  propertyId: string;
  config: UnitConfig;
  currentMarketRent: number;
  furnishedPotentialRent: number;
  monthlyUplift: number;
  recommendedTier: ServiceTier["tier"];
  estimatedCost: number;
  paybackMonths: number;
}

function recommendedTierFor(config: UnitConfig): ServiceTier["tier"] {
  if (config === "4BHK" || config === "Villa") return "Premium";
  if (config === "3BHK") return "Mid-Range";
  return "Basic";
}

export function makeReadyOpportunity(unit: Unit): MakeReadyOpportunity {
  const tierName = recommendedTierFor(unit.config);
  const tier = SERVICE_TIERS.find((t) => t.tier === tierName)!;
  const furnishedPotentialRent = Math.round((unit.marketRent * (1 + FURNISHED_UPLIFT_PCT)) / 100) * 100;
  const monthlyUplift = furnishedPotentialRent - unit.marketRent;
  const estimatedCost = Math.round(MAKE_READY_COST_BY_CONFIG[unit.config] * tier.costMultiplier);
  const paybackMonths = monthlyUplift > 0 ? estimatedCost / monthlyUplift : Infinity;

  return {
    unitId: unit.id,
    unitNumber: unit.unitNumber,
    propertyId: unit.propertyId,
    config: unit.config,
    currentMarketRent: unit.marketRent,
    furnishedPotentialRent,
    monthlyUplift,
    recommendedTier: tierName,
    estimatedCost,
    paybackMonths,
  };
}

export function propertyMakeReadyOpportunities(dataset: TrellisDataset, propertyId: string): MakeReadyOpportunity[] {
  return dataset.units
    .filter((u) => u.propertyId === propertyId && u.status === "Vacant")
    .map(makeReadyOpportunity)
    .sort((a, b) => a.paybackMonths - b.paybackMonths);
}

export interface PortfolioServicesOpportunity {
  vacantUnits: number;
  totalMakeReadyCost: number;
  totalMonthlyUpliftPotential: number;
  avgPaybackMonths: number;
}

export function portfolioServicesOpportunity(dataset: TrellisDataset, propertyIds?: string[]): PortfolioServicesOpportunity {
  const ids = new Set(propertyIds ?? dataset.properties.map((p) => p.id));
  const opportunities = dataset.units.filter((u) => ids.has(u.propertyId) && u.status === "Vacant").map(makeReadyOpportunity);
  const totalMakeReadyCost = opportunities.reduce((s, o) => s + o.estimatedCost, 0);
  const totalMonthlyUpliftPotential = opportunities.reduce((s, o) => s + o.monthlyUplift, 0);
  const finitePaybacks = opportunities.map((o) => o.paybackMonths).filter((p) => Number.isFinite(p));
  return {
    vacantUnits: opportunities.length,
    totalMakeReadyCost,
    totalMonthlyUpliftPotential,
    avgPaybackMonths: finitePaybacks.length ? finitePaybacks.reduce((s, p) => s + p, 0) / finitePaybacks.length : 0,
  };
}

export function makeReadyInsights(dataset: TrellisDataset): Insight[] {
  const insights: Insight[] = [];
  let seq = 0;
  for (const property of dataset.properties) {
    const opportunities = propertyMakeReadyOpportunities(dataset, property.id);
    if (opportunities.length === 0) continue;
    const totalUplift = opportunities.reduce((s, o) => s + o.monthlyUplift, 0);
    const totalCost = opportunities.reduce((s, o) => s + o.estimatedCost, 0);
    const avgPayback = opportunities.reduce((s, o) => s + o.paybackMonths, 0) / opportunities.length;
    if (opportunities.length >= 2 && avgPayback < 30) {
      insights.push({
        id: `makeready-${seq++}`,
        category: "Property Services",
        severity: opportunities.length >= 4 ? "action" : "watch",
        propertyId: property.id,
        vendorId: null,
        title: `${opportunities.length} vacant units at ${property.name} are make-ready candidates`,
        detail: `Furnishing these units typically captures a ${(FURNISHED_UPLIFT_PCT * 100).toFixed(0)}% rent premium (market data on furnished vs. unfurnished returns). Estimated spend ${formatINRCompact(totalCost)} against ${formatINRCompact(totalUplift)}/mo combined uplift — average payback ${avgPayback.toFixed(0)} months.`,
        metricLabel: "Avg. payback",
        metricValue: `${avgPayback.toFixed(0)} months`,
        method: `Make-ready cost by unit configuration and recommended service tier, vs. a ${(FURNISHED_UPLIFT_PCT * 100).toFixed(0)}% furnished-rent uplift (the midpoint of the observed 20–30% furnished vs. unfurnished return premium in comparable Indian metros).`,
      });
    }
  }
  return insights;
}
