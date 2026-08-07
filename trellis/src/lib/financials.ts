import type { PropertyFinancials, TrellisDataset } from "../types";

export function assetValue(dataset: TrellisDataset, propertyId: string): number {
  return dataset.units.filter((u) => u.propertyId === propertyId).reduce((s, u) => s + u.capitalValue, 0);
}

export function portfolioAssetValue(dataset: TrellisDataset, propertyIds?: string[]): number {
  const ids = propertyIds ?? dataset.properties.map((p) => p.id);
  return ids.reduce((s, id) => s + assetValue(dataset, id), 0);
}

export function occupancyPctAsOf(dataset: TrellisDataset, propertyId: string, month: string): number {
  const propUnits = dataset.units.filter((u) => u.propertyId === propertyId);
  if (propUnits.length === 0) return 0;
  const occupied = propUnits.filter((u) => u.occupiedSinceMonth != null && u.occupiedSinceMonth <= month).length;
  return (occupied / propUnits.length) * 100;
}

export function currentOccupancyPct(dataset: TrellisDataset, propertyId: string): number {
  const propUnits = dataset.units.filter((u) => u.propertyId === propertyId);
  if (propUnits.length === 0) return 0;
  const occupied = propUnits.filter((u) => u.status === "Occupied" || u.status === "Notice Period").length;
  return (occupied / propUnits.length) * 100;
}

export function monthlyFinancials(dataset: TrellisDataset, propertyId: string, month: string): PropertyFinancials {
  const txns = dataset.transactions.filter((t) => t.propertyId === propertyId && t.month === month);
  const grossIncome = txns.filter((t) => t.type.startsWith("income-")).reduce((s, t) => s + t.amount, 0);
  const operatingExpenses = txns.filter((t) => t.type.startsWith("expense-")).reduce((s, t) => s + t.amount, 0);
  const noi = grossIncome - operatingExpenses;
  const noiMargin = grossIncome > 0 ? (noi / grossIncome) * 100 : 0;

  const propUnitIds = new Set(dataset.units.filter((u) => u.propertyId === propertyId).map((u) => u.id));
  const propLeaseIds = new Set(dataset.leases.filter((l) => propUnitIds.has(l.unitId)).map((l) => l.id));
  const duePayments = dataset.rentPayments.filter((p) => propLeaseIds.has(p.leaseId) && p.month === month);
  const due = duePayments.reduce((s, p) => s + p.amount, 0);
  const collected = duePayments.filter((p) => p.status === "Paid" || p.status === "Paid Late").reduce((s, p) => s + p.amount, 0);
  const collectionEfficiencyPct = due > 0 ? (collected / due) * 100 : 100;

  const av = assetValue(dataset, propertyId);
  const yieldPct = av > 0 ? ((noi * 12) / av) * 100 : 0;

  return { propertyId, month, grossIncome, operatingExpenses, noi, noiMargin, collectionEfficiencyPct, yieldPct };
}

export function trailingFinancials(dataset: TrellisDataset, propertyId: string, months: string[]): PropertyFinancials[] {
  return months.map((m) => monthlyFinancials(dataset, propertyId, m));
}

/** Trellis's own management-fee revenue for a given month across the portfolio (or a subset). */
export function platformRevenue(dataset: TrellisDataset, month: string, propertyIds?: string[]): number {
  const ids = new Set(propertyIds ?? dataset.properties.map((p) => p.id));
  return dataset.transactions.filter((t) => t.type === "expense-management-fee" && t.month === month && ids.has(t.propertyId)).reduce((s, t) => s + t.amount, 0);
}

export interface PortfolioFinancials {
  month: string;
  grossIncome: number;
  operatingExpenses: number;
  noi: number;
  noiMargin: number;
  collectionEfficiencyPct: number;
  yieldPct: number;
  occupancyPct: number;
}

export function portfolioMonthlyFinancials(dataset: TrellisDataset, month: string, propertyIds?: string[]): PortfolioFinancials {
  const ids = propertyIds ?? dataset.properties.map((p) => p.id);
  const rows = ids.map((id) => monthlyFinancials(dataset, id, month));
  const grossIncome = rows.reduce((s, r) => s + r.grossIncome, 0);
  const operatingExpenses = rows.reduce((s, r) => s + r.operatingExpenses, 0);
  const noi = grossIncome - operatingExpenses;
  const noiMargin = grossIncome > 0 ? (noi / grossIncome) * 100 : 0;
  const av = portfolioAssetValue(dataset, ids);
  const yieldPct = av > 0 ? ((noi * 12) / av) * 100 : 0;
  const occ = ids.reduce((s, id) => s + occupancyPctAsOf(dataset, id, month), 0) / (ids.length || 1);
  const dues = ids.reduce((s, id) => {
    const propUnitIds = new Set(dataset.units.filter((u) => u.propertyId === id).map((u) => u.id));
    const propLeaseIds = new Set(dataset.leases.filter((l) => propUnitIds.has(l.unitId)).map((l) => l.id));
    return s + dataset.rentPayments.filter((p) => propLeaseIds.has(p.leaseId) && p.month === month).reduce((ss, p) => ss + p.amount, 0);
  }, 0);
  const collected = ids.reduce((s, id) => {
    const propUnitIds = new Set(dataset.units.filter((u) => u.propertyId === id).map((u) => u.id));
    const propLeaseIds = new Set(dataset.leases.filter((l) => propUnitIds.has(l.unitId)).map((l) => l.id));
    return (
      s +
      dataset.rentPayments
        .filter((p) => propLeaseIds.has(p.leaseId) && p.month === month && (p.status === "Paid" || p.status === "Paid Late"))
        .reduce((ss, p) => ss + p.amount, 0)
    );
  }, 0);
  const collectionEfficiencyPct = dues > 0 ? (collected / dues) * 100 : 100;

  return { month, grossIncome, operatingExpenses, noi, noiMargin, collectionEfficiencyPct, yieldPct, occupancyPct: occ };
}
