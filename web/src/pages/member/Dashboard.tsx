import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { Claim, Policy } from "../../api/types";
import { Card, CardHeader } from "../../components/Card";
import { Button } from "../../components/Button";
import { StatusBadge } from "../../components/StatusBadge";
import { formatDate, formatINR } from "../../lib/format";
import { useAuth } from "../../state/auth";

export function MemberDashboard() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<{ policies: Policy[] }>("/policies/mine"),
      api.get<{ claims: Claim[] }>("/claims"),
    ])
      .then(([p, c]) => {
        setPolicies(p.policies);
        setClaims(c.claims);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-ink-300">Loading your policy…</div>;
  const policy = policies[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.14em] text-teal">Welcome back</div>
          <h1 className="font-serif text-3xl font-medium text-ink">Hi {user?.name.split(" ")[0]},</h1>
        </div>
        <Link to="/claims/new">
          <Button>File a new claim</Button>
        </Link>
      </div>

      {policy && (
        <Card>
          <CardHeader
            eyebrow={policy.policyNumber}
            title={`${policy.planName} · ${policy.insurer}`}
            action={<span className="rounded-full bg-moss-pale px-3 py-1 text-xs font-semibold text-moss">{policy.status}</span>}
          />
          <div className="grid grid-cols-2 gap-6 px-5 py-5 md:grid-cols-4">
            <Stat label="Sum insured" value={formatINR(policy.sumInsured)} />
            <Stat label="Annual premium" value={formatINR(policy.premium)} />
            <Stat label="Room rent limit" value={policy.roomRentLimit} small />
            <Stat label="Co-pay" value={`${policy.copayPercent}%`} />
            <Stat label="Cover period" value={`${formatDate(policy.startDate)} – ${formatDate(policy.endDate)}`} small />
            <Stat label="Health ID" value={policy.member?.healthId ?? "—"} />
            <Stat
              label="Dependents covered"
              value={policy.dependents?.length ? policy.dependents.map((d) => d.name).join(", ") : "None"}
              small
            />
            <Stat label="Network hospitals" value={policy.networkHospitals.join(", ")} small />
          </div>
        </Card>
      )}

      <Card>
        <CardHeader title="Recent claims" action={<Link to="/claims" className="text-sm font-medium text-teal">View all →</Link>} />
        <div className="divide-y divide-line">
          {claims.slice(0, 5).map((c) => (
            <Link
              key={c.id}
              to={`/claims/${c.id}`}
              className="flex items-center justify-between px-5 py-4 hover:bg-paper"
            >
              <div>
                <div className="font-medium text-ink">{c.diagnosis}</div>
                <div className="font-mono text-xs text-ink-300">
                  {c.claimNumber} · {c.type} · filed {formatDate(c.submittedAt)}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm font-medium text-ink">{formatINR(c.claimedAmount)}</div>
                <StatusBadge status={c.status} />
              </div>
            </Link>
          ))}
          {claims.length === 0 && <div className="px-5 py-8 text-center text-sm text-ink-300">No claims filed yet.</div>}
        </div>
      </Card>
    </div>
  );
}

function Stat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-300">{label}</div>
      <div className={small ? "text-sm text-ink" : "font-serif text-xl text-ink"}>{value}</div>
    </div>
  );
}
