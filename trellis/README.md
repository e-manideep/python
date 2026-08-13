# Trellis — The Post-Handover Operating Partner for Residential Real Estate

Trellis operates residential apartments after handover, on behalf of owners who can't or
won't do it themselves — investors and NRIs above all. It is not a listing portal, not
property-management software, not a facility-management vendor: it's the operator of
record for leasing, maintenance, make-ready/interiors, compliance and community, instrumented
by one transparent performance number, the **Trellis Score**.

This repo is a real, runnable product, not a mockup: a seeded (but fully computed, not
hardcoded) dataset of 24 properties / ~2,250 units across Hyderabad and Secunderabad drives every
number on every screen — financials, occupancy, scores, and AI recommendations are all
derived live from the same underlying operating data, so nothing shown is fabricated
independently of anything else. Five stakeholders — owner/investor, resident, vendor, field
ops, and developer — each sign into their own account (see [Accounts &amp; access](#accounts--access)
below) and see only their own side of the same live data.

## The problem, with sources (not invented)

- **63%** of NRI property owners call post-purchase property management "a considerable
  challenge"; **52%** say they want professional help they can't currently get in one place
  (NRI investor survey data, 2023–2025).
- **NRI capital into Indian real estate hit ~$16.3B in 2025, ~20% of all national real
  estate investment**, up from 10% in 2019 — a fast-growing, structurally absentee owner
  base (NoBroker NRI Investment Report; industry trackers).
- **11–25% of residential units sit vacant in major Indian cities** (Census / market vacancy
  data) — capital doing nothing every month it stays that way.
- India's property-management **software** market is only **$91.9M**, against an **$842M**
  property-management **services** market (IMARC Group, 2025) — the category is still
  overwhelmingly manual and fragmented, not software-saturated. That's the whitespace.
- Furnished units earn a documented **20–30% rental premium** over unfurnished in comparable
  metro markets — which is exactly why "Property Services" (make-ready, interiors,
  renovation) is modeled as a real, ROI-backed revenue line here, not a vague add-on.

## Why this exists, and who it's for

See [`VISION.md`](./VISION.md) and the [`docs/`](./docs) folder (founder study, application
ecosystem architecture, and the property-services extension thesis) for the full founder
research this build is based on. In short: real estate ownership
and operation in India is fragmented by default, and Trellis exists to be the single operator
who removes that fragmentation — starting with residential, post-handover.

The go-to-market channel is **the developer, not the individual owner**: a single premium,
gated-community developer whose buyer base skews investor/NRI hands Trellis a concentrated
ecosystem of owners at the exact moment the pain starts (handover), instead of Trellis having
to acquire each owner individually. That's why the Builder Portal exists in this MVP even
though it's technically a "Phase 3" capability in the long-term roadmap — the channel thesis
needed to be provable, not asserted.

## The unique selling point: the Trellis Score

Every property gets a single **300–900 composite score** (deliberately modeled on a credit
score — instantly legible to any stakeholder) computed from five real, weighted sub-scores:

| Dimension | Weight | Computed from |
|---|---|---|
| Financial Performance | 30% | NOI margin, rent-collection efficiency, yield vs. market |
| Occupancy Health | 20% | Occupancy %, quarter-over-quarter trend |
| Maintenance & Condition | 20% | SLA compliance, open critical tickets, recurring-issue concentration, building age |
| Compliance | 15% | RERA, fire safety, insurance, lease documentation, lift AMC |
| Resident Satisfaction | 15% | Service ratings, resolution speed |

Every **Trellis Intelligence** recommendation — rent pricing, maintenance risk, occupancy
forecast, lease renewal risk, vendor ranking, compliance, capital planning, sustainability —
shows the exact numbers and method behind it (see `src/lib/aiInsights.ts`). This is
deliberately a transparent, explainable rules/statistics engine rather than an opaque model,
so every claim on screen is auditable.

## Beyond the basics: the institutional-grade modules

A benchmark against the real competitive landscape (enterprise PM/accounting software like
Yardi/MRI, mid-market platforms like AppFolio/Entrata, and traditional facility management
firms — see the capability matrix on the landing page) turned up five categories of
capability that matter to a real institutional owner and weren't in the first pass. All five
are implemented with real, derived logic — not additional hardcoded numbers:

- **Lease Expiration Ladder & Renewal Risk** (`src/lib/leaseRenewal.ts`) — a per-lease
  renewal-probability model (tenure, rent-vs-market gap, service rating) drives a 12-month
  expiration ladder with concentration-risk detection, and replaces a naive linear-trend
  occupancy forecast with one that's actually mechanistic: current occupancy, minus
  probability-weighted expected non-renewals, plus expected lease-ups extrapolated from the
  trailing fill rate.
- **Capital Planning & Reserve Fund Forecasting** (`src/lib/capitalPlanning.ts`) — the same
  discipline as a condo reserve study: models each major building system's replacement cycle
  (roof, lift, paint, plumbing, electrical, STP) by age, estimates cost, and checks whether
  an assumed reserve-fund policy actually covers the 5-year capital plan. Every assumption
  (e.g. "cycle starts from handover — no prior renovation record") is stated explicitly.
- **Sustainability / ESG Index** (`src/lib/sustainability.ts`) — kept deliberately *separate*
  from the core Trellis Score, mirroring how institutional ESG frameworks (GRESB, etc.)
  report alongside financial performance rather than blending into it. Energy/water
  intensity and a carbon estimate are disclosed as engineering estimates, not metered
  readings — the disclosure is the point.
- **Investor-Grade Rent Roll & T12 Statement** (`src/lib/financialStatements.ts`) — the two
  documents actual real estate diligence asks for, built from the same transaction ledger
  that drives every chart, with CSV export at both the property and portfolio level.
- **Property Services / Make-Ready ROI** (`src/lib/propertyServices.ts`) — models make-ready
  cost by unit configuration and service tier against the sourced 20–30% furnished-rent
  premium, giving a real payback period per vacant unit and per portfolio — this is what
  proves Property Services is a genuine second revenue line, not a slide.
- **Builder / Developer Portal** (`src/lib/builderSelectors.ts`) — a developer's view of
  every community they've handed to Trellis: portfolio occupancy, developer intelligence
  (highest vacancy, highest rent, highest satisfaction, most recurring issue category), and
  a per-project table — proving the developer-channel go-to-market with real numbers.

## Product surfaces

One deterministic dataset, five stakeholder experiences, each behind its own login — the same
person can sign into every account in one sitting to walk through the whole platform:

- **Owner / Investor Portfolio** (`/portfolio`) — AUM, blended NOI, occupancy and score
  trends, city breakdown, lease expiration ladder, 5-year capital plan, sustainability index,
  top signals, full property table, and a trailing-12-month portfolio operating statement.
- **Property Detail** (`/property/:id`) — score breakdown & history, financials, a full Rent
  Roll with CSV export, lease renewal risk, capital plan & reserve-fund adequacy,
  sustainability, maintenance history, vendors, compliance, a T12 statement with CSV export,
  and community feed.
- **Resident Portal** (`/resident`) — pay rent, raise a maintenance ticket, community feed.
- **Vendor Marketplace** (`/marketplace`) — residents browse every trade Trellis manages
  (plumbers, electricians, interior designers and more) by real rating/SLA/cost, book a
  maintenance vendor directly (creates a real, Ops-visible work order), or request a quote
  from an interior designer for a project engagement.
- **Vendor Portal** (`/vendor`) — job queue, SLA, mark work in progress/completed, earnings.
- **Field Ops Console** (`/ops`) — city-wide dispatch kanban with live vendor assignment.
- **Builder / Developer Portal** (`/builder`) — a developer channel-partner's view of their
  own handed-over portfolio, with developer intelligence and per-project performance.
- **Property Services** (`/services`) — the make-ready/interiors/renovation catalog and its
  real, sourced ROI model.
- **Trellis Intelligence** (`/insights`) — the full, filterable recommendation feed across
  all 9 categories.
- **Browse Listings** (`/listings`) — the demand side: every vacant unit across the portfolio,
  filterable/sortable, with a shortlist and a visit-request flow — the public storefront that
  Property Services' make-ready spend is meant to fill.

Interactive actions (pay rent, raise/book a ticket, shortlist a listing) persist to
`localStorage` and update every portal that reads that data — there's no backend in this MVP
by design (see Architecture).

## Accounts & access

There is no shared "god mode" toggle. Each of the five stakeholder roles is a separate demo
account with its own email/password, validated against real credentials (wrong password
fails, correct one succeeds) and its own session stored independently in the browser —
logging into the resident account doesn't touch the investor account's session, the same way
separate accounts would in a real product. `/login` shows the demo credentials for every role
directly on screen (this is a self-contained frontend demo, not a production auth system —
see Architecture), and route guards (`src/components/ProtectedRoute.tsx`) redirect any portal
route to `/login` if that specific role isn't signed in. `/`, `/listings` and `/services` stay
public, matching how a real marketing site works. "Reset demo data & sign out" in the footer
clears all interactive state and every session in one click, for restarting a walkthrough.

## Architecture

Deliberately a **frontend-only** application: a seeded, deterministic dataset generator and
a pure-function domain/scoring engine, both in TypeScript, running client-side. There is no
backend server for this MVP — interactive state (rent payments, ticket status) lives in
`localStorage`. The domain layer (`src/lib/*`) is written independent of the UI, so it can be
moved behind a real API/database as the product scales past a single-tenant demo without
changing its logic.

```
src/
  data/
    rng.ts          seeded PRNG (mulberry32) — same dataset every load
    namePools.ts     realistic Indian real-estate name/locality/vendor pools
    seed.ts          the dataset generator (properties, units, leases, transactions,
                      work orders, vendors, compliance, community posts)
  lib/
    trellisScore.ts      the Trellis Score engine (composite + explainable sub-scores)
    financials.ts        NOI, yield, collection efficiency, portfolio aggregation
    leaseRenewal.ts       renewal-probability model, expiration ladder, occupancy forecast
    capitalPlanning.ts    system lifecycle model, 5yr CapEx forecast, reserve-fund adequacy
    sustainability.ts     energy/water intensity, carbon estimate, ESG index
    propertyServices.ts   make-ready ROI model (Property Services revenue line)
    financialStatements.ts  Rent Roll + T12 statement builders
    builderSelectors.ts   Builder/Developer Portal data slices
    aiInsights.ts        Trellis Intelligence: 9 explainable insight categories
    listings.ts           vacant-unit listing selector (reuses Trellis Score + make-ready)
    auth.ts               demo credential set + per-role session storage/validation
    store.ts             zustand store: static dataset + persisted interactive overlay
    portfolioSelectors.ts, format.ts, dates.ts, scoreColor.ts, storage.ts, csv.ts
  components/        design system primitives, charts, Nav, Footer, PersonaSwitcher,
                     ProtectedRoute (route-level auth guard)
  pages/             Landing, Login, Portfolio, PropertyDetail, Resident, Vendor, Ops,
                     Builder, Services, Marketplace, Listings, Insights
scripts/
  sanity.ts          data-integrity + consistency check (see below)
```

## Running it

```bash
npm install
npm run dev       # http://localhost:5173
```

```bash
npm run typecheck # tsc --noEmit
npm run build      # production build
npm run verify     # data-integrity sanity script (see below)
```

## Verifying the data is real, not "AI slop"

`npm run verify` runs `scripts/sanity.ts`, which checks the generated dataset, scoring
engine, and every derived module for internal consistency — this was run repeatedly during
development to catch and fix real issues, not just as a formality. Two examples it actually
caught: an early version had occupancy artificially ramping from 25%→82% over the trend
window because unit lease-start dates weren't decoupled from lease *renewals*; and a lease
end-date formula bug that could put a lease's end date before its start date (caught by the
lease-date-integrity check below before it reached the Rent Roll). Both are fixed. It
verifies:

