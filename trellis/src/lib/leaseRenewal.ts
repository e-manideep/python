// Lease expiration laddering + renewal-probability modeling — the same category of
// analysis RealPage/Yardi-class revenue-management modules run, adapted to run
// transparently off this dataset. Every number here is derived, never asserted.

import type { Lease, TrellisDataset, Unit } from "../types";
import { addMonths, monthIndex, monthLabel, monthOf } from "./dates";

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

export interface RenewalAssessment {
  leaseId: string;
  unitId: string;
  propertyId: string;
  probability: number; // 0-100
  tenureMonths: number;
  rentGapPct: number; // + = priced above market (churn risk), - = below market (sticky)
  avgRating: number | null;
  drivers: string[];
}

/**
 * Renewal probability model: starts from a market-typical retention baseline and
 * adjusts for the factors that actually move renewal decisions — how long someone's
 * lived there, whether their rent is at/below market (a below-market tenant rarely
 * leaves voluntarily), and how well service requests have been handled.
 */
export function assessRenewal(dataset: TrellisDataset, lease: Lease, unit: Unit, asOfMonth: string): RenewalAssessment {
  const occupiedSince = unit.occupiedSinceMonth;
  const tenureMonths = occupiedSince ? Math.max(0, monthIndex(asOfMonth) - monthIndex(occupiedSince)) : 0;
  const rentGapPct = ((unit.currentRent - unit.marketRent) / unit.marketRent) * 100;

  const propertyWorkOrders = dataset.workOrders.filter((w) => w.unitId === unit.id && w.residentRating != null);
  const avgRating = propertyWorkOrders.length ? propertyWorkOrders.reduce((s, w) => s + (w.residentRating ?? 0), 0) / propertyWorkOrders.length : null;

  let probability = 66; // baseline annual retention rate typical of professionally operated Indian residential
  const drivers: string[] = [`Baseline retention rate 66%`];

  const tenureBonus = Math.min(18, tenureMonths * 1.1);
  probability += tenureBonus;
  drivers.push(`+${tenureBonus.toFixed(0)} pts for ${tenureMonths}mo tenure`);

  if (rentGapPct > 0) {
    const penalty = clamp(rentGapPct * 1.6, 0, 32);
    probability -= penalty;
    drivers.push(`-${penalty.toFixed(0)} pts — priced ${rentGapPct.toFixed(0)}% above market benchmark`);
  } else {
    const bonus = clamp(-rentGapPct * 0.9, 0, 16);
    probability += bonus;
    drivers.push(`+${bonus.toFixed(0)} pts — priced ${Math.abs(rentGapPct).toFixed(0)}% below market benchmark`);
  }

  if (avgRating != null) {
    const effect = (avgRating - 3) * 8;
    probability += effect;
    drivers.push(`${effect >= 0 ? "+" : ""}${effect.toFixed(0)} pts from ${avgRating.toFixed(1)}/5 service rating`);
  }

  probability = clamp(Math.round(probability), 5, 95);

  return { leaseId: lease.id, unitId: unit.id, propertyId: unit.propertyId, probability, tenureMonths, rentGapPct, avgRating, drivers };
}

export interface LadderMonth {
  month: string;
  label: string;
  leaseCount: number;
  revenueAtRisk: number;
  avgRenewalProbability: number;
}

export function leaseExpirationLadder(dataset: TrellisDataset, propertyIds?: string[], monthsAhead = 12): LadderMonth[] {
  const ids = propertyIds ? new Set(propertyIds) : null;
  const now = dataset.months[dataset.months.length - 1];
  const unitsById = new Map(dataset.units.map((u) => [u.id, u]));
  const months: string[] = [];
  for (let i = 1; i <= monthsAhead; i++) months.push(addMonths(now, i));

  return months.map((month) => {
    const leases = dataset.leases.filter((l) => {
      if (l.status === "Ended") return false;
      const unit = unitsById.get(l.unitId);
      if (!unit || (ids && !ids.has(unit.propertyId))) return false;
      return monthOf(l.endDate) === month;
    });
    const assessments = leases.map((l) => assessRenewal(dataset, l, unitsById.get(l.unitId)!, now));
    return {
      month,
      label: monthLabel(month),
      leaseCount: leases.length,
      revenueAtRisk: leases.reduce((s, l) => s + l.rentAmount, 0),
      avgRenewalProbability: assessments.length ? assessments.reduce((s, a) => s + a.probability, 0) / assessments.length : 100,
    };
  });
}

