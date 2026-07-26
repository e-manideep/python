import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { Claim } from "../../api/types";
import { Card } from "../../components/Card";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate, formatINR } from "../../lib/format";

export function MemberClaims() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<{ claims: Claim[] }>("/claims")
      .then((r) => setClaims(r.claims))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-medium text-ink">My claims</h1>
      <Card>
        {loading ? (
          <div className="px-5 py-8 text-center text-ink-300">Loading…</div>
        ) : (
          <div className="divide-y divide-line">
            {claims.map((c) => (
              <Link key={c.id} to={`/claims/${c.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-paper">
                <div>
                  <div className="font-medium text-ink">{c.diagnosis}</div>
                  <div className="font-mono text-xs text-ink-300">
                    {c.claimNumber} · {c.provider.name} · filed {formatDate(c.submittedAt)}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium text-ink">
                    {formatINR(c.claimedAmount)}
                    {c.approvedAmount !== null && (
                      <span className="ml-2 text-xs font-normal text-moss">approved {formatINR(c.approvedAmount)}</span>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              </Link>
            ))}
            {claims.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-300">No claims yet.</div>}
          </div>
        )}
      </Card>
    </div>
  );
}
