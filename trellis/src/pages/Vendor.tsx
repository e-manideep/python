import { useMemo } from "react";
import { dataset, PERSONAS, useTrellisStore } from "../lib/store";
import { formatDate, formatINR, formatINRCompact, formatPct } from "../lib/format";
import { Button, Card, EmptyState, Pill, SectionHeading, StatTile } from "../components/ui";
import type { WorkOrder } from "../types";

const NEXT_STATUS: Partial<Record<WorkOrder["status"], WorkOrder["status"]>> = {
  Assigned: "In Progress",
  "In Progress": "Completed",
};

export function Vendor() {
  const persona = PERSONAS.find((p) => p.role === "vendor")!;
  const vendor = dataset.vendors.find((v) => v.id === persona.linkedId)!;
  const workOrders = useTrellisStore((s) => s.workOrders);
  const advanceWorkOrder = useTrellisStore((s) => s.advanceWorkOrder);

  const myJobs = useMemo(() => workOrders.filter((w) => w.vendorId === vendor.id).sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1)), [workOrders, vendor.id]);
  const active = myJobs.filter((w) => w.status === "Assigned" || w.status === "In Progress" || w.status === "Overdue");
  const completed = myJobs.filter((w) => w.status === "Completed");
  const earnings = completed.reduce((s, w) => s + (w.cost ?? 0), 0);

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wide text-bronze-700">Vendor Portal</div>
        <h1 className="font-display text-3xl text-ink-950 mt-1">{vendor.name}</h1>
        <p className="text-ink-500 text-sm mt-1">{vendor.categories.join(", ")} · {dataset.cities.find((c) => c.id === vendor.cityId)?.name} · GST {vendor.gstNumber}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatTile label="Jobs Completed" value={String(vendor.jobsCompleted)} />
        <StatTile label="Avg. Rating" value={`${vendor.avgRating.toFixed(1)} ★`} />
        <StatTile label="SLA Compliance" value={formatPct(vendor.slaCompliancePct, 0)} />
        <StatTile label="Total Earnings" value={formatINRCompact(earnings)} sub={`Avg ${formatINR(vendor.avgCostPerJob)}/job`} />
      </div>

      <Card className="mb-8">
        <SectionHeading title="Active jobs" description="Move a job forward as work progresses — this updates instantly across the Ops console." />
        {active.length === 0 ? (
          <EmptyState title="No active jobs" description="New work orders assigned to you will show up here." />
        ) : (
          <div className="space-y-3">
            {active.map((w) => {
              const property = dataset.properties.find((p) => p.id === w.propertyId);
              const next = NEXT_STATUS[w.status];
              return (
                <div key={w.id} className="rounded-xl border border-ink-100 p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Pill tone={w.status === "Overdue" ? "risk" : "neutral"}>{w.status}</Pill>
                      <Pill tone={w.priority === "Critical" || w.priority === "High" ? "risk" : "neutral"}>{w.priority}</Pill>
                    </div>
                    <div className="text-sm font-semibold text-ink-900">{w.description}</div>
                    <div className="text-xs text-ink-500 mt-0.5">{property?.name} · {w.category} · SLA {w.slaHours}h · Raised {formatDate(w.createdDate)}</div>
                  </div>
                  {next && <Button onClick={() => advanceWorkOrder(w.id, next)}>{next === "Completed" ? "Mark Completed" : `Move to ${next}`}</Button>}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card padded={false}>
        <div className="p-5 sm:p-6 pb-0"><SectionHeading title="Job history" /></div>
        <div className="overflow-x-auto scroll-thin">
          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="text-left text-xs text-ink-500 uppercase tracking-wide border-y border-ink-100">
                <th className="py-2.5 px-5 sm:px-6 font-medium">Property</th>
                <th className="py-2.5 px-3 font-medium">Description</th>
                <th className="py-2.5 px-3 font-medium">Completed</th>
                <th className="py-2.5 px-3 font-medium">Cost</th>
                <th className="py-2.5 px-3 font-medium">Rating</th>
              </tr>
            </thead>
            <tbody>
              {completed.slice(0, 25).map((w) => {
                const property = dataset.properties.find((p) => p.id === w.propertyId);
                return (
                  <tr key={w.id} className="border-b border-ink-100 last:border-0">
                    <td className="py-2.5 px-5 sm:px-6 text-ink-800">{property?.name}</td>
                    <td className="py-2.5 px-3 text-ink-600">{w.description}</td>
                    <td className="py-2.5 px-3 text-ink-500">{w.resolvedDate ? formatDate(w.resolvedDate) : "—"}</td>
                    <td className="py-2.5 px-3 font-mono text-ink-800">{w.cost ? formatINR(w.cost) : "—"}</td>
                    <td className="py-2.5 px-3">{w.residentRating ? `${w.residentRating} ★` : <span className="text-ink-400">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