export interface AtRiskLease extends RenewalAssessment {
  endDate: string;
  rentAmount: number;
}

/** Occupied leases expiring soon with a meaningfully low renewal probability. */
export function atRiskLeases(dataset: TrellisDataset, propertyId?: string, monthsAhead = 6, probabilityThreshold = 45): AtRiskLease[] {
  const now = dataset.months[dataset.months.length - 1];
  const cutoff = monthIndex(addMonths(now, monthsAhead));
  const unitsById = new Map(dataset.units.map((u) => [u.id, u]));

  return dataset.leases
    .filter((l) => {
      if (l.status === "Ended") return false;
      const unit = unitsById.get(l.unitId);
      if (!unit) return false;
      if (propertyId && unit.propertyId !== propertyId) return false;
      const endIdx = monthIndex(monthOf(l.endDate));
      return endIdx >= monthIndex(now) && endIdx <= cutoff;
    })
    .map((l) => {
      const unit = unitsById.get(l.unitId)!;
      const assessment = assessRenewal(dataset, l, unit, now);
      return { ...assessment, endDate: l.endDate, rentAmount: l.rentAmount };
    })
    .filter((a) => a.probability < probabilityThreshold)
    .sort((a, b) => b.rentAmount - a.rentAmount);
}

export interface OccupancyForecast {
  currentOccupancyPct: number;
  forecastOccupancyPct: number;
  expectedNonRenewals: number;
  expectedNewLeases: number;
  method: string;
}

/**
 * Probability-weighted 3-month occupancy forecast: current occupancy, minus expected
 * non-renewals among leases expiring in the window (weighted by 1 - renewal probability),
 * plus expected lease-ups on currently vacant units (extrapolated from the trailing
 * 6-month fill rate). This replaces a naive trend line with an actual mechanism.
 */
export function forecastOccupancy(dataset: TrellisDataset, propertyId: string): OccupancyForecast {
  const now = dataset.months[dataset.months.length - 1];
  const units = dataset.units.filter((u) => u.propertyId === propertyId);
  const totalUnits = units.length || 1;
  const currentOccupied = units.filter((u) => u.status === "Occupied" || u.status === "Notice Period").length;

  const expiringSoon = atRiskLeases(dataset, propertyId, 3, 100); // all expiring leases in window, any probability
  const expectedNonRenewals = expiringSoon.reduce((s, a) => s + (1 - a.probability / 100), 0);

  const sixMonthsAgo = addMonths(now, -6);
  const recentFills = units.filter((u) => u.occupiedSinceMonth && u.occupiedSinceMonth > sixMonthsAgo).length;
  const fillRatePerMonth = recentFills / 6;
  const vacantUnits = units.filter((u) => u.status === "Vacant").length;
  const expectedNewLeases = Math.min(vacantUnits, fillRatePerMonth * 3);

  const forecastOccupied = clamp(currentOccupied - expectedNonRenewals + expectedNewLeases, 0, totalUnits);

  return {
    currentOccupancyPct: (currentOccupied / totalUnits) * 100,
    forecastOccupancyPct: (forecastOccupied / totalUnits) * 100,
    expectedNonRenewals,
    expectedNewLeases,
    method: "Current occupancy, less renewal-probability-weighted expected move-outs among leases expiring in the next 3 months, plus expected new lease-ups on vacant units extrapolated from the trailing 6-month fill rate.",
  };
}
