import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { api, ApiError } from "../api/client";
import type { Claim } from "../api/types";
import { Card, CardHeader } from "../components/Card";
import { Button } from "../components/Button";
import { StatusBadge } from "../components/StatusBadge";
import { formatDateTime, formatINR } from "../lib/format";

export function ClaimDetail() {
  const { id } = useParams();
  const [claim, setClaim] = useState<Claim | null>(null);
  const [loading, setLoading] = useState(true);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function load() {
    setLoading(true);
    api
      .get<{ claim: Claim }>(`/claims/${id}`)
      .then((r) => setClaim(r.claim))
      .finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  async function respondToQuery(queryId: string) {
    setError("");
    setSubmitting(true);
    try {
      await api.post(`/claims/queries/${queryId}/respond`, { response });
      setResponse("");
      load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="text-ink-300">Loading claim…</div>;
  if (!claim) return <div className="text-ink-300">Claim not found.</div>;

  const openQuery = claim.queries.find((q) => !q.resolved);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-xs text-ink-300">{claim.claimNumber}</div>
          <h1 className="font-serif text-3xl font-medium text-ink">{claim.diagnosis}</h1>
        </div>
        <StatusBadge status={claim.status} />
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
              {claim.approvedAmount !== null && (
                <Row label="Approved amount" value={formatINR(claim.approvedAmount)} highlight />
              )}
              <Row label="Filed" value={formatDateTime(claim.submittedAt)} />
            </div>
          </Card>

          {openQuery && (
            <Card className="border-amber/30">
              <CardHeader title="Query from your insurer" eyebrow="Action needed" />
              <div className="space-y-3 px-5 py-5">
                <p className="text-sm text-ink">{openQuery.question}</p>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  rows={3}
                  className="input"
                  placeholder="Type your response…"
                />
                {error && <div className="text-sm text-rose">{error}</div>}
                <Button onClick={() => respondToQuery(openQuery.id)} disabled={submitting || !response.trim()}>
                  {submitting ? "Sending…" : "Send response"}
                </Button>
              </div>
            </Card>
          )}

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
              {claim.documents.length === 0 && <div className="px-5 py-6 text-sm text-ink-300">No documents attached.</div>}
            </div>
          </Card>
        </div>

        <div className="space-y-6">
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

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-ink-300">{label}</div>
      <div className={highlight ? "font-medium text-moss" : "text-ink"}>{value}</div>
    </div>
  );
}
