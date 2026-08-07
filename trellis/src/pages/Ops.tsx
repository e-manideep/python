import { useMemo, useState } from "react";
import { dataset, PERSONAS, useTrellisStore } from "../lib/store";
import { formatDate, formatPct } from "../lib/format";
import { Button, Card, Pill, SectionHeading, StatTile } from "../components/ui";
import type { CityId, WorkOrder } from "../types";

const COLUMNS: WorkOrder["status"][] = ["Open", "Assigned", "In Progress", "Overdue", "Completed"];

const COLUMN_TONE: Record<string, "watch" | "neutral" | "risk" | "good"> = {
  Open: "watch",
  Assigned: "neutral",
  "In Progress": "neutral",
  Overdue: "risk",
  Completed: "good",
};

function VendorSelect({ workOrder, onAssign }: { workOrder: WorkOrder; onAssign: (vendorId: string) => void }) {
  const eligible = dataset.vendors.filter((v) => v.cityId === dataset.properties.find((p) => p.id === workOrder.propertyId)?.cityId && v.categories.includes(workOrder.category));
  const [value, setValue] = useState(eligible[0]?.id ?? "");
  if (eligible.length === 0) return <div className="text-xs text-ink-400">No vendor available</div>;
  return (
    <div className="flex items-center gap-1.5 mt-2">
      <select value={value} onChange={(e) => setValue(e.target.value)} className="text-xs border border-ink-200 rounded-md px-1.5 py-1 bg-white flex-1 min-w-0">
        {eligible.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
      </select>
      <Button variant="secondary" className="!px-2.5 !py-1 !text-xs" onClick={() => onAssign(value)}>Assign</Button>
    </div>
  );
}

export function Ops() {
  const persona = PERSONAS.find((p) => p.role === "ops")!;
  const cityId = persona.linkedId as CityId;
  const city = dataset.cities.find((c) => c.id === cityId)!;
  const workOrders = useTrellisStore((s) => s.workOrders);
  const advanceWorkOrder = useTrellisStore((s) => s.advanceWorkOrder);

  const cityPropertyIds = useMemo(() => new Set(dataset.properties.filter((p) => p.cityId === cityId).map((p) => p.id)), [cityId]);
  const cityOrders = useMemo(() => workOrders.filter((w) => cityPropertyIds.has(w.propertyId)).sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1)), [workOrders, cityPropertyIds]);

  const byColumn = (status: WorkOrder["status"]) => cityOrders.filter((w) => w.status === status);
  const overdue = byColumn("Overdue").length;
  const openTotal = byColumn("Open").length + byColumn("Assigned").length + byColumn("In Progress").length;
  const completedThisSet = byColumn("Completed");
  const slaOk = completedThisSet.filter((w) => w.resolvedDate && (new Date(w.resolvedDate).getTime() - new Date(w.createdDate).getTime()) / 3.6e6 <= w.slaHours * 1.05).length;
  const slaPct = completedThisSet.length ? (slaOk / completedThisSet.length) * 100 : 100;
  const cityVendors = dataset.vendors.filter((v) => v.cityId === cityId);

  return (
    <div className="max-w-[1400px] mx-auto px-5 sm:px-8 py-10">
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wide text-bronze-700">Field Operations Console</div>
        <h1 className="font-display text-3xl text-ink-950 mt-1">{city.name} Dispatch Board</h1>
        <p className="text-ink-500 text-sm mt-1">{persona.displayName} · {persona.subtitle}</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatTile label="Open / In Progress" value={String(openTotal)} />
        <StatTile label="Overdue (SLA breached)" value={String(overdue)} trend={overdue > 0 ? { direction: "up", label: "needs attention", positive: false } : undefined} />
        <StatTile label="SLA Compliance" value={formatPct(slaPct, 0)} sub="Recent completions" />
        <StatTile label="Active Vendors" value={String(cityVendors.length)} />
      </div>

      <SectionHeading title="Dispatch board" description="Move tickets across the lifecycle. Changes reflect immediately in the vendor and resident portals." />
      <div className="flex gap-4 overflow-x-auto scroll-thin pb-4">
        {COLUMNS.map((status) => {
          const items = byColumn(status);
          return (
            <div key={status} className="w-72 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <Pill tone={COLUMN_TONE[status]}>{status}</Pill>
                <span className="text-xs text-ink-400 font-mono">{items.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto scroll-thin pr-1">
                {items.slice(0, 30).map((w) => {
                  const property = dataset.properties.find((p) => p.id === w.propertyId);
                  return (
                    <Card key={w.id} padded={false} className="p-3">
                      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                        <Pill tone={w.priority === "Critical" || w.priority === "High" ? "risk" : "neutral"}>{w.priority}</Pill>
                        <span className="text-[11px] text-ink-400">{w.category}</span>
                      </div>
                      <div className="text-sm font-semibold text-ink-900 leading-snug">{w.description}</div>
                      <div className="text-xs text-ink-500 mt-1">{property?.name}</div>
                      <div className="text-[11px] text-ink-400 mt-1">Raised {formatDate(w.createdDate)} · SLA {w.slaHours}h</div>

                      {status === "Open" && <VendorSelect workOrder={w} onAssign={(vid) => advanceWorkOrder(w.id, "Assigned", vid)} />}
                      {status === "Assigned" && <Button variant="secondary" className="!mt-2 !px-2.5 !py-1 !text-xs w-full" onClick={() => advanceWorkOrder(w.id, "In Progress")}>Start Work</Button>}
                      {status === "In Progress" && <Button className="!mt-2 !px-2.5 !py-1 !text-xs w-full" onClick={() => advanceWorkOrder(w.id, "Completed")}>Mark Completed</Button>}
                      {status === "Overdue" && (w.vendorId ? <Button className="!mt-2 !px-2.5 !py-1 !text-xs w-full" onClick={() => advanceWorkOrder(w.id, "Completed")}>Mark Completed</Button> : <VendorSelect workOrder={w} onAssign={(vid) => advanceWorkOrder(w.id, "Assigned", vid)} />)}
                      {status === "Completed" && w.residentRating && <div className="mt-2 text-xs text-ink-500">Rated {w.residentRating} ★ by resident</div>}
                    </Card>
                  );
                })}
                {items.length === 0 && <div className="text-xs text-ink-400 py-6 text-center">Nothing here</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
