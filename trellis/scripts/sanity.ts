import { generateDataset } from "../src/data/seed";
import { computeTrellisScore } from "../src/lib/trellisScore";
import { monthlyFinancials, portfolioMonthlyFinancials, assetValue, portfolioAssetValue, currentOccupancyPct } from "../src/lib/financials";
import { generateAllInsights } from "../src/lib/aiInsights";
import { atRiskLeases, leaseExpirationLadder, forecastOccupancy } from "../src/lib/leaseRenewal";
import { capitalForecast, reserveFundStatus, portfolioCapexForecast } from "../src/lib/capitalPlanning";
import { sustainabilityProfile, portfolioSustainability } from "../src/lib/sustainability";
import { rentRoll, t12Statement } from "../src/lib/financialStatements";
import { rowsToCSV } from "../src/lib/csv";

const ds = generateDataset();
const lastMonth = ds.months[ds.months.length - 1];

console.log("=== Dataset shape ===");
console.log("cities", ds.cities.length, "properties", ds.properties.length, "units", ds.units.length);
console.log("residents", ds.residents.length, "leases", ds.leases.length, "rentPayments", ds.rentPayments.length);
console.log("transactions", ds.transactions.length, "workOrders", ds.workOrders.length, "vendors", ds.vendors.length);
console.log("communityPosts", ds.communityPosts.length);
console.log("months", ds.months[0], "..", lastMonth, `(${ds.months.length})`);

console.log("\n=== Orphan reference check ===");
const propIds = new Set(ds.properties.map((p) => p.id));
const unitIds = new Set(ds.units.map((u) => u.id));
const leaseIds = new Set(ds.leases.map((l) => l.id));
const residentIds = new Set(ds.residents.map((r) => r.id));
const vendorIds = new Set(ds.vendors.map((v) => v.id));
let orphans = 0;
for (const u of ds.units) if (!propIds.has(u.propertyId)) orphans++, console.log("orphan unit->property", u.id);
for (const l of ds.leases) {
  if (!unitIds.has(l.unitId)) orphans++, console.log("orphan lease->unit", l.id);
  if (!residentIds.has(l.residentId)) orphans++, console.log("orphan lease->resident", l.id);
}
for (const p of ds.rentPayments) if (!leaseIds.has(p.leaseId)) orphans++, console.log("orphan payment->lease", p.id);
for (const t of ds.transactions) if (!propIds.has(t.propertyId)) orphans++, console.log("orphan txn->property", t.id);
for (const w of ds.workOrders) {
  if (!propIds.has(w.propertyId)) orphans++, console.log("orphan wo->property", w.id);
  if (w.unitId && !unitIds.has(w.unitId)) orphans++, console.log("orphan wo->unit", w.id);
  if (w.vendorId && !vendorIds.has(w.vendorId)) orphans++, console.log("orphan wo->vendor", w.id);
}
console.log(orphans === 0 ? "OK: no orphaned foreign keys" : `FAIL: ${orphans} orphaned references`);

console.log("\n=== Lease date integrity (endDate must follow startDate by a real term) ===");
let badLeases = 0;
let termDays: number[] = [];
for (const l of ds.leases) {
  const days = (new Date(l.endDate).getTime() - new Date(l.startDate).getTime()) / 86400000;
  termDays.push(days);
  if (days <= 0) badLeases++;
}
console.log("leases with endDate <= startDate:", badLeases, badLeases === 0 ? "OK" : "FAIL");
console.log("lease term days: min", Math.min(...termDays).toFixed(0), "max", Math.max(...termDays).toFixed(0), "(expect ~335 for all, single fixed term)");

console.log("\n=== Aggregate consistency: portfolio NOI == sum(property NOI) ===");
const propNoiSum = ds.properties.reduce((s, p) => s + monthlyFinancials(ds, p.id, lastMonth).noi, 0);
const portfolioNoi = portfolioMonthlyFinancials(ds, lastMonth).noi;
console.log("sum(property.noi)", Math.round(propNoiSum), "portfolio.noi", Math.round(portfolioNoi), Math.abs(propNoiSum - portfolioNoi) < 1 ? "OK" : "FAIL");

const propAvSum = ds.properties.reduce((s, p) => s + assetValue(ds, p.id), 0);
const portfolioAv = portfolioAssetValue(ds);
console.log("sum(property.assetValue)", Math.round(propAvSum), "portfolio.assetValue", Math.round(portfolioAv), Math.abs(propAvSum - portfolioAv) < 1 ? "OK" : "FAIL");

console.log("\n=== Score sanity (range + correlation with generator health factor) ===");
let minScore = 900,
  maxScore = 300;
const pairs: [number, number][] = [];
for (const p of ds.properties) {
  const r = computeTrellisScore(ds, p.id, lastMonth);
  if (Number.isNaN(r.composite)) console.log("NaN score for", p.id);
  minScore = Math.min(minScore, r.composite);
  maxScore = Math.max(maxScore, r.composite);
  pairs.push([ds.healthFactors[p.id], r.composite]);
}
console.log("score range", minScore, "-", maxScore, minScore >= 300 && maxScore <= 900 ? "OK" : "FAIL (out of band)");
const bands: Record<string, number> = {};
for (const p of ds.properties) {
  const r = computeTrellisScore(ds, p.id, lastMonth);
  bands[r.band] = (bands[r.band] ?? 0) + 1;
}
console.log("band distribution", bands);
const n = pairs.length;
const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
let cov = 0,
  vx = 0,
  vy = 0;
for (const [x, y] of pairs) {
  cov += (x - mx) * (y - my);
  vx += (x - mx) ** 2;
  vy += (y - my) ** 2;
}
const corr = cov / Math.sqrt(vx * vy);
console.log("correlation(healthFactor, trellisScore) =", corr.toFixed(3), corr > 0.5 ? "OK (scoring meaningfully discriminates)" : "WEAK");

