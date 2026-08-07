import { generateDataset } from "../src/data/seed";
import { computeTrellisScore } from "../src/lib/trellisScore";
import { monthlyFinancials, portfolioMonthlyFinancials, assetValue, portfolioAssetValue, currentOccupancyPct } from "../src/lib/financials";
import { generateAllInsights } from "../src/lib/aiInsights";

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
