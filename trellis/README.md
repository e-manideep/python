# Trellis — The Operating System for Real Estate Assets

Trellis is a working MVP of an **Asset Operating Company**: instead of listing, financing,
or just software-enabling real estate, Trellis *operates* residential properties on behalf
of owners — leasing, maintenance, vendors, compliance, community — and instruments every
property with one transparent performance number, the **Trellis Score**.

This repo is a real, runnable product, not a mockup: a seeded (but fully computed, not
hardcoded) dataset of 24 properties / ~2,000 units across Bengaluru and Pune drives every
number on every screen — financials, occupancy, scores, and AI recommendations are all
derived live from the same underlying operating data, so nothing shown is fabricated
independently of anything else.

## Why this exists

See [`VISION.md`](./VISION.md) (or the original strategy doc) for the full thesis. In short:
most real estate is owned passively, not operated professionally. Trellis exists to operate
it — starting with residential (this MVP), expanding into commercial and agricultural assets,
eventually becoming the operating infrastructure for physical assets generally.

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

Every **Trellis Intelligence** recommendation (rent pricing, maintenance risk, occupancy
forecast, vendor ranking, compliance alerts) shows the exact numbers and method behind it —
see `src/lib/aiInsights.ts`. This is deliberately a transparent, explainable
rules/statistics engine rather than an opaque model, so every claim on screen is auditable.

## Product surfaces

One deterministic dataset, four stakeholder experiences, switchable live from the top-right
persona menu — the same person can walk through every side of the platform in one sitting:

- **Owner / Investor Portfolio** (`/portfolio`) — AUM, blended NOI, occupancy and score
  trends, city breakdown, top signals, full property table.
- **Property Detail** (`/property/:id`) — score breakdown & history, financials, unit-level
  rent-vs-market, maintenance history, vendors, compliance, community feed.
- **Resident Portal** (`/resident`) — pay rent, raise a maintenance ticket, community feed.
- **Vendor Portal** (`/vendor`) — job queue, SLA, mark work in progress/completed, earnings.
- **Field Ops Console** (`/ops`) — city-wide dispatch kanban with live vendor assignment.
- **Trellis Intelligence** (`/insights`) — the full, filterable recommendation feed.

Interactive actions (pay rent, raise/advance a ticket) persist to `localStorage` and update
every portal that reads that data — there's no backend in this MVP by design (see
Architecture).

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
    trellisScore.ts  the Trellis Score engine (composite + explainable sub-scores)
    financials.ts    NOI, yield, collection efficiency, portfolio aggregation
    aiInsights.ts    Trellis Intelligence: rent pricing, maintenance risk, occupancy
                      forecast, vendor ranking, compliance alerts — each explainable
    store.ts         zustand store: static dataset + persisted interactive overlay
    portfolioSelectors.ts, format.ts, dates.ts, scoreColor.ts, storage.ts
  components/        design system primitives, charts, nav, persona switcher
  pages/             Landing, Portfolio, PropertyDetail, Resident, Vendor, Ops, Insights
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

`npm run verify` runs `scripts/sanity.ts`, which checks the generated dataset and scoring
engine for internal consistency — this was run repeatedly during development to catch and
fix issues (and did: an early version had occupancy artificially ramping from 25%→82% over
the trend window because unit lease-start dates weren't decoupled from lease *renewals*;
this is now fixed and checked). It verifies:

- **No orphaned foreign keys** — every unit→property, lease→unit/resident, payment→lease,
  work order→property/unit/vendor reference resolves.
- **Aggregate consistency** — portfolio-level NOI and asset value equal the sum of every
  individual property's figures, computed independently.
- **Score discrimination** — the Trellis Score correlates strongly (typically r > 0.9) with
  the generator's independent underlying "how well is this asset run" signal, confirming
  the scoring formula is actually discriminating quality rather than producing noise, while
  staying within the documented 300–900 band.
- **Vendor stats** are aggregated from actual completed work orders, not fabricated
  separately from the tickets they claim to summarize.

## Market & data notes

Sample data models a residential portfolio across Bengaluru and Pune (India) — chosen
because the source thesis explicitly names NRIs, builders and Indian regulatory constructs
(RERA) as core stakeholders. All property names, developers, vendors, owners and residents
are synthetic. Currency is INR, formatted in Lakh/Crore per market convention.
