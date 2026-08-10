import { dataset } from "../lib/store";
import { SERVICE_TIERS, FURNISHED_UPLIFT_PCT, makeReadyOpportunity, portfolioServicesOpportunity } from "../lib/propertyServices";
import { formatINR, formatINRCompact, formatPct } from "../lib/format";
import { Card, Pill, SectionHeading } from "../components/ui";

const LIFECYCLE = ["Handover", "Inspection", "Make-Ready", "Interiors / Renovation", "Leasing", "Operations", "Renewal or Move-out", "Make-Ready again"];

const REVENUE_LINES = [
  { service: "Property onboarding & handover inspection", revenue: "One-time fee" },
  { service: "Make-ready (repairs, painting, cleaning)", revenue: "Service margin" },
  { service: "Interiors (modular kitchen, wardrobes, design)", revenue: "Project margin" },
  { service: "Leasing & tenant verification", revenue: "Leasing fee" },
  { service: "Property management & rent collection", revenue: "Recurring monthly fee" },
  { service: "Maintenance coordination", revenue: "Recurring / per-job fee" },
  { service: "Renovation (older units)", revenue: "Project revenue" },
  { service: "Lease renewal", revenue: "Renewal fee" },
];

export function Services() {
  const opportunity = portfolioServicesOpportunity(dataset);
  const sampleUnit = dataset.units.find((u) => u.config === "2BHK" && u.status === "Vacant") ?? dataset.units.find((u) => u.config === "2BHK")!;
  const sample = makeReadyOpportunity(sampleUnit);

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
      <div className="mb-10">
        <div className="text-xs font-semibold uppercase tracking-wide text-bronze-700">Property Services</div>
        <h1 className="font-display text-3xl sm:text-4xl text-ink-950 mt-1 max-w-3xl">
          We don't just manage the asset — we're the execution layer that keeps it functional, attractive, and income-producing.
        </h1>
        <p className="text-ink-500 mt-3 max-w-2xl">
          An owner shouldn't have to coordinate a plumber, a painter, an interior designer, and a leasing agent separately.
          Trellis runs a managed contractor network across every trade — we own the customer relationship, pricing, SLA and
          quality; certified partners execute the physical work. One relationship, full accountability.
        </p>
      </div>

      <Card className="mb-8">
        <SectionHeading title="The full residential lifecycle we operate" />
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
          {LIFECYCLE.map((step, i) => (
            <div key={step} className="flex items-center gap-2">
              <div className="rounded-full border border-ink-200 bg-ink-50 px-3.5 py-1.5 text-sm font-medium text-ink-800">{step}</div>
              {i < LIFECYCLE.length - 1 && <span className="text-bronze-600">→</span>}
            </div>
          ))}
          <span className="text-bronze-600">↻</span>
        </div>
      </Card>

      <div className="mb-8">
        <SectionHeading title="Make-ready service tiers" description="Applied by unit configuration and target rent bracket — not a one-size-fits-all package." />
        <div className="grid md:grid-cols-3 gap-5">
          {SERVICE_TIERS.map((tier) => (
            <Card key={tier.tier} className="flex flex-col">
              <Pill tone={tier.tier === "Premium" ? "bronze" : "neutral"}>{tier.tier}</Pill>
              <ul className="text-sm text-ink-600 mt-3 space-y-1.5 mb-4">
                {tier.includes.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <span className="text-score-good mt-0.5">✓</span> {item}
                  </li>
                ))}
              </ul>
              <div className="mt-auto pt-3 border-t border-ink-100 text-xs text-ink-400">
                Indicative 2BHK cost multiplier: <span className="font-mono text-ink-700">{tier.costMultiplier}×</span> base
              </div>
            </Card>
          ))}
        </div>
      </div>

      <Card className="mb-8">
        <SectionHeading
          title="This is a real, sourced ROI calculation — not a sales pitch"
          description="Furnished units in comparable Indian metro markets earn a documented 20–30% rental premium over unfurnished. We model the midpoint of that range."
        />
        <div className="grid sm:grid-cols-2 gap-6 items-center">
          <div className="rounded-xl bg-ink-50 p-5">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">Worked example — a typical 2BHK</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-600">Unfurnished market rent</span><span className="font-mono text-ink-800">{formatINR(sample.currentMarketRent)}/mo</span></div>
              <div className="flex justify-between"><span className="text-ink-600">Furnished potential rent (+{formatPct(FURNISHED_UPLIFT_PCT * 100, 0)})</span><span className="font-mono text-ink-800">{formatINR(sample.furnishedPotentialRent)}/mo</span></div>
              <div className="flex justify-between"><span className="text-ink-600">Recommended tier</span><span className="font-semibold text-ink-900">{sample.recommendedTier}</span></div>
              <div className="flex justify-between"><span className="text-ink-600">Estimated make-ready spend</span><span className="font-mono text-ink-800">{formatINR(sample.estimatedCost)}</span></div>
              <div className="flex justify-between border-t border-ink-200 pt-2 mt-2"><span className="text-ink-900 font-semibold">Payback period</span><span className="font-mono font-semibold text-score-good">{sample.paybackMonths.toFixed(0)} months</span></div>
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-3">Applied across the current portfolio</div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-ink-600">Vacant units, portfolio-wide</span><span className="font-mono text-ink-800">{opportunity.vacantUnits}</span></div>
              <div className="flex justify-between"><span className="text-ink-600">Combined monthly uplift potential</span><span className="font-mono text-ink-800">{formatINRCompact(opportunity.totalMonthlyUpliftPotential)}</span></div>
              <div className="flex justify-between"><span className="text-ink-600">Combined estimated spend</span><span className="font-mono text-ink-800">{formatINRCompact(opportunity.totalMakeReadyCost)}</span></div>
              <div className="flex justify-between border-t border-ink-200 pt-2 mt-2"><span className="text-ink-900 font-semibold">Average payback</span><span className="font-mono font-semibold text-score-good">{opportunity.avgPaybackMonths.toFixed(0)} months</span></div>
            </div>
            <p className="text-xs text-ink-400 mt-3">See the flagged opportunities on individual properties under Trellis Intelligence → Property Services.</p>
          </div>
        </div>
      </Card>

      <Card>
        <SectionHeading title="One property, multiple revenue lines" description="We don't depend on a single monthly management fee — each stage of the lifecycle is its own line item." />
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-500 uppercase tracking-wide border-y border-ink-100">
                <th className="py-2.5 pr-3 font-medium">Service</th>
                <th className="py-2.5 pl-3 font-medium">Revenue type</th>
              </tr>
            </thead>
            <tbody>
              {REVENUE_LINES.map((r) => (
                <tr key={r.service} className="border-b border-ink-100 last:border-0">
                  <td className="py-2.5 pr-3 text-ink-800">{r.service}</td>
                  <td className="py-2.5 pl-3 text-ink-500">{r.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
