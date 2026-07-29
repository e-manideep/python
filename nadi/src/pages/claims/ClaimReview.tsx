import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import * as repo from "../../data/repositories";
import type { Claim, ClaimStatus, Encounter, Patient, Policy } from "../../data/types";
import { assessClaimRisk, recommendClaimDecision, summarizeClaim } from "../../ai/claude";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusBadge, RiskBadge } from "../../components/Badge";
import { formatDateTime, formatINR } from "../../lib/format";

const DECISION_OPTIONS: [ClaimStatus, string][] = [
  ["APPROVED", "Approve in full"],
  ["PARTIALLY_APPROVED", "Approve partially"],
  ["QUERY_RAISED", "Raise a query"],
  ["REJECTED", "Reject"],
  ["SETTLED", "Mark settled (paid out)"],
];

export function ClaimReview() {
  const { id } = useParams();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [encounter, setEncounter] = useState<Encounter | null>(null);
  const [aiBusy, setAiBusy] = useState<"" | "summary" | "risk" | "recommend">("");
  const [aiError, setAiError] = useState("");

  const [status, setStatus] = useState<ClaimStatus>("APPROVED");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    if (!id) return;
    const c = await repo.claims.get(id);
    if (!c) return;
    setClaim(c);
    const [p, pol, e] = await Promise.all([repo.patients.get(c.patientId), repo.policies.get(c.policyId), repo.encounters.get(c.encounterId)]);
    setPatient(p ?? null);
    setPolicy(pol ?? null);
    setEncounter(e ?? null);
    if (c.aiRecommendation) {
      setApprovedAmount(String(c.aiRecommendation.approvedAmount));
      setNote(c.aiRecommendation.justification);
    }
  }

  function noteText(): string {
    if (!encounter?.note) return `Chief complaint: ${encounter?.chiefComplaint ?? "not documented"}. No signed note on file yet.`;
    const n = encounter.note;
    return `Subjective: ${n.subjective}\nObjective: ${n.objective}\nAssessment: ${n.assessment}\nPlan: ${n.plan}`;
  }

  async function runSummary() {
    if (!claim || !encounter) return;
    setAiError(""); setAiBusy("summary");
    try {
      const summary = await summarizeClaim({ diagnosis: encounter.chiefComplaint, claimedAmount: claim.claimedAmount, noteText: noteText() });
      await repo.claims.update(claim.id, { aiSummary: summary, status: claim.status === "SUBMITTED" ? "AI_TRIAGED" : claim.status });
      load();
    } catch (err: any) { setAiError(err.message); } finally { setAiBusy(""); }
  }

  async function runRisk() {
    if (!claim || !policy) return;
    setAiError(""); setAiBusy("risk");
    try {
      const priorCount = (await repo.claims.forPatient(claim.patientId)).filter((c) => c.id !== claim.id).length;
      const risk = await assessClaimRisk({ diagnosis: encounter?.chiefComplaint ?? "", claimedAmount: claim.claimedAmount, sumInsured: policy.sumInsured, priorClaimCount: priorCount });
      await repo.claims.update(claim.id, { aiRisk: risk });
      load();
    } catch (err: any) { setAiError(err.message); } finally { setAiBusy(""); }
  }

  async function runRecommend() {
    if (!claim || !policy || !claim.aiSummary || !claim.aiRisk) return;
    setAiError(""); setAiBusy("recommend");
    try {
      const rec = await recommendClaimDecision({
        diagnosis: encounter?.chiefComplaint ?? "",
        claimedAmount: claim.claimedAmount,
        policyWording: policy.policyWording,
        caseSummary: claim.aiSummary.summary,
        riskSummary: `${claim.aiRisk.riskLevel} (${claim.aiRisk.riskScore}): ${claim.aiRisk.reasons.join("; ")}`,
      });
      await repo.claims.update(claim.id, { aiRecommendation: rec, status: "UNDER_REVIEW" });
      load();
    } catch (err: any) { setAiError(err.message); } finally { setAiBusy(""); }
  }

  async function saveDecision() {
    if (!claim) return;
    setSaving(true);
    const event = { status, note: note || "Decision recorded.", actor: "Dr. Meera Krishnan", createdAt: new Date().toISOString() };
    await repo.claims.update(claim.id, {
      status,
      approvedAmount: approvedAmount ? Number(approvedAmount) : claim.approvedAmount,
      history: [...claim.history, event],
    });
    setSaving(false);
    load();
  }

  if (!claim || !patient) return <div className="text-ink-faint">Loading claim…</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-xs text-ink-faint">{claim.claimNumber}</div>
          <h1 className="font-display text-3xl font-bold text-ink">{patient.name}</h1>
          <p className="text-sm text-ink-soft">{encounter?.chiefComplaint}</p>
        </div>
        <div className="flex items-center gap-2">
          {claim.aiRisk && <RiskBadge level={claim.aiRisk.riskLevel} score={claim.aiRisk.riskScore} />}
          <StatusBadge status={claim.status} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-6">
          <Card>
            <CardHeader title="Claim details" />
            <div className="grid grid-cols-2 gap-4 px-5 py-5 text-sm">
              <Row label="Claimed amount" value={formatINR(claim.claimedAmount)} />
              <Row label="Sum insured" value={policy ? formatINR(policy.sumInsured) : "—"} />
              <Row label="Policy" value={policy ? `${policy.planName} (${policy.insurer})` : "—"} />
              <Row label="Filed" value={formatDateTime(claim.submittedAt)} />
            </div>
          </Card>

          <Card>
            <CardHeader title="AI case review" eyebrow="Claude-assisted, human-decided" />
            <div className="space-y-4 p-5">
              {aiError && <div className="rounded-lg bg-warn-pale px-3 py-2 text-sm text-warn">{aiError}</div>}

              <AiStep label="1 · Case summary" busy={aiBusy === "summary"} onRun={runSummary} buttonLabel={claim.aiSummary ? "Regenerate" : "Generate summary"}>
                {claim.aiSummary && (
                  <div className="space-y-2 text-sm text-ink">
                    <p>{claim.aiSummary.summary}</p>
                    <ul className="list-inside list-disc text-ink-soft">{claim.aiSummary.keyFacts.map((f, i) => <li key={i}>{f}</li>)}</ul>
                    {claim.aiSummary.flags.map((f, i) => <div key={i} className="rounded-lg bg-warn-pale px-3 py-2 text-warn">⚑ {f}</div>)}
                  </div>
                )}
              </AiStep>

              <AiStep label="2 · Risk assessment" busy={aiBusy === "risk"} onRun={runRisk} buttonLabel={claim.aiRisk ? "Regenerate" : "Assess risk"}>
                {claim.aiRisk && (
                  <div className="space-y-2 text-sm">
                    <RiskBadge level={claim.aiRisk.riskLevel} score={claim.aiRisk.riskScore} />
                    <ul className="list-inside list-disc text-ink-soft">{claim.aiRisk.reasons.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </div>
                )}
              </AiStep>

              <AiStep
                label="3 · Adjudication recommendation"
                busy={aiBusy === "recommend"}
                onRun={runRecommend}
                buttonLabel={claim.aiRecommendation ? "Regenerate" : "Get recommendation"}
                disabled={!claim.aiSummary || !claim.aiRisk}
                disabledHint="Run the case summary and risk assessment first."
              >
                {claim.aiRecommendation && (
                  <div className="space-y-2 text-sm text-ink">
                    <div className="inline-flex rounded-full bg-ink px-3 py-1 text-xs font-semibold text-white">
                      Suggests: {claim.aiRecommendation.recommendation.replaceAll("_", " ")}
                      {claim.aiRecommendation.approvedAmount > 0 && ` · ${formatINR(claim.aiRecommendation.approvedAmount)}`}
                    </div>
                    <p className="text-ink-soft">{claim.aiRecommendation.justification}</p>
                    <div className="rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink-soft">
                      <div className="mb-1 font-medium uppercase tracking-wide text-ink-faint">Policy clauses cited</div>
                      {claim.aiRecommendation.clauses.map((c, i) => <div key={i}>"{c}"</div>)}
                    </div>
                  </div>
                )}
              </AiStep>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Record decision" />
            <div className="space-y-4 p-5">
              <label className="block">
                <span className="label">Decision</span>
                <select className="input" value={status} onChange={(e) => setStatus(e.target.value as ClaimStatus)}>
                  {DECISION_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="label">Approved amount (INR)</span>
                <input className="input" type="number" value={approvedAmount} onChange={(e) => setApprovedAmount(e.target.value)} />
              </label>
              <label className="block">
                <span className="label">Note</span>
                <textarea className="input min-h-[80px]" value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
              <Button onClick={saveDecision} disabled={saving} className="w-full">{saving ? "Saving…" : "Save decision"}</Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Status timeline" />
            <div className="space-y-4 p-5">
              {claim.history.map((h, i) => (
                <div key={i} className="border-l-2 border-line pl-4">
                  <StatusBadge status={h.status} />
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">{h.note}</p>
                  <div className="mt-1 text-[11px] text-ink-faint">{h.actor} · {formatDateTime(h.createdAt)}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="text-ink">{value}</div>
    </div>
  );
}

function AiStep({ label, children, onRun, busy, buttonLabel, disabled, disabledHint }: {
  label: string; children?: React.ReactNode; onRun: () => void; busy: boolean; buttonLabel: string; disabled?: boolean; disabledHint?: string;
}) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-ink">{label}</div>
        <Button type="button" variant="ghost" onClick={onRun} disabled={busy || disabled}>{busy ? "Thinking…" : buttonLabel}</Button>
      </div>
      {disabled && !children && <p className="text-xs text-ink-faint">{disabledHint}</p>}
      {children}
    </div>
  );
}
