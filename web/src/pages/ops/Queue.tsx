import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { Claim } from "../../api/types";
import { Card, CardHeader } from "../../components/Card";
import { StatusBadge, RiskBadge } from "../../components/StatusBadge";
import { formatDate, formatINR } from "../../lib/format";

const FILTERS = ["ALL", "SUBMITTED", "AI_TRIAGED", "UNDER_REVIEW", "QUERY_RAISED", "APPROVED", "REJECTED", "SETTLED"];

export function OpsQueue() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    api
      .get<{ claims: Claim[] }>("/claims")
      .then((r) => setClaims(r.claims))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const list = filter === "ALL" ? claims : claims.filter((c) => c.status === filter);
    return [...list].sort((a, b) => (b.aiRisk?.riskScore ?? -1) - (a.aiRisk?.riskScore ?? -1));
  }, [claims, filter]);

  const openCount = claims.filter((c) => !["SETTLED", "REJECTED"].includes(c.status)).length;
  const highRiskCount = claims.filter((c) => c.aiRisk?.riskLevel === "HIGH").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-3xl font-medium text-ink">Claims queue</h1>
        <p className="text-sm text-ink-500">
          {openCount} open · {highRiskCount} flagged high risk by AI review
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
              filter === f ? "border-ink bg-ink text-white" : "border-line text-ink-500 hover:bg-paper"
            }`}
          >
            {f === "ALL" ? "All" : f.replaceAll("_", " ")}
          </button>
        ))}
      </div>

      <Card>
        <CardHeader title={`${filtered.length} claim${filtered.length === 1 ? "" : "s"}`} />
        {loading ? (
          <div className="px-5 py-8 text-center text-ink-300">Loading…</div>
        ) : (
          <div className="divide-y divide-line">
            {filtered.map((c) => (
              <Link key={c.id} to={`/claims/${c.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-paper">
                <div>
                  <div className="font-medium text-ink">
                    {c.policy.member?.name} — {c.diagnosis}
                  </div>
                  <div className="font-mono text-xs text-ink-300">
                    {c.claimNumber} · {c.provider.name} · filed {formatDate(c.submittedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium text-ink">{formatINR(c.claimedAmount)}</div>
                  {c.aiRisk && <RiskBadge level={c.aiRisk.riskLevel} score={c.aiRisk.riskScore} />}
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            ))}
            {filtered.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-300">Nothing here.</div>}
          </div>
        )}
      </Card>
    </div>
  );
}
