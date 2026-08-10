import { Link } from "react-router-dom";
import { dataset } from "../lib/store";
import { portfolioSnapshot, scoreBandCounts } from "../lib/portfolioSelectors";
import { builderPortfolioSummary } from "../lib/builderSelectors";
import { portfolioServicesOpportunity } from "../lib/propertyServices";
import { formatINRCompact, formatPct } from "../lib/format";
import { Button, Card, Pill } from "../components/ui";
import { ScoreDial } from "../components/ScoreDial";
import { DistributionBar } from "../components/charts/DistributionBar";
import { TrellisMark } from "../components/Nav";
import { FLAGSHIP_DEVELOPER } from "../data/seed";

const MARKET_STATS = [
  { value: "$16.3B", label: "NRI capital into Indian real estate in 2025 — ~20% of all national investment, up from 10% in 2019.", src: "NoBroker NRI Investment Report; industry trackers, 2025" },
  { value: "63%", label: "of NRI owners call post-purchase property management a considerable challenge; 52% say they want professional help they can't currently get in one place.", src: "NRI investor survey data, 2023–2025" },
  { value: "11–25%", label: "of residential units sit vacant in major Indian cities — capital doing nothing, still costing tax, maintenance and opportunity every month.", src: "Census / market vacancy data" },
  { value: "$91.9M", label: "is the entire size of India's property-management software market versus an $842M property-management services market — the category is still overwhelmingly manual, not software-saturated.", src: "IMARC Group, 2025" },
];

const COMPARISON = [
  { who: "Listing Portals", does: "Match a buyer or tenant to a property, then disappear.", gap: "No operations after the deal closes." },
  { who: "Property Management Software", does: "Sells owners a tool to track rent and tickets themselves.", gap: "A dashboard, not a team. The owner still does the work." },
  { who: "Facility Management Firms", does: "Runs maintenance and vendors for large commercial buildings.", gap: "Siloed per contract — no unified data or score across an owner's portfolio." },
];

const INDIA_COMPARATORS = [
  { name: "NoBroker", role: "Brokerage-free listings, now expanding into management", gap: "Built around finding the next deal, not operating the asset for years afterward." },
  { name: "MyGate / NoBrokerHood", role: "Gate security, billing, and society communication", gap: "Solves the community layer, not asset performance — no financials, no score, no owner reporting." },
  { name: "Urban Company", role: "On-demand home services marketplace, 20–35% take rate", gap: "One-off jobs, no accountability for the property's ongoing income, occupancy, or condition." },
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
  { capability: "Make-ready / interiors as a revenue line, not a referral", trellis: "yes", enterprise: "no", midmarket: "no", facilityMgmt: "partial" },
  { capability: "Developer / builder portfolio intelligence", trellis: "yes", enterprise: "no", midmarket: "no", facilityMgmt: "no" },
  { capability: "Unified owner + resident + vendor + builder + ops portal", trellis: "yes", enterprise: "partial", midmarket: "yes", facilityMgmt: "no" },
  { capability: "Single transparent cross-portfolio performance score", trellis: "yes", enterprise: "no", midmarket: "no", facilityMgmt: "no" },
];

const OBJECTIONS = [
  {
    q: "Why not NoBroker, CBRE, or JLL?",
    a: "Their primary models and customer segments are different. NoBroker is built around finding the next deal; CBRE and JLL are built for large commercial/institutional portfolios. We're the post-handover operating partner for residential assets — leasing, maintenance, owner reporting, resident operations, vendor coordination and make-ready services, across the entire lifecycle of one asset, not a single transaction.",
  },
  {
    q: "Why can't a developer just build this themselves?",
    a: "They absolutely could. The question is whether it's the best use of their team. A professional operations business needs leasing staff, maintenance coordination, a vendor network, inspections, compliance and ongoing technology — different capabilities from acquiring land, developing, and selling homes. We let a developer's team keep focusing on what it does best while we own what happens after handover.",
  },
  {
    q: "Why should a developer care, once the unit is sold?",
    a: "Because vacant, poorly-serviced units hurt their brand with exactly the buyer segment — investors and NRIs — that decides whether the next tower sells. A single operating partner with visible portfolio-wide performance data is a stronger asset to a developer's reputation than a dozen uncoordinated vendors the owner has to manage alone.",
  },
];