- **No orphaned foreign keys** — every unit→property, lease→unit/resident, payment→lease,
  work order→property/unit/vendor reference resolves.
- **Lease date integrity** — every lease's end date follows its start date by a real term.
- **Aggregate consistency** — portfolio-level NOI and asset value equal the sum of every
  individual property's figures, computed independently; T12 statement totals reconcile
  line-by-line; Rent Roll row count matches unit count.
- **Score discrimination** — the Trellis Score correlates strongly (typically r > 0.9) with
  the generator's independent underlying "how well is this asset run" signal, confirming
  the scoring formula is actually discriminating quality rather than producing noise, while
  staying within the documented 300–900 band.
- **Every insight category fires** — a category that never produces a single insight in the
  demo data is a dead feature, so the check flags any of the 9 categories that come back
  empty (and this caught real threshold-calibration issues during development).
- **Vendor stats** are aggregated from actual completed work orders, not fabricated
  separately from the tickets they claim to summarize — with one disclosed exception:
  Interior Design vendors do project engagements, not SLA tickets, so there's no matching
  work-order category to aggregate from; their stats are seeded from the same real make-ready
  cost range (`src/lib/propertyServices.ts`) used for the make-ready ROI model elsewhere,
  not an unrelated invented number. See `src/data/seed.ts` for exactly where this happens.
- **CSV export smoke test** — the export path actually produces well-formed CSV.

## Market & data notes

Sample data models a residential portfolio across Hyderabad and Secunderabad (Telangana,
India) — chosen because the source thesis explicitly names NRIs, builders and Indian
regulatory constructs (RERA) as core stakeholders, and Hyderabad is one of India's fastest-
growing post-handover residential markets (heavy IT-corridor supply in Gachibowli/Kokapet/
Financial District plus strong NRI/institutional investor demand). All property names,
developers, vendors, owners and residents are synthetic. Currency is INR, formatted in
Lakh/Crore per market convention.
