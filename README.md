# ClaimSetu — India's AI-native health insurance claims platform

ClaimSetu is a working, end-to-end health insurance claims platform: policyholders file
claims, network hospitals submit cashless pre-authorisations, and insurer claims
adjudicators review them in a workspace where Claude drafts the case summary, flags
risk, and recommends a decision with the exact policy clause behind it — a human always
makes the final call.

It's the insurance module of a broader "healthcare coordination OS" concept; this repo
builds that one module all the way down to a real database and a real UI, rather than
another pitch deck.

## Why this shape

Health insurance claims in India move through a well-defined lifecycle — submission,
pre-authorisation, adjudication, query, settlement — that's increasingly standardised
around the National Health Claims Exchange (NHCX). Insurers lose an estimated ₹26,000
crore a year to claims leakage and slow, manual review. The bet here is narrow on
purpose: instead of an EMR, a marketplace, and a claims engine all at once, this is
*just* the claims/RCM layer, built properly, with AI doing the reading so a human
adjudicator can do the deciding faster.

## Architecture

```
claimsetu/
├── server/          Express + TypeScript API, Prisma ORM over SQLite
│   ├── prisma/      schema.prisma, seed.ts (demo data)
│   └── src/
│       ├── routes/       auth, policies, claims, chat, analytics, providers
│       ├── services/     claude.ts — every Claude API call lives here
│       ├── middleware/   JWT auth + role checks
│       └── lib/          Prisma client, unique-ID generators
└── web/             React + Vite + TypeScript, Tailwind CSS
    └── src/
        ├── pages/         one folder per portal (member, provider, ops, admin)
        ├── components/    Shell (nav), Card, StatusBadge/RiskBadge, Button
        └── state/auth.tsx JWT session context
```

**Data model** (`server/prisma/schema.prisma`): Member → Policy → Claim → Documents /
StatusHistory / Queries, plus Provider (network hospitals) and ChatMessage (policy
assistant history). Every record gets a realistic unique ID — an ABHA-style 14-digit
health ID, an insurer-style policy number (`CST/HLT/2026/000123`), and a claim number
(`CLM-2026-000045`) — generated in `server/src/lib/ids.ts`.

**Four portals, one ledger**, gated by role on both the API and the UI:

| Role | Can... |
|---|---|
| Policyholder (`MEMBER`) | view their policy, file claims, respond to queries, chat with the AI policy assistant |
| Network provider (`PROVIDER`) | look up a patient's policy by number, submit cashless/reimbursement claims |
| Claims adjudicator (`INSURER_OPS`) | work the claims queue, run the AI case review, record the final decision |
| Admin (`ADMIN`) | everything ops can do, plus the portfolio analytics dashboard |

**The AI review pipeline** (`server/src/services/claude.ts`), run claim-by-claim from
the adjudicator's workspace:

1. **Case summary** — reads the claim + attached documents, produces a plain-language
   brief and flags anything inconsistent or missing.
2. **Risk assessment** — scores the claim 0–100 against length-of-stay norms, cost
   norms, document completeness, and the member's claim history.
3. **Adjudication recommendation** — given the summary, the risk assessment, and the
   *actual policy wording on file*, drafts an approve/query/reject recommendation that
   cites the specific clause it relied on.
4. **Member messaging** — when the adjudicator records a decision, Claude drafts the
   plain-language version the member sees in their claim timeline.
5. **Policy assistant** — a member-facing chat, grounded only in their own policy
   wording, that tells them to raise a query with their insurer rather than guessing
   when the wording doesn't say.

A human adjudicator reviews and can override every AI output before anything is final —
nothing auto-approves or auto-rejects.

## Running it locally

Requirements: Node 18+ (tested on Node 22). No external database or services needed —
everything runs on SQLite.

```bash
npm run setup    # installs server + web deps, runs the Prisma migration, seeds demo data
npm run dev      # runs the API (port 4000) and the web app (port 5173) together
```

Open **http://localhost:5173** and sign in with any seeded account (password
`demo1234` for all of them — quick-select buttons are on the login screen):

| Role | Email |
|---|---|
| Policyholder (Ananya Rao) | `member@demo.claimsetu.in` |
| Policyholder (Vikram Nair) | `vikram@demo.claimsetu.in` |
| Network provider | `provider@demo.claimsetu.in` |
| Claims adjudicator | `ops@demo.claimsetu.in` |
| Admin | `admin@demo.claimsetu.in` |

The demo data ships with claims in every stage of the lifecycle — settled, approved,
a query awaiting a member response, a fresh submission with no AI review yet, and one
high-value cardiac claim pre-flagged HIGH risk — so the adjudicator queue and the
analytics dashboard are meaningful from the first login.

### Adding your Claude API key

The whole platform works without one — every AI panel shows a plain "connect your
Claude API key" message instead of crashing. To turn the AI features on:

```bash
cp server/.env.example server/.env
# edit server/.env and set ANTHROPIC_API_KEY=sk-ant-...
npm run dev:server   # restart just the API to pick up the key
```

Get a key at <https://console.anthropic.com/>. `ANTHROPIC_MODEL` in `server/.env`
defaults to `claude-sonnet-4-5-20250929` — bump it to any newer Claude model your key
supports.

### Resetting the demo data

```bash
cd server && npm run db:seed     # re-seed on top of the existing schema
# or, for a fully clean slate:
rm server/prisma/dev.db && npm run db:setup --prefix ..
```

## What's deliberately out of scope

This is the insurance/claims module only, not the full coordination-OS vision (home
care marketplace, clinical EMR, ABDM data bridge) described in the earlier pitch decks
this was scoped down from — those are future modules, not this build. Document
upload is simulated as pasted "extracted text" rather than real file upload + OCR, so
the AI review pipeline can be demoed without wiring up a scanning service; swapping in
real OCR only touches `ClaimDocument.extractedText`, nothing else in the model.
