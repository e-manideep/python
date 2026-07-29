# Nadi — the clinical AI operating system

Nadi is an ambient clinical documentation and decision-support workspace: a
clinician dictates or types an encounter, Claude structures it into a SOAP
note grounded in the patient's actual chart, and a real-time panel flags drug
interactions and differentials worth considering — all reviewed and signed by
the clinician, never auto-committed. Referrals, scheduling, a patient portal,
and an insurance-claims workflow sit on the same longitudinal record.

See [`STRATEGY.md`](./STRATEGY.md) for the product thesis, competitive
positioning, and roadmap.

## What this is — and isn't

This is a **client-only prototype**: everything runs in your browser, no
server required. Data lives in IndexedDB via [Dexie](https://dexie.org/), and
every Claude call goes straight from the browser to Anthropic's API using a
key you paste into Settings.

That's a deliberate choice for demoing the product fast — it is explicitly
**not** how real patient data should be stored. No encryption at rest, no
audit log, no multi-device access, wiped if you clear your browser storage.
The whole data layer lives behind a repository interface
(`src/data/repositories.ts`) specifically so that swapping in a real backend
later is a rewrite of that one file, not the rest of the app.

## Running it locally

Requirements: Node 18+.

```bash
npm install
npm run dev
```

Open **http://localhost:5174**. The app seeds itself with a small but
realistic patient roster on first load — a diabetes/hypertension follow-up,
a new-patient migraine referral, a pediatric asthma case, an elderly patient
with CKD and polypharmacy, and a post-op knee arthroscopy with an active
insurance claim.

Switch between **Clinician / Patient / Admin** at the top of the sidebar to
see the same data from each seat at the table — this is a viewpoint toggle
for the demo, not a real multi-account login system.

### Adding your Claude API key

Go to **Settings** in the app and paste your key from
<https://console.anthropic.com/>. Without a key, every AI panel shows a clear
"add your key" message instead of failing silently — the rest of the app
(charts, scheduling, referrals, claims workflow) works fully either way.

### Try the flagship flow

1. Clinician view → **Today** → **Resume encounter** on Rohan Iyer's visit.
2. Type (or, in Chrome/Edge, click **Start dictation** and actually speak) a
   few lines about the visit.
3. **Check interactions** — Claude reviews it against Rohan's real allergy
   and medication list.
4. **Generate note** — a structured SOAP note appears, editable, with ICD-10
   suggestions you can choose to add to his problem list.
5. **Sign & complete encounter** — the note is saved to his chart and an
   after-visit summary appears in his Patient Portal.

### Resetting demo data

Settings → **Reset all data** wipes IndexedDB and re-seeds the original
roster.