console.log("\n=== Occupancy sanity ===");
for (const p of ds.properties.slice(0, 3)) {
  console.log(p.name, "occupancy", currentOccupancyPct(ds, p.id).toFixed(1) + "%");
}

console.log("\n=== Insights ===");
const insights = generateAllInsights(ds);
console.log("total insights", insights.length);
const bySeverity = { action: 0, watch: 0, info: 0 };
for (const i of insights) bySeverity[i.severity]++;
console.log(bySeverity);
console.log("sample:", insights.slice(0, 3).map((i) => `[${i.category}/${i.severity}] ${i.title} — ${i.metricValue}`));

console.log("\n=== Vendor stats sanity (no vendor with 0 jobs but nonzero rating claims) ===");
for (const v of ds.vendors) {
  if (v.jobsCompleted === 0 && v.slaCompliancePct !== 92) console.log("unexpected default mismatch", v.id);
}
console.log("vendors:", ds.vendors.length, "avg jobsCompleted:", (ds.vendors.reduce((s, v) => s + v.jobsCompleted, 0) / ds.vendors.length).toFixed(1));

console.log("\n=== Portfolio headline (for landing/portfolio page sanity) ===");
const pf = portfolioMonthlyFinancials(ds, lastMonth);
console.log({
  aumCr: (portfolioAv / 1e7).toFixed(1),
  monthlyGrossIncomeL: (pf.grossIncome / 1e5).toFixed(1),
  monthlyNoiL: (pf.noi / 1e5).toFixed(1),
  noiMarginPct: pf.noiMargin.toFixed(1),
  occupancyPct: pf.occupancyPct.toFixed(1),
  collectionEfficiencyPct: pf.collectionEfficiencyPct.toFixed(1),
});

console.log("\n=== Insights by category (each should have signal, not just Compliance) ===");
const byCat: Record<string, number> = {};
for (const i of insights) byCat[i.category] = (byCat[i.category] ?? 0) + 1;
console.log(byCat);
const emptyCategories = ["Rent Optimization", "Maintenance Risk", "Occupancy Forecast", "Renewal Risk", "Vendor Performance", "Compliance", "Capital Planning", "Sustainability"].filter((c) => !byCat[c]);
console.log(emptyCategories.length === 0 ? "OK: every insight category produced at least one insight" : `WATCH: categories with zero insights this run: ${emptyCategories.join(", ")}`);

console.log("\n=== Lease renewal / expiration ladder ===");
const ladder = leaseExpirationLadder(ds);
const totalActiveLeases = ds.leases.filter((l) => l.status !== "Ended").length;
console.log("12mo ladder total leases:", ladder.reduce((s, m) => s + m.leaseCount, 0), "of", totalActiveLeases, "active leases");
const atRisk = atRiskLeases(ds);
console.log("portfolio at-risk leases (prob<50, next 6mo):", atRisk.length);
const forecastSample = forecastOccupancy(ds, ds.properties[0].id);
console.log("sample occupancy forecast:", forecastSample.currentOccupancyPct.toFixed(1), "->", forecastSample.forecastOccupancyPct.toFixed(1));

console.log("\n=== Capital planning ===");
let capexBad = 0;
for (const p of ds.properties) {
  for (const s of capitalForecast(ds, p.id)) {
    if (s.estimatedCost <= 0 || Number.isNaN(s.estimatedCost)) capexBad++;
  }
  const reserve = reserveFundStatus(ds, p.id);
  if (Number.isNaN(reserve.adequacyPct)) capexBad++;
}
console.log("capex/reserve computation errors:", capexBad, capexBad === 0 ? "OK" : "FAIL");
const portfolioCapex = portfolioCapexForecast(ds);
console.log("5yr portfolio capex by year:", portfolioCapex.map((y) => `${y.year}: ${(y.totalCost / 1e5).toFixed(0)}L`));

console.log("\n=== Sustainability ===");
let sustBad = 0;
for (const p of ds.properties) {
  const profile = sustainabilityProfile(ds, p.id);
  if (profile.score < 0 || profile.score > 100 || Number.isNaN(profile.score)) sustBad++;
}
console.log("sustainability score out-of-range:", sustBad, sustBad === 0 ? "OK" : "FAIL");
console.log("portfolio sustainability:", portfolioSustainability(ds));

console.log("\n=== Financial statements (Rent Roll + T12) ===");
const sampleProperty = ds.properties[0];
const roll = rentRoll(ds, sampleProperty.id);
const sampleUnits = ds.units.filter((u) => u.propertyId === sampleProperty.id).length;
console.log("rent roll row count matches unit count:", roll.length === sampleUnits ? "OK" : `FAIL (${roll.length} vs ${sampleUnits})`);
const t12 = t12Statement(ds, [sampleProperty.id]);
const t12NoiCheck = Math.abs(t12.noi - (t12.totalIncome - t12.totalExpenses)) < 1;
console.log("T12 NOI = totalIncome - totalExpenses:", t12NoiCheck ? "OK" : "FAIL");
const t12SumCheck = Math.abs(t12.income.reduce((s, l) => s + l.total, 0) - t12.totalIncome) < 1;
console.log("T12 income lines sum to totalIncome:", t12SumCheck ? "OK" : "FAIL");
try {
  const csv = rowsToCSV(roll.map((r) => ({ Unit: r.unitNumber, Rent: r.monthlyRent })));
  console.log("CSV export smoke test:", csv.split("\n").length === roll.length + 1 ? "OK" : "FAIL", `(${csv.split("\n").length} lines)`);
} catch (e) {
  console.log("CSV export FAIL:", e);
}
