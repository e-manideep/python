import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api/client";
import type { AnalyticsOverview } from "../../api/types";
import { Card, CardHeader } from "../../components/Card";
import { formatINR, statusLabel } from "../../lib/format";

export function Analytics() {
  const [data, setData] = useState<AnalyticsOverview | null>(null);

  useEffect(() => {
    api.get<AnalyticsOverview>("/analytics/overview").then(setData);
  }, []);

  if (!data) return <div className="text-ink-300">Loading analytics…</div>;

  const statusData = Object.entries(data.byStatus).map(([status, count]) => ({ status: statusLabel(status), count }));

  return (
    <div className="space-y-6">
      <h1 className="font-serif text-3xl font-medium text-ink">Portfolio analytics</h1>

      <div className="grid grid-cols-4 gap-4">
        <Metric label="Total claims" value={String(data.totalClaims)} />
        <Metric label="Claimed vs approved" value={`${formatINR(data.totalApproved)} / ${formatINR(data.totalClaimed)}`} small />
        <Metric label="Leakage prevented" value={formatINR(data.leakagePrevented)} accent="teal" />
        <Metric label="Avg. turnaround" value={data.avgTatDays !== null ? `${data.avgTatDays.toFixed(1)} days` : "—"} />
        <Metric label="Approval rate" value={data.approvalRate !== null ? `${(data.approvalRate * 100).toFixed(0)}%` : "—"} />
        <Metric label="AI-assisted claims" value={String(data.aiAssistedClaims)} />
        <Metric label="Flagged high risk" value={String(data.highRiskFlagged)} accent="rose" />
        <Metric label="Total claims value" value={formatINR(data.totalClaimed)} small />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Claims by status" />
          <div className="h-72 px-5 py-5">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={statusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E2DA" vertical={false} />
                <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#7C8AA5" }} angle={-20} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: "#7C8AA5" }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="count" fill="#0F6E63" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Claim volume over time" />
          <div className="h-72 px-5 py-5">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.volumeByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E2DA" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#7C8AA5" }} />
                <YAxis tick={{ fontSize: 11, fill: "#7C8AA5" }} allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#10192E" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value, small, accent }: { label: string; value: string; small?: boolean; accent?: "teal" | "rose" }) {
  const color = accent === "teal" ? "text-teal" : accent === "rose" ? "text-rose" : "text-ink";
  return (
    <Card className="px-5 py-4">
      <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-ink-300">{label}</div>
      <div className={`font-serif ${small ? "text-base" : "text-2xl"} ${color}`}>{value}</div>
    </Card>
  );
}
