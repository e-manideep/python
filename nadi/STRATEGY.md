# Nadi — Strategy Brief

## The wedge, stated plainly

Nadi is a clinical documentation and decision-support workspace for doctors — an
ambient scribe that turns a dictated or typed encounter into a structured note,
plus real-time drug-interaction and differential support grounded in the
patient's actual chart. Referrals, scheduling, a patient portal, and insurance
claims sit on the same longitudinal record underneath it, because a chart
worth writing to well is worth building the rest of the practice around — but
documentation is the wedge, not a feature list.

This is a deliberate narrowing from the original CareWeave/Aarogya
Sanjeevani/NadiOS "coordination OS across home care, hospitals, and insurers"
concept. That vision competes for distribution against IHX (40%+ of India's
cashless claims, Perfios-owned) and Vitraya (funded, AI-native claims
decisioning) on the claims side — a fight a new entrant doesn't win by
out-building. Documentation is a genuinely thinner, more fundable, less
incumbent-occupied wedge in India, and it's where the category-defining
companies in this brief (Abridge, Nuance DAX, Suki, Nabla, Ambience) all
entered first.

## Why documentation, specifically

A clinician spends more time on notes than on patients — the number cited
across US health systems is 1–2 hours of documentation for every hour of
direct patient time, and every serious ambient-scribe company (Abridge,
Nuance/Microsoft DAX, Suki, Nabla, Ambience) exists because that ratio is
the single most expensive, most hated part of a clinician's day. It's also
the highest-leverage place for AI in a clinical workflow: the note already
gets rewritten from memory after the visit anyway, so structuring it well
the first time is pure time given back, not a new step added.

The India-specific opening: nobody has built a documentation product that
takes Indian clinical reality seriously — multilingual dictation, an 80-patient
OPD where "saves time or don't ship" is the only acceptable bar, and clinics
that can't justify Western per-seat EMR pricing. That's a different company
than a US ambient-scribe clone.

## Competitive landscape

| Company | What they actually do | Where they stop |
|---|---|---|
| Abridge, Nuance DAX, Suki, Nabla, Ambience | Ambient scribe → structured note | US-market pricing and workflows; none are India-native |
| OpenEvidence | Clinical knowledge retrieval at the point of care | Doesn't touch documentation or the chart |
| Commure, Innovaccer | Care-ops infrastructure, population health data | Platform plays, not a clinician-facing daily tool |
| Hippocratic AI | Voice agents for low-acuity care tasks | Not a documentation or decision-support product |
| Epic, Oracle Cerner, Athenahealth | Full EHR of record | Legacy UX, multi-year sales cycles, not AI-native |
| IHX (Perfios), Vitraya | Claims processing / adjudication AI | Different problem entirely — we don't compete here |

Nadi's bet: be the ambient-documentation layer that also owns referrals and
claims triage on the *same* chart, so the note a doctor writes today is the
same record that drafts the referral letter and adjudicates the claim
tomorrow — something none of the single-purpose scribes do, and something
the claims-only players can't do because they never see the encounter.

## Moat — not "we have an LLM"

1. **The chart, not the model.** Every signed note, every accepted ICD
   suggestion, every referral outcome makes the next suggestion for *that
   clinic's* patient population better. The model is commodity; the
   longitudinal, structured record built from real encounters is not.
2. **Workflow lock-in through the problem list.** Once medications, allergies,
   and problems are being actively maintained through Nadi's note-signing
   flow, ripping it out means rebuilding the chart elsewhere — a much higher
   switching cost than "we tried a different scribe."
3. **India-specific clinical tuning.** Prompts, ICD suggestions, and decision
   support tuned against Indian disease burden, drug brand names, and
   multilingual dictation are a compounding data/tuning advantage a US-built
   competitor entering India would have to redo from zero.
4. **The claims bridge.** A clinical note that already contains the
   diagnosis, the plan, and the documentation an insurer needs is a
   structurally faster, lower-leakage claim than one reconstructed after the
   fact by a billing desk — a real efficiency edge over claims-only
   competitors, without Nadi having to become a TPA itself.

## What this build is (and isn't) today

This is a working prototype: every screen is real and functional against a
browser-local database, and every AI call genuinely hits Claude once a key is
added — nothing is mocked. It is explicitly *not* production infrastructure:
patient data belongs behind a server with real authentication, encryption at
rest, and an audit log, none of which browser storage provides. The
repository-pattern data layer (`src/data/repositories.ts`) exists specifically
so that swap is a rewrite of one file, not a rearchitecture.

## Roadmap

**First 3 months** — Design partner with 2–3 clinics; replace browser storage
with a real backend (Postgres + auth + audit log) behind the same repository
interface; get voice dictation accuracy validated against real Indian-English
and Hindi/regional-language clinical speech, not just US English; ship the
note-signing → problem-list feedback loop as the core retention mechanic.

**Year 1** — FHIR-based import/export so Nadi can sit alongside an existing
EMR rather than requiring a rip-and-replace; ABDM/ABHA identity integration;
expand decision support from interactions/differentials to guideline-based
alerts (e.g. NCD screening due, drug dosing adjustments for renal function);
first paid clinics on a per-clinician subscription.

**Year 5** — The claims bridge becomes a real product: insurers integrate
directly with Nadi-originated notes for faster, lower-leakage adjudication,
turning documentation quality into a monetizable second product rather than
a supporting feature. Nadi's own structured, longitudinal, multilingual
clinical dataset — not any single model — is the asset a later acquirer or
platform partner is actually buying.

## Monetization

Per-clinician SaaS subscription (documentation + decision support) is the
primary line — the same model Abridge/Suki/Nabla have proven willing buyers
exist for. Claims-adjudication revenue share and structured-data licensing
(the Flatiron Health playbook) are real but multi-year lines, not year-one
revenue.