const ROADMAP = [
  { phase: "Phase 0", years: "0–12 mo", label: "Validate the problem — interview owners, NRIs, developers, map the post-handover lifecycle", status: "live" },
  { phase: "Phase 1", years: "Yr 1–2", label: "Residential asset operations: leasing, maintenance, inspections, owner reporting", status: "live" },
  { phase: "Phase 2", years: "Yr 2–4", label: "Community operations at scale, across full developer communities", status: "next" },
  { phase: "Phase 3", years: "Yr 3–5", label: "Developer platform: investor onboarding, handover support, warranty coordination", status: "built-early" },
  { phase: "Phase 4", years: "Yr 4–6", label: "Technology platform built around proven operating processes", status: "next" },
  { phase: "Phase 5–9", years: "Yr 5–20", label: "Commercial · Institutional portfolios · Agriculture · Capital & Development", status: "future" },
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
  const builder = builderPortfolioSummary(dataset, FLAGSHIP_DEVELOPER);
  const services = portfolioServicesOpportunity(dataset);

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
                Post-Handover Residential Asset Operations · Bengaluru &amp; Pune
              </div>
              <h1 className="font-display text-4xl sm:text-5xl leading-[1.08] tracking-tight">
                You bought the apartment. Who's actually running it?
              </h1>
              <p className="mt-6 text-lg text-ink-300 leading-relaxed max-w-xl">
                Most investor and NRI apartment owners get the keys and then inherit a second, unpaid job: finding a tenant,
                chasing a plumber, reading a lease, reconciling rent — alone, often from another country. Trellis is the
                single operating partner that runs the property instead, end to end, from the day of handover onward.
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

      {/* The problem, with numbers */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-xs font-semibold uppercase tracking-wider text-bronze-700 mb-3">The problem, not a pitch</div>
        <h2 className="font-display text-3xl sm:text-4xl text-ink-950 leading-tight max-w-3xl mb-4">
          This isn't a problem we invented to sell a product. It's already sized, surveyed, and documented.
        </h2>
        <p className="text-ink-600 max-w-3xl mb-10">
          Residential real estate ownership and operation in India is fragmented by default — finding tenants, verifying
          them, collecting rent, coordinating a plumber, an electrician, a painter, staying compliant, keeping documents in
          order. For an owner who doesn't live in the city — or the country — that fragmentation is the entire experience of
          owning the asset.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {MARKET_STATS.map((s) => (
            <Card key={s.value} className="flex flex-col">
              <div className="font-display text-3xl text-ink-950">{s.value}</div>
              <p className="text-sm text-ink-600 mt-2 flex-1">{s.label}</p>
              <p className="text-[11px] text-ink-400 mt-3 pt-3 border-t border-ink-100">{s.src}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Comparison */}
      <section className="bg-white border-y border-ink-100 py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-bronze-700 mb-3">Why this is not another proptech app</div>
          <h2 className="font-display text-3xl text-ink-950 max-w-2xl mb-10">Everyone else touches one part of the lifecycle. We run the whole asset.</h2>
          <div className="grid md:grid-cols-3 gap-5 mb-5">
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
                instruments every property, and every stakeholder (owner, resident, vendor, developer) works inside one
                connected system.
              </p>
              <p className="text-bronze-300 text-sm font-medium mt-auto pt-4 border-t border-white/15">One operator. One data graph. One score.</p>
            </Card>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {INDIA_COMPARATORS.map((c) => (
              <div key={c.name} className="rounded-xl border border-ink-100 p-4">
                <div className="text-sm font-semibold text-ink-900">{c.name}</div>
                <div className="text-xs text-ink-500 mt-0.5 mb-2">{c.role}</div>
                <p className="text-sm text-score-risk">{c.gap}</p>
              </div>
            ))}
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
          axis. It's that nobody combines full-stack operations, institutional-grade reporting, a make-ready revenue line,
          developer intelligence, and a single transparent score in one place.
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

      {/* GTM: through the developer */}
      <section className="bg-ink-950 text-white py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-bronze-300 mb-3">Go-to-market: the channel is the developer, not the owner</div>
          <h2 className="font-display text-3xl text-white max-w-2xl mb-5">
            One premium developer community concentrates dozens of investor-owners in one place, at the exact moment the pain starts.
          </h2>
          <p className="text-ink-300 max-w-3xl mb-10">
            Acquiring owners one at a time is slow and expensive. A developer partnership does it wholesale: a single premium,
            gated-community developer — the kind whose towers skew heavily toward investor and NRI buyers — hands us a
            concentrated ecosystem of owners the moment they take possession, instead of us finding each one individually.
            Below is exactly what that partnership looks like in the product: the actual portfolio of one flagship developer
            partner, computed live.
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="font-display text-2xl">{builder.projectCount}</div>
              <div className="text-xs text-ink-400 mt-1">projects operated post-handover</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="font-display text-2xl">{formatINRCompact(builder.totalUnits)}</div>
              <div className="text-xs text-ink-400 mt-1">units across those projects</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="font-display text-2xl">{formatPct(builder.occupancyPct, 0)}</div>
              <div className="text-xs text-ink-400 mt-1">occupancy across the partner's portfolio</div>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="font-display text-2xl">{builder.avgTrellisScore}</div>
              <div className="text-xs text-ink-400 mt-1">blended Trellis Score, this developer</div>
            </div>
          </div>
          <Link to="/builder" className="text-sm font-semibold text-bronze-300 hover:text-bronze-200">Open the Builder Portal for {FLAGSHIP_DEVELOPER} →</Link>
        </div>
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

      {/* Property Services */}
      <section className="bg-white border-y border-ink-100 py-20">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-bronze-700 mb-3">Beyond a management fee</div>
          <h2 className="font-display text-3xl text-ink-950 max-w-2xl mb-5">Property Services turn a vacant apartment into an income-generating asset — and a second revenue line.</h2>
          <p className="text-ink-600 max-w-3xl mb-10">
            Make-ready, interiors and renovation aren't a side hustle — India's interior design market is $36.9B (2025) and
            renovation specifically is growing faster (13.35% CAGR) than new-construction interior work. Furnished units earn
            a documented 20–30% rental premium over unfurnished. We run this as a managed contractor network — we own
            pricing, SLA and quality; certified partners execute — not a headcount-heavy trades business.
          </p>
          <div className="grid sm:grid-cols-3 gap-5 mb-8">
            <StatCard label="Vacant units, portfolio-wide" value={String(services.vacantUnits)} />
            <StatCard label="Monthly uplift potential" value={formatINRCompact(services.totalMonthlyUpliftPotential)} />
            <StatCard label="Average payback" value={`${services.avgPaybackMonths.toFixed(0)} months`} />
          </div>
          <Link to="/services" className="text-sm font-semibold text-bronze-700 hover:text-bronze-800">See the service catalog and the full ROI model →</Link>
        </div>
      </section>

      {/* Objections */}
      <section className="max-w-5xl mx-auto px-5 sm:px-8 py-20">
        <div className="text-xs font-semibold uppercase tracking-wider text-bronze-700 mb-3">Anticipated questions, answered directly</div>
        <h2 className="font-display text-3xl text-ink-950 mb-10">The obvious objections — not avoided.</h2>
        <div className="space-y-8">
          {OBJECTIONS.map((o) => (
            <div key={o.q} className="border-b border-ink-100 pb-8 last:border-0">
              <div className="text-lg font-display text-ink-950 mb-2">{o.q}</div>
              <p className="text-ink-600">{o.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Flywheel */}
      <section className="bg-ink-950 text-white py-20">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="text-xs font-semibold uppercase tracking-wider text-bronze-300 mb-3">The flywheel</div>
          <h2 className="font-display text-3xl text-white mb-10 max-w-2xl">Operations generate data. Data compounds into an advantage nobody single-sided can copy.</h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-4">
            {["More Assets", "More Operations", "More Data", "Better AI", "Better Decisions", "Higher Asset Performance"].map((step, i, arr) => (
              <div key={step} className="flex items-center gap-2">
                <div className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium">{step}</div>
                {i < arr.length - 1 && <span className="text-bronze-400">→</span>}
              </div>
            ))}
            <span className="text-bronze-400">↻</span>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 mt-14">
            <div>
              <div className="font-display text-2xl">5</div>
              <div className="text-sm text-ink-300 mt-1">stakeholder portals unified on one data graph — owner, resident, vendor, developer, ops</div>
            </div>
            <div>
              <div className="font-display text-2xl">{formatINRCompact(snap.platformRevenueAnnualized)}</div>
              <div className="text-sm text-ink-300 mt-1">annualized management-fee revenue at current portfolio scale — before Property Services revenue</div>
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
        <h2 className="font-display text-3xl text-ink-950 mb-3 max-w-2xl">This MVP validates Phase 0–1, and proves the Phase 3 developer-channel thesis early.</h2>
        <p className="text-ink-500 max-w-2xl mb-10">
          V1 scope was deliberately narrow: Internal Operations, Owner Portal, Resident Portal, Vendor Portal, and a Builder
          Dashboard — nothing else. The Builder Portal is normally a Phase 3 capability; we built it now because the
          developer-channel thesis is the whole point of the go-to-market, and it needed to be provable, not asserted.
        </p>
        <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-4">
          {ROADMAP.map((r) => (
            <Card key={r.phase} className={r.status === "live" || r.status === "built-early" ? "border-ink-950 ring-1 ring-ink-950" : ""}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold text-ink-500">{r.phase} · {r.years}</span>
              </div>
              {r.status === "live" && <Pill tone="good">This demo</Pill>}
              {r.status === "built-early" && <Pill tone="bronze">Built early</Pill>}
              {r.status === "next" && <Pill>Next</Pill>}
              <p className="text-sm text-ink-700 mt-2">{r.label}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-ink-100 bg-white py-16">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center">
          <h2 className="font-display text-3xl text-ink-950 mb-4">Walk through every side of the platform.</h2>
          <p className="text-ink-600 mb-8">Switch personas in the top-right corner to see the owner, resident, vendor, developer and operations experience — all reading from the same live data.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link to="/portfolio"><Button variant="primary">Owner / Investor Portfolio</Button></Link>
            <Link to="/resident"><Button variant="secondary">Resident Portal</Button></Link>
            <Link to="/vendor"><Button variant="secondary">Vendor Portal</Button></Link>
            <Link to="/ops"><Button variant="secondary">Field Ops Console</Button></Link>
            <Link to="/builder"><Button variant="secondary">Builder Portal</Button></Link>
            <Link to="/services"><Button variant="secondary">Property Services</Button></Link>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <div className="text-xs font-medium uppercase tracking-wide text-ink-500 mb-1">{label}</div>
      <div className="font-display text-2xl text-ink-950">{value}</div>
    </Card>
  );
}
