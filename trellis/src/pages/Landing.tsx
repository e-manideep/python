import { Link } from "react-router-dom";
import { dataset } from "../lib/store";
import { portfolioSnapshot, scoreBandCounts } from "../lib/portfolioSelectors";
import { formatINRCompact, formatPct } from "../lib/format";
import { Button, Card, Pill } from "../components/ui";
import { ScoreDial } from "../components/ScoreDial";
import { DistributionBar } from "../components/charts/DistributionBar";
import { TrellisMark } from "../components/Nav";

const COMPARISON = [
  { who: "Listing Portals", does: "Match a buyer or tenant to a property, then disappear.", gap: "No operations after the deal closes." },
  { who: "Property Management Software", does: "Sells owners a tool to track rent and tickets themselves.", gap: "A dashboard, not a team. The owner still does the work." },
  { who: "Facility Management Firms", does: "Runs maintenance and vendors for large commercial buildings.", gap: "Siloed per contract — no unified data or score across an owner's portfolio." },
];

type Capability = "yes" | "partial" | "no";
const CAP_LABEL: Record<Capability, string> = { yes: "Yes", partial: "Partial", no: "No" };
const CAP_CLASS: Record<Capability, string> = { yes: "text-score-good", partial: "text-score-fair", no: "text-score-risk" };

const CAPABILITY_MATRIX: { capability: string; trellis: Capability; enterprise: Capability; midmarket: Capability; facilityMgmt: Capability }[] = [
  { capability: "Full-stack field operations (not just software)", trellis: "yes", enterprise: "no", midmarket: "no", facilityMgmt: "yes" },
  { capability: "Investor-grade financial statements (Rent Roll, T12)", trellis: "yes", enterprise: "yes", midmarket: "partial", facilityMgmt: "no" },
  { capability: "Comp-based rent pricing intelligence", trellis: "yes", enterprise: "yes", midmarket: "partial", facilityMgmt: "no" },
  { capability: "Lease renewal risk & occupancy forecasting", trellis: "yes", enterprise: "partial", midmarket: "partial", facilityMgmt: "no" },
  { capability: "Capital planning & reserve-fund forecasting", trellis: "yes", enterprise: "partial", midmarket: "no", facilityMgmt: "partial" },
  { capability: "Sustainability / ESG index", trellis: "yes", enterprise: "partial", midmarket: "no", facilityMgmt: "partial" },
  { capability: "Unified owner + resident + vendor + ops portal", trellis: "yes", enterprise: "partial", midmarket: "yes", facilityMgmt: "no" },
  { capability: "Single transparent cross-portfolio performance score", trellis: "yes", enterprise: "no", midmarket: "no", facilityMgmt: "no" },
];

const FLYWHEEL = ["More Assets", "More Operations", "More Data", "Better AI", "Better Decisions", "Higher Asset Performance"];

const ROADMAP = [
  { phase: "Phase 1–2", label: "Residential Asset Operations · Community Operations", status: "live" },
  { phase: "Phase 3", label: "Builder Partnerships", status: "next" },
  { phase: "Phase 4–5", label: "Commercial Asset Operations · Asset Operating Platform", status: "future" },
  { phase: "Phase 6–7", label: "Institutional Asset Management · Agricultural Operations", status: "future" },
  { phase: "Phase 8–10", label: "Investment & Capital · Development · Global AOC", status: "future" },
];

const SUBSCORES = [
  { label: "Financial Performance", weight: "30%", desc: "NOI margin, rent-collection efficiency, yield vs. market" },
  { label: "Occupancy Health", weight: "20%", desc: "Occupancy rate, quarter-over-quarter trend" },
  { label: "Maintenance & Condition", weight: "20%", desc: "SLA compliance, open critical tickets, recurring issues" },
  { label: "Compliance", weight: "15%", desc: "RERA, fire safety, insurance, lease documentation" },
  { label: "Resident Satisfaction", weight: "15%", desc: "Service ratings, resolution speed" },
];

