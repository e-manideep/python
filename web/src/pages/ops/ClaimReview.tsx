import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../../api/client";
import type { Claim } from "../../api/types";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusBadge, RiskBadge } from "../../components/StatusBadge";
import { formatDateTime, formatINR } from "../../lib/format";

const DECISION_OPTIONS = [
  ["APPROVED", "Approve in full"],
  ["PARTIALLY_APPROVED", "Approve partially"],
  ["QUERY_RAISED", "Raise a query"],
  ["REJECTED", "Reject"],
  ["SETTLED", "Mark settled (paid out)"],
] as const;

export function OpsClaimReview() {
  const { id } = useParams();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiBusy, setAiBusy] = useState<"" | "summary" | "risk" | "recommend">("");
  const [aiError, setAiError] = useState("");

  const [status, setStatus] = useState<(typeof DECISION_OPTIONS)[number][0]>("APPROVED");
  const [approvedAmount, setApprovedAmount] = useState("");
  const [note, setNote] = useState("");
  const [queryQuestion, setQueryQuestion] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [deciding, setDeciding] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<{ claim: Claim }>(`/claims/${id}`)
      .then((r) => {
        setClaim(r.claim);
        if (r.claim.aiRecommendation) {
          setApprovedAmount(String(r.claim.aiRecommendation.approvedAmount));
          setNote(r.claim.aiRecommendation.justification);
        }
      })
      .finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function runAi(step: "summary" | "risk" | "recommend") {
    setAiError("");
    setAiBusy(step);
    try {
      await api.post(`/claims/${id}/ai/${step === "summary" ? "summarize" : step === "risk" ? "risk" : "recommend"}`);
      load();
    } catch (err) {
      setAiError(err instanceof ApiError ? err.message : "AI request failed");
    } finally {
      setAiBusy("");
    }
  }

  async function submitDecision(e: React.FormEvent) {
    e.preventDefault();
    setDecisionError("");
    setDeciding(true);
    try {
      await api.post(`/claims/${id}/decision`, {
        status,
        approvedAmount: approvedAmount ? Number(approvedAmount) : null,
        note: note || "Decision recorded.",
        queryQuestion: status === "QUERY_RAISED" ? queryQuestion : undefined,
      });
      load();
    } catch (err) {
      setDecisionError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setDeciding(false);
    }
  }

  if (loading) return <div className="text-ink-300">Loading claim…</div>;
  if (!claim) return <div className="text-ink-300">Claim not found.</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-xs text-ink-300">{claim.claimNumber}</div>
          <h1 className="font-serif text-3xl font-medium text-ink">
            {claim.policy.member?.name} — {claim.diagnosis}
          </h1>
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
              <Row label="Type" value={claim.type} />
              <Row label="ICD-10" value={claim.icdCode} />
              <Row label="Provider" value={claim.provider.name} />
              <Row label="Claimed amount" value={formatINR(claim.claimedAmount)} />
              <Row label="Policy" value={`${claim.policy.planName} (${claim.policy.insurer})`} />
              <Row label="Sum insured" value={formatINR(claim.policy.sumInsured)} />
            </div>
          </Card>

          <Card>
            <CardHeader title="Documents on file" />
            <div className="divide-y divide-line">
              {claim.documents.map((d) => (
                <div key={d.id} className="px-5 py-4">
                  <div className="text-sm font-medium text-ink">{d.fileName}</div>
                  <div className="mb-1 text-xs text-ink-300">{d.docType.replaceAll("_", " ")}</div>
                  <p className="text-xs leading-relaxed text-ink-500">{d.extractedText}</p>
                </div>
              ))}
              {claim.documents.length === 0 && <div className="px-5 py-6 text-sm text-ink-300">No documents attached yet.</div>}
            </div>
          </Card>

          <Card>
            <CardHeader title="AI case review" eyebrow="Claude-assisted, human-decided" />
            <div className="space-y-5 px-5 py-5">
              {aiError && <div className="rounded-lg bg-amber-pale px-3 py-2 text-sm text-amber">{aiError}</div>}

              <AiStep
                label="1 · Case summary"
                busy={aiBusy === "summary"}
                onRun={() => runAi("summary")}
                buttonLabel={claim.aiSummary ? "Regenerate" : "Generate summary"}
              >
                {claim.aiSummary && (
                  <div className="space-y-2 text-sm text-ink">
                    <p>{claim.aiSummary.summary}</p>
                    <ul className="list-inside list-disc text-ink-500">
                      {claim.aiSummary.keyFacts.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                    {claim.aiSummary.flags.length > 0 && (
                      <div className="rounded-lg bg-amber-pale px-3 py-2 text-amber">
                        {claim.aiSummary.flags.map((f, i) => (
                          <div key={i}>⚑ {f}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </AiStep>

              <AiStep
                label="2 · Risk assessment"
                busy={aiBusy === "risk"}
                onRun={() => runAi("risk")}
                buttonLabel={claim.aiRisk ? "Regenerate" : "Assess risk"}
              >
                {claim.aiRisk && (
                  <div className="space-y-2 text-sm">
                    <RiskBadge level={claim.aiRisk.riskLevel} score={claim.aiRisk.riskScore} />
                    <ul className="list-inside list-disc text-ink-500">
                      {claim.aiRisk.reasons.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AiStep>

              <AiStep
                label="3 · Adjudication recommendation"
                busy={aiBusy === "recommend"}
                onRun={() => runAi("recommend")}
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
                    <p className="text-ink-500">{claim.aiRecommendation.justification}</p>
                    <div className="rounded-lg border border-line bg-paper px-3 py-2 text-xs text-ink-500">
                      <div className="mb-1 font-medium uppercase tracking-wide text-ink-300">Policy clauses cited</div>
                      {claim.aiRecommendation.clauses.map((c, i) => (
                        <div key={i}>"{c}"</div>
                      ))}
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
            <form onSubmit={submitDecision} className="space-y-4 px-5 py-5">
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">Decision</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as any)} className="input">
                  {DECISION_OPTIONS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              {status !== "QUERY_RAISED" && status !== "REJECTED" && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">Approved amount (INR)</span>
                  <input
                    type="number"
                    value={approvedAmount}
                    onChange={(e) => setApprovedAmount(e.target.value)}
                    className="input"
                  />
                </label>
              )}
              {status === "QUERY_RAISED" && (
                <label className="block">
                  <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">Question for the member</span>
                  <textarea
                    value={queryQuestion}
                    onChange={(e) => setQueryQuestion(e.target.value)}
                    rows={2}
                    className="input"
                    required
                  />
                </label>
              )}
              <label className="block">
                <span className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">
                  Internal note (member gets an AI-drafted plain-language version)
                </span>
                <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} className="input" />
              </label>
              {decisionError && <div className="rounded-lg bg-rose-pale px-3 py-2 text-sm text-rose">{decisionError}</div>}
              <Button type="submit" disabled={deciding} className="w-full">
                {deciding ? "Saving…" : "Save decision"}
              </Button>
            </form>
          </Card>

          <Card>
            <CardHeader title="Status timeline" />
            <div className="space-y-4 px-5 py-5">
              {claim.statusHistory.map((h) => (
                <div key={h.id} className="border-l-2 border-line pl-4">
                  <StatusBadge status={h.status} />
                  <p className="mt-1.5 text-xs leading-relaxed text-ink-500">{h.note}</p>
                  <div className="mt-1 text-[11px] text-ink-300">
                    {h.actorName} · {formatDateTime(h.createdAt)}
                  </div>
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
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-300">{label}</div>
      <div className="text-ink">{value}</div>
    </div>
  );
}

function AiStep({
  label,
  children,
  onRun,
  busy,
  buttonLabel,
  disabled,
  disabledHint,
}: {
  label: string;
  children?: React.ReactNode;
  onRun: () => void;
  busy: boolean;
  buttonLabel: string;
  disabled?: boolean;
  disabledHint?: string;
}) {
  return (
    <div className="rounded-lg border border-line p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-ink">{label}</div>
        <Button type="button" variant="ghost" onClick={onRun} disabled={busy || disabled}>
          {busy ? "Thinking…" : buttonLabel}
        </Button>
      </div>
      {disabled && !children && <p className="text-xs text-ink-300">{disabledHint}</p>}
      {children}
    </div>
  );
}
