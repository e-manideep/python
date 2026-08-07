import type { CityId, ScoreBand, TrellisDataset } from "../types";
import { monthLabel } from "./dates";
import { assetValue, portfolioAssetValue, portfolioMonthlyFinancials, platformRevenue } from "./financials";
import { bandFor, computeTrellisScore } from "./trellisScore";

export function scoredProperties(dataset: TrellisDataset, month?: string) {
  const m = month ?? dataset.months[dataset.months.length - 1];
  return dataset.properties.map((property) => ({ property, score: computeTrellisScore(dataset, property.id, m) })).sort((a, b) => b.score.composite - a.score.composite);
}

export function scoreBandCounts(dataset: TrellisDataset, month?: string): Record<ScoreBand, number> {
  const counts: Record<ScoreBand, number> = { Excellent: 0, Good: 0, Fair: 0, "Needs Attention": 0 };
  for (const { score } of scoredProperties(dataset, month)) counts[score.band]++;
  return counts;
}

export function portfolioSnapshot(dataset: TrellisDataset, month?: string) {
  const m = month ?? dataset.months[dataset.months.length - 1];
  const prevMonth = dataset.months[dataset.months.length - 4] ?? dataset.months[0];
  const fin = portfolioMonthlyFinancials(dataset, m);
  const prevFin = portfolioMonthlyFinancials(dataset, prevMonth);
  const aum = portfolioAssetValue(dataset);
  const scored = scoredProperties(dataset, m);
  const avgScore = Math.round(scored.reduce((s, p) => s + p.score.composite, 0) / scored.length);
  const revenue = platformRevenue(dataset, m);
  const revenuePrev = platformRevenue(dataset, prevMonth);

  return {
    month: m,
    aum,
    grossIncome: fin.grossIncome,
    noi: fin.noi,
    noiMargin: fin.noiMargin,
    occupancyPct: fin.occupancyPct,
    occupancyPctDelta: fin.occupancyPct - prevFin.occupancyPct,
    collectionEfficiencyPct: fin.collectionEfficiencyPct,
    yieldPct: fin.yieldPct,
    avgScore,
    avgScoreBand: bandFor(avgScore),
    propertyCount: dataset.properties.length,
    unitCount: dataset.units.length,
    cityCount: dataset.cities.length,
    residentCount: dataset.residents.length,
    vendorCount: dataset.vendors.length,
    platformRevenue: revenue,
    platformRevenueDelta: revenuePrev > 0 ? ((revenue - revenuePrev) / revenuePrev) * 100 : 0,
    platformRevenueAnnualized: revenue * 12,
  };
}

export function portfolioTrend(dataset: TrellisDataset, propertyIds?: string[]) {
  return dataset.months.map((month) => {
    const fin = portfolioMonthlyFinancials(dataset, month, propertyIds);
    return { month, label: monthLabel(month), noi: fin.noi, noiMargin: fin.noiMargin, occupancy: fin.occupancyPct, collectionEfficiencyPct: fin.collectionEfficiencyPct };
  });
}

export interface CityBreakdown {
  cityId: CityId;
  name: string;
  propertyCount: number;
  unitCount: number;
  aum: number;
  noi: number;
  occupancyPct: number;
  avgScore: number;
}

export function cityBreakdown(dataset: TrellisDataset, month?: string): CityBreakdown[] {
  const m = month ?? dataset.months[dataset.months.length - 1];
  return dataset.cities.map((city) => {
    const props = dataset.properties.filter((p) => p.cityId === city.id);
    const propIds = props.map((p) => p.id);
    const fin = portfolioMonthlyFinancials(dataset, m, propIds);
    const aum = propIds.reduce((s, id) => s + assetValue(dataset, id), 0);
    const scores = props.map((p) => computeTrellisScore(dataset, p.id, m).composite);
    const avgScore = scores.length ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : 0;
    return {
      cityId: city.id,
      name: city.name,
      propertyCount: props.length,
      unitCount: props.reduce((s, p) => s + p.totalUnits, 0),
      aum,
      noi: fin.noi,
      occupancyPct: fin.occupancyPct,
      avgScore,
    };
  });
}