export function Landing() {
  const snap = portfolioSnapshot(dataset);
  const bands = scoreBandCounts(dataset);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-100 bg-ink-950 text-white">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 pb-20 relative">
          <div className="flex items-center gap-2 mb-8">
            <TrellisMark />
            <span className="font-display text-lg tracking-tight">Trellis</span>
          </div>
          <div className="grid lg:grid-cols-[1.15fr_0.85fr] gap-14 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-bronze-300 mb-6">
                Residential Asset Operations · Bengaluru &amp; Pune
              </div>
              <h1 className="font-display text-4xl sm:text-5xl leading-[1.08] tracking-tight">
                The operating system for real estate assets.
              </h1>
              <p className="mt-6 text-lg text-ink-300 leading-relaxed max-w-xl">
                Most owners don't professionally operate their real estate — they own it and hope. Trellis operates it: leasing,
                maintenance, vendors, compliance and community, run by our team and instrumented by our technology, so every
                property performs at its potential instead of its inertia.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/portfolio"><Button variant="primary" className="!bg-white !text-ink-950 hover:!bg-bronze-100 !px-5 !py-3 !text-[15px]">Open the Portfolio Dashboard</Button></Link>
                <Link to="/insights"><Button variant="secondary" className="!bg-transparent !text-white !border-white/25 hover:!bg-white/10 !px-5 !py-3 !text-[15px]">See Trellis Intelligence</Button></Link>
              </div>
              <div className="mt-10 grid grid-cols-3 gap-6 max-w-md">
                <div>
                  <div className="font-display text-2xl">{formatINRCompact(snap.aum)}</div>
                  <div className="text-xs text-ink-400 mt-0.5">Assets under operation</div>
                </div>
                <div>
                  <div className="font-display text-2xl">{snap.propertyCount}</div>
                  <div className="text-xs text-ink-400 mt-0.5">Properties, {snap.unitCount.toLocaleString("en-IN")} units</div>
                </div>
                <div>
                  <div className="font-display text-2xl">{formatPct(snap.occupancyPct, 0)}</div>
                  <div className="text-xs text-ink-400 mt-0.5">Portfolio occupancy</div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-3xl p-6 text-ink-950 mx-auto w-full max-w-sm shadow-2xl shadow-black/30">
              <div className="text-center text-xs font-semibold uppercase tracking-wide text-ink-500 mb-2">Portfolio Trellis Score</div>
              <ScoreDial composite={snap.avgScore} band={snap.avgScoreBand} label="Blended across all assets" />
              <div className="mt-4 pt-4 border-t border-ink-100">
                <DistributionBar counts={bands} height={110} compact />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The belief */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-xs font-semibold uppercase tracking-wider text-bronze-700 mb-3">The core belief</div>
        <h2 className="font-display text-3xl sm:text-4xl text-ink-950 leading-tight max-w-3xl">
          Most companies think of real estate as buildings. We think of it as a living asset.
        </h2>
        <p className="mt-5 text-ink-600 text-lg leading-relaxed max-w-3xl">
          Every property generates income, consumes money, appreciates and depreciates, carries legal obligations, and has
          customers who live in it and vendors who service it. Almost no owner runs that as a professionally operated business.
          Trellis exists to do exactly that — not manage it, not rent it, not sell it. <span className="text-ink-950 font-semibold">Operate it.</span>
        </p>
      </section>

      {/* Comparison */}
      <section className="bg-white border-y border-ink-100 py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-bronze-700 mb-3">Why this is not another proptech app</div>
          <h2 className="font-display text-3xl text-ink-950 max-w-2xl mb-10">Everyone else touches one part of the lifecycle. We run the whole asset.</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {COMPARISON.map((c) => (
              <Card key={c.who} className="flex flex-col">
                <div className="text-sm font-semibold text-ink-500 mb-2">{c.who}</div>
                <p className="text-ink-700 text-sm mb-4">{c.does}</p>
                <p className="text-score-risk text-sm font-medium mt-auto pt-4 border-t border-ink-100">{c.gap}</p>
              </Card>
            ))}
            <Card className="!bg-ink-950 !border-ink-950 flex flex-col">
              <div className="text-sm font-semibold text-bronze-300 mb-2">Trellis</div>
              <p className="!text-white text-sm mb-4">
                We are the operator of record — our field teams run leasing, maintenance and community, our technology
                instruments every property, and every stakeholder (owner, resident, vendor) works inside one connected system.
              </p>
              <p className="text-bronze-300 text-sm font-medium mt-auto pt-4 border-t border-white/15">One operator. One data graph. One score.</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Capability matrix */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-xs font-semibold uppercase tracking-wider text-bronze-700 mb-3">A fair look at the competitive landscape</div>
        <h2 className="font-display text-3xl text-ink-950 max-w-2xl mb-3">Where the category leaders are actually strong — and where nobody else covers the whole board.</h2>
        <p className="text-ink-500 max-w-2xl mb-10">
          Enterprise PM/accounting software (Yardi, MRI-class) and mid-market resident-experience platforms (AppFolio,
          Entrata-class) are both genuinely strong at what they do — this isn't a claim that Trellis beats them on every
          axis. It's that nobody combines full-stack operations, institutional-grade reporting, and a single transparent
          score in one place.
        </p>
        <Card padded={false} className="overflow-hidden">
          <div className="overflow-x-auto scroll-thin">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="text-left text-xs text-ink-500 uppercase tracking-wide border-b border-ink-100">
                  <th className="py-3 px-5 font-medium">Capability</th>
                  <th className="py-3 px-3 font-medium text-center">Trellis</th>
                  <th className="py-3 px-3 font-medium text-center">Enterprise PM/Accounting<br /><span className="normal-case font-normal text-ink-400">(Yardi, MRI-class)</span></th>
                  <th className="py-3 px-3 font-medium text-center">Mid-Market PM<br /><span className="normal-case font-normal text-ink-400">(AppFolio, Entrata-class)</span></th>
                  <th className="py-3 px-3 font-medium text-center">Facility Management Firms</th>
                </tr>
              </thead>
              <tbody>
                {CAPABILITY_MATRIX.map((row) => (
                  <tr key={row.capability} className="border-b border-ink-100 last:border-0">
                    <td className="py-3 px-5 text-ink-800">{row.capability}</td>
                    <td className={`py-3 px-3 text-center font-semibold ${CAP_CLASS[row.trellis]}`}>{CAP_LABEL[row.trellis]}</td>
                    <td className={`py-3 px-3 text-center ${CAP_CLASS[row.enterprise]}`}>{CAP_LABEL[row.enterprise]}</td>
                    <td className={`py-3 px-3 text-center ${CAP_CLASS[row.midmarket]}`}>{CAP_LABEL[row.midmarket]}</td>
                    <td className={`py-3 px-3 text-center ${CAP_CLASS[row.facilityMgmt]}`}>{CAP_LABEL[row.facilityMgmt]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        <p className="text-xs text-ink-400 mt-3">
          Based on publicly documented product capabilities as of this analysis, categorized by platform type rather than
          naming individual vendors' current roadmaps, which change frequently.
        </p>
      </section>

      {/* Trellis Score */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20">
        <div className="grid lg:grid-cols-2 gap-14 items-start">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-bronze-700 mb-3">The unique selling point</div>
            <h2 className="font-display text-3xl sm:text-4xl text-ink-950 leading-tight">
              Every asset gets a Trellis Score — a credit score for real estate performance.
            </h2>
            <p className="mt-5 text-ink-600 leading-relaxed">
              A single 300–900 number, benchmarked and updated continuously, that tells an owner or investor exactly how well
              their asset is being operated — and exactly what to fix if it isn't. It's computed transparently from five
              weighted dimensions, and every AI recommendation on the platform traces back to the same underlying numbers.
              Nothing is a black box.
            </p>
            <div className="mt-8 space-y-3">
              {SUBSCORES.map((s) => (
                <div key={s.label} className="flex items-start gap-4 py-3 border-b border-ink-100 last:border-0">
                  <div className="font-mono text-sm font-semibold text-bronze-700 w-10 shrink-0">{s.weight}</div>
                  <div>
                    <div className="text-sm font-semibold text-ink-900">{s.label}</div>
                    <div className="text-sm text-ink-500">{s.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <Card className="bg-ink-50 border-ink-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-500 mb-4">Score bands, portfolio-wide</div>
            <DistributionBar counts={bands} height={240} />
            <div className="grid grid-cols-2 gap-3 mt-6 text-sm">
              <div className="flex items-center gap-2"><Pill tone="good">Excellent / Good</Pill><span className="text-ink-500">{bands.Excellent + bands.Good} properties</span></div>
              <div className="flex items-center gap-2"><Pill tone="watch">Fair</Pill><span className="text-ink-500">{bands.Fair} properties</span></div>
              <div className="flex items-center gap-2"><Pill tone="risk">Needs Attention</Pill><span className="text-ink-500">{bands["Needs Attention"]} properties</span></div>
              <div className="flex items-center gap-2"><Pill>Avg Score</Pill><span className="text-ink-500 font-mono">{snap.avgScore}</span></div>
            </div>
            <Link to="/insights" className="block mt-6 text-sm font-semibold text-bronze-700 hover:text-bronze-800">See what Trellis Intelligence is flagging on the underperforming assets →</Link>
          </Card>
        </div>
      </section>

      {/* Flywheel */}
      <section className="bg-ink-950 text-white py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-bronze-300 mb-3">The flywheel</div>
          <h2 className="font-display text-3xl text-white mb-10 max-w-2xl">Operations generate data. Data compounds into an advantage nobody single-sided can copy.</h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-4">
            {FLYWHEEL.map((step, i) => (
              <div key={step} className="flex items-center gap-2">
                <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium">{step}</div>
                {i < FLYWHEEL.length - 1 && <span className="text-bronze-400">→</span>}
              </div>
            ))}
            <span className="text-bronze-400">↻</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 mt-14">
            <div>
              <div className="font-display text-2xl">4</div>
              <div className="text-sm text-ink-300 mt-1">stakeholder portals unified on one data graph — owner, resident, vendor, ops</div>
            </div>
            <div>
              <div className="font-display text-2xl">{formatINRCompact(snap.platformRevenueAnnualized)}</div>
              <div className="text-sm text-ink-300 mt-1">annualized management-fee revenue at current portfolio scale</div>
            </div>
            <div>
              <div className="font-display text-2xl">{formatPct(snap.collectionEfficiencyPct, 0)}</div>
              <div className="text-sm text-ink-300 mt-1">rent collection efficiency across the portfolio this month</div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-xs font-semibold uppercase tracking-wider text-bronze-700 mb-3">Where this goes</div>
        <h2 className="font-display text-3xl text-ink-950 mb-10 max-w-2xl">This MVP is Phase 1–2 of a ten-phase, twenty-year operating thesis.</h2>
        <div className="grid md:grid-cols-5 gap-4">
          {ROADMAP.map((r) => (
            <Card key={r.phase} className={r.status === "live" ? "border-ink-950 ring-1 ring-ink-950" : ""}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold text-ink-500">{r.phase}</span>
                {r.status === "live" && <Pill tone="good">This demo</Pill>}
                {r.status === "next" && <Pill tone="bronze">Next</Pill>}
              </div>
              <p className="text-sm text-ink-700">{r.label}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ink-100 bg-white py-16">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="font-display text-3xl text-ink-950 mb-4">Walk through every side of the platform.</h2>
          <p className="text-ink-600 mb-8">Switch personas in the top-right corner to see the owner, resident, vendor and operations experience — all reading from the same live data.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/portfolio"><Button variant="primary">Owner / Investor Portfolio</Button></Link>
            <Link to="/resident"><Button variant="secondary">Resident Portal</Button></Link>
            <Link to="/vendor"><Button variant="secondary">Vendor Portal</Button></Link>
            <Link to="/ops"><Button variant="secondary">Field Ops Console</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}
