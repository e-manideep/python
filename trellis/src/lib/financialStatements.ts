// Investor-grade financial reporting — a proper Rent Roll and a Trailing-12-Month (T12)
// operating statement, the two documents every institutional real estate diligence
// process actually asks for, built here from the same transaction/lease ledger that
// drives every other number in the product (so it can never disagree with the charts).

import type { RentPayment, TrellisDataset, TransactionType } from "../types";
import { monthLabel } from "./dates";

export interface RentRollRow {
  unitId: string;
  unitNumber: string;
  config: string;
  areaSqft: number;
  status: string;
  residentName: string | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  monthlyRent: number;
  deposit: number | null;
  rentPerSqft: number;
}

export function rentRoll(dataset: TrellisDataset, propertyId: string): RentRollRow[] {
  const units = dataset.units.filter((u) => u.propertyId === propertyId);
  return units
    .map((unit) => {
      const lease = dataset.leases.find((l) => l.id === unit.activeLeaseId);
      const resident = lease ? dataset.residents.find((r) => r.id === lease.residentId) : null;
      return {
        unitId: unit.id,
        unitNumber: unit.unitNumber,
        config: unit.config,
        areaSqft: unit.areaSqft,
        status: unit.status,
        residentName: resident?.name ?? null,
        leaseStart: lease?.startDate ?? null,
        leaseEnd: lease?.endDate ?? null,
        monthlyRent: unit.currentRent,
        deposit: lease?.depositAmount ?? null,
        rentPerSqft: Math.round((unit.currentRent / unit.areaSqft) * 100) / 100,
      };
    })
    .sort((a, b) => a.unitNumber.localeCompare(b.unitNumber));
}

const EXPENSE_LINE_ORDER: { type: TransactionType; label: string }[] = [
  { type: "expense-maintenance", label: "Repairs & Maintenance" },
  { type: "expense-utilities", label: "Utilities (Common Area)" },
  { type: "expense-staff", label: "Security & Housekeeping Staff" },
  { type: "expense-property-tax", label: "Property Tax" },
  { type: "expense-insurance", label: "Insurance" },
  { type: "expense-vendor", label: "AMC Contracts (Lift/STP/Landscaping)" },
  { type: "expense-marketing", label: "Vacancy Marketing" },
  { type: "expense-management-fee", label: "Trellis Management Fee" },
];
const INCOME_LINE_ORDER: { type: TransactionType; label: string }[] = [
  { type: "income-rent", label: "Gross Rental Income" },
  { type: "income-other", label: "Other Income (Parking, Amenities, Fees)" },
];

export interface T12Line {
  label: string;
  monthly: number[];
  total: number;
}

export interface T12Statement {
  months: string[];
  monthLabels: string[];
  income: T12Line[];
  expenses: T12Line[];
  totalIncomeByMonth: number[];
  totalExpensesByMonth: number[];
  noiByMonth: number[];
  totalIncome: number;
  totalExpenses: number;
  noi: number;
}

export function t12Statement(dataset: TrellisDataset, propertyIds?: string[]): T12Statement {
  const months = dataset.months.slice(-12);
  const ids = new Set(propertyIds ?? dataset.properties.map((p) => p.id));
  const txns = dataset.transactions.filter((t) => ids.has(t.propertyId) && months.includes(t.month));

  function lineFor(type: TransactionType, label: string): T12Line {
    const monthly = months.map((m) => txns.filter((t) => t.type === type && t.month === m).reduce((s, t) => s + t.amount, 0));
    return { label, monthly, total: monthly.reduce((s, v) => s + v, 0) };
  }

  const income = INCOME_LINE_ORDER.map((l) => lineFor(l.type, l.label));
  const expenses = EXPENSE_LINE_ORDER.map((l) => lineFor(l.type, l.label));

  const totalIncomeByMonth = months.map((_, i) => income.reduce((s, l) => s + l.monthly[i], 0));
  const totalExpensesByMonth = months.map((_, i) => expenses.reduce((s, l) => s + l.monthly[i], 0));
  const noiByMonth = months.map((_, i) => totalIncomeByMonth[i] - totalExpensesByMonth[i]);

  return {
    months,
    monthLabels: months.map(monthLabel),
    income,
    expenses,
    totalIncomeByMonth,
    totalExpensesByMonth,
    noiByMonth,
    totalIncome: totalIncomeByMonth.reduce((s, v) => s + v, 0),
    totalExpenses: totalExpensesByMonth.reduce((s, v) => s + v, 0),
    noi: noiByMonth.reduce((s, v) => s + v, 0),
  };
}

/** Used only to keep rent-roll collection-status columns honest against real payment records. */
export function latestPaymentStatus(dataset: TrellisDataset, leaseId: string): RentPayment | null {
  const payments = dataset.rentPayments.filter((p) => p.leaseId === leaseId).sort((a, b) => (a.month < b.month ? 1 : -1));
  return payments[0] ?? null;
}
