import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import * as repo from "../../data/repositories";
import { Card, CardHeader } from "../../components/Card";
import { formatINR, titleCase } from "../../lib/format";

interface Overview {
  patientCount: number;
  encountersSigned: number;
  minutesSavedEstimate: number;
  noShowHighRiskCount: number;
  totalClaimed: number;
  totalApproved: number;
  leakagePrevented: number;
  aiAssistedClaims: number;
  highRiskClaims: number;
  referralsByStatus: { status: string; count: number }[];
  encountersByType: { type: string; count: number }[];
}

export function CommandCenter() {
  const [data, setData] = useState<Overview | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const [patients, encounters, claims, referrals] = await Promise.all([
      repo.patients.all(),
      repo.encounters.all(),
      repo.claims.all(),
      repo.referrals.all(),
    ]);

    const signed = encounters.filter((e) => e.noteStatus === "SIGNED");
    const totalClaimed = claims.reduce((s, c) => s + c.claimedAmount, 0);
    const totalApproved = claims.reduce((s, c) => s + (c.approvedAmount ?? 0), 0);

    const referralsByStatus = ["DRAFTED", "SENT", "SCHEDULED", "COMPLETED"].map((status) => ({
      status,
      count: referrals.filter((r) => r.status === status).length,
    }));
    const typeMap: Record<string, number> = {};
    encounters.forEach((e) => { typeMap[e.type] = (typeMap[e.type] ?? 0) + 1; });

    setData({
      patientCount: patients.length,
      encountersSigned: signed.length,
      minutesSavedEstimate: signed.length * 8,
      noShowHighRiskCount: encounters.filter((e) => (e.noShowRisk ?? 0) > 20).length,
      totalClaimed,
      totalApproved,
      leakagePrevented: Math.max(totalClaimed - totalApproved, 0),
      aiAssistedClaims: claims.filter((c) => c.aiRisk).length,
      highRiskClaims: claims.filter((c) => c.aiRisk?.riskLevel === "HIGH").length,
      referralsByStatus,
      encountersByType: Object.entries(typeMap).map(([type, count]) => ({ type, count })),
    });
  }

  if (!data) return <div className="text-ink-faint">Loading analytics…</div>;

  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-bold text-ink">Command Center</h1>

      <div className="grid grid-cols-4 gap-4">
        <Metric label="Patients under care" value={String(data.patientCount)} />
        <Metric label="Notes signed" value={String(data.encountersSigned)} />
        <Metric label="Documentation time saved" value={`~${data.minutesSavedEstimate} min`} accent="pulse" />
        <Metric label="High no-show risk" value={String(data.noShowHighRiskCount)} accent="warn" />
        <Metric label="Claims value on file" value={formatINR(data.totalClaimed)} small />
        <Metric label="Approved to date" value={formatINR(data.totalApproved)} small />
        <Metric label="Leakage prevented" value={formatINR(data.leakagePrevented)} accent="pulse" />
        <Metric label="Claims flagged high risk" value={String(data.highRiskClaims)} accent="critical" />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Encounters by type" />
          <div className="h-64 px-5 py-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.encountersByType}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E1" vertical={false} />
                <XAxis dataKey="type" tick={{ fontSize: 11, fill: "#868D96" }} />
                <YAxis tick={{ fontSize: 11, fill: "#868D96" }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#12B76A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Referral pipeline" />
          <div className="h-64 px-5 py-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.referralsByStatus.map((r) => ({ ...r, label: titleCase(r.status) }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E1E3E1" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#868D96" }} />
                <YAxis tick={{ fontSize: 11, fill: "#868D96" }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0F1113" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, small, accent }: { label: string; value: string; small?: boolean; accent?: "pulse" | "warn" | "critical" }) {
  const color = accent === "pulse" ? "text-pulse" : accent === "warn" ? "text-warn" : accent === "critical" ? "text-critical" : "text-ink";
  return (
    <Card className="px-5 py-4">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`font-display ${small ? "text-base" : "text-2xl"} font-bold ${color}`}>{value}</div>
    </Card>
  );
}
