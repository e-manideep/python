import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import * as repo from "../../data/repositories";
import type { Claim, Patient } from "../../data/types";
import { Card, CardHeader } from "../../components/Card";
import { StatusBadge, RiskBadge } from "../../components/Badge";
import { formatDate, formatINR } from "../../lib/format";

const FILTERS = ["ALL", "SUBMITTED", "AI_TRIAGED", "UNDER_REVIEW", "QUERY_RAISED", "APPROVED", "REJECTED", "SETTLED"];

export function ClaimsQueue() {
  const [claims, setClaims] = useState<(Claim & { patient?: Patient })[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const all = await repo.claims.all();
    const withPatients = await Promise.all(all.map(async (c) => ({ ...c, patient: await repo.patients.get(c.patientId) })));
    setClaims(withPatients);
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const list = filter === "ALL" ? claims : claims.filter((c) => c.status === filter);
    return [...list].sort((a, b) => (b.aiRisk?.riskScore ?? -1) - (a.aiRisk?.riskScore ?? -1));
  }, [claims, filter]);

  const highRisk = claims.filter((c) => c.aiRisk?.riskLevel === "HIGH").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold text-ink">Claims</h1>
        <p className="text-sm text-ink-soft">{claims.length} on file · {highRisk} flagged high risk by AI review</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${filter === f ? "border-ink bg-ink text-white" : "border-line text-ink-soft hover:bg-paper"}`}
          >
            {f === "ALL" ? "All" : f.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader title={`${filtered.length} claim${filtered.length === 1 ? "" : "s"}`} />
        {loading ? (
          <div className="px-5 py-8 text-center text-ink-faint">Loading…</div>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((c) => (
              <Link key={c.id} to={`/claims/${c.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-paper">
                <div>
                  <div className="font-medium text-ink">{c.patient?.name}</div>
                  <div className="font-mono text-xs text-ink-faint">{c.claimNumber} · filed {formatDate(c.submittedAt)}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-ink">{formatINR(c.claimedAmount)}</div>
                  {c.aiRisk && <RiskBadge level={c.aiRisk.riskLevel} score={c.aiRisk.riskScore} />}
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            ))}
            {filtered.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-faint">Nothing here.</div>}
          </div>
        )}
      </Card>
    </div>
  );
}
