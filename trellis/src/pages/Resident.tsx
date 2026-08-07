import { useMemo, useState } from "react";
import { dataset, PERSONAS, useTrellisStore } from "../lib/store";
import { formatDate, formatINR } from "../lib/format";
import { monthLabel } from "../lib/dates";
import { Button, Card, EmptyState, Pill, SectionHeading, StatTile } from "../components/ui";
import type { WorkOrderCategory, WorkOrderPriority } from "../types";

const CATEGORIES: WorkOrderCategory[] = ["Plumbing", "Electrical", "HVAC", "Lift/Elevator", "Painting", "Pest Control", "Civil/Structural", "Housekeeping", "Security Systems", "Landscaping"];
const PAYMENT_TONE: Record<string, "good" | "watch" | "risk" | "neutral"> = { Paid: "good", "Paid Late": "watch", Pending: "neutral", Overdue: "risk" };
const WO_TONE: Record<string, "good" | "watch" | "risk" | "neutral"> = { Completed: "good", Open: "watch", Assigned: "neutral", "In Progress": "neutral", Overdue: "risk" };

export function Resident() {
  const persona = PERSONAS.find((p) => p.role === "resident")!;
  const resident = dataset.residents.find((r) => r.id === persona.linkedId)!;
  const unit = dataset.units.find((u) => u.id === resident.unitId)!;
  const property = dataset.properties.find((p) => p.id === unit.propertyId)!;
  const lease = dataset.leases.find((l) => l.id === unit.activeLeaseId);

  const rentPayments = useTrellisStore((s) => s.rentPayments);
  const workOrders = useTrellisStore((s) => s.workOrders);
  const payRent = useTrellisStore((s) => s.payRent);
  const raiseTicket = useTrellisStore((s) => s.raiseTicket);

  const myPayments = useMemo(() => rentPayments.filter((p) => p.leaseId === lease?.id).sort((a, b) => (a.month < b.month ? 1 : -1)), [rentPayments, lease]);
  const myTickets = useMemo(() => workOrders.filter((w) => w.unitId === unit.id).sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1)), [workOrders, unit.id]);
  const posts = dataset.communityPosts.filter((p) => p.propertyId === property.id).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 6);

  const currentPayment = myPayments[0];
  const [form, setForm] = useState<{ category: WorkOrderCategory; description: string; priority: WorkOrderPriority }>({ category: "Plumbing", description: "", priority: "Medium" });
  const [justPaid, setJustPaid] = useState(false);
  const [justRaised, setJustRaised] = useState(false);

  return (
    <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10">
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wide text-bronze-700">Resident Portal</div>
        <h1 className="font-display text-3xl text-ink-950 mt-1">Hi, {resident.name.split(" ")[0]}</h1>
        <p className="text-ink-500 text-sm mt-1">{unit.unitNumber}, {property.name} · {property.locality}</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        <StatTile label="Monthly Rent" value={formatINR(lease?.rentAmount ?? unit.currentRent)} />
        <StatTile label="Lease" value={lease ? `${formatDate(lease.startDate)}` : "—"} sub={lease ? `to ${formatDate(lease.endDate)}` : undefined} />
        <StatTile label="Open Requests" value={String(myTickets.filter((t) => t.status !== "Completed").length)} sub={`${myTickets.length} total raised`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mb-8">
        <Card>
          <SectionHeading title="Rent" description="Pay this month's rent and review your payment history." />
          {currentPayment && (
            <div className="rounded-xl border border-ink-100 p-4 flex items-center justify-between mb-4">
              <div>
                <div className="text-sm text-ink-500">{monthLabel(currentPayment.month)}</div>
                <div className="font-display text-xl text-ink-950">{formatINR(currentPayment.amount)}</div>
              </div>
              {currentPayment.status === "Pending" && !justPaid ? (
                <Button onClick={() => { payRent(currentPayment.id); setJustPaid(true); }}>Pay Rent</Button>
              ) : (
                <Pill tone={PAYMENT_TONE[justPaid ? "Paid" : currentPayment.status]}>{justPaid ? "Paid" : currentPayment.status}</Pill>
              )}
            </div>
          )}
          <div className="space-y-2 max-h-64 overflow-y-auto scroll-thin pr-1">
            {myPayments.slice(0, 12).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1.5 border-b border-ink-100 last:border-0">
                <span className="text-ink-600">{monthLabel(p.month)}</span>
                <span className="font-mono text-ink-800">{formatINR(p.amount)}</span>
                <Pill tone={PAYMENT_TONE[p.id === currentPayment?.id && justPaid ? "Paid" : p.status]}>{p.id === currentPayment?.id && justPaid ? "Paid" : p.status}</Pill>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <SectionHeading title="Raise a maintenance request" />
          {justRaised ? (
            <div className="rounded-xl bg-score-good-bg text-score-good p-4 text-sm font-medium">
              Request submitted — routed to the operations team for {property.name}. You'll see it below once assigned.
              <button className="block mt-2 text-xs underline" onClick={() => setJustRaised(false)}>Raise another</button>
            </div>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!form.description.trim()) return;
                raiseTicket({ propertyId: property.id, unitId: unit.id, category: form.category, description: form.description, priority: form.priority });
                setForm({ category: "Plumbing", description: "", priority: "Medium" });
                setJustRaised(true);
              }}
            >
              <div className="grid grid-cols-2 gap-3">
                <label className="text-sm">
                  <span className="block text-ink-600 mb-1">Category</span>
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as WorkOrderCategory }))} className="w-full border border-ink-200 rounded-lg px-2.5 py-2 bg-white">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="text-sm">
                  <span className="block text-ink-600 mb-1">Priority</span>
                  <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value as WorkOrderPriority }))} className="w-full border border-ink-200 rounded-lg px-2.5 py-2 bg-white">
                    {(["Low", "Medium", "High", "Critical"] as WorkOrderPriority[]).map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              </div>
              <label className="text-sm block">
                <span className="block text-ink-600 mb-1">Describe the issue</span>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} className="w-full border border-ink-200 rounded-lg px-2.5 py-2" placeholder="e.g. Kitchen tap has been leaking since yesterday" />
              </label>
              <Button type="submit">Submit Request</Button>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-ink-100 space-y-2 max-h-56 overflow-y-auto scroll-thin pr-1">
            {myTickets.length === 0 ? (
              <EmptyState title="No requests yet" />
            ) : (
              myTickets.map((t) => (
                <div key={t.id} className="flex items-center justify-between text-sm py-1.5">
                  <div className="min-w-0">
                    <div className="text-ink-800 truncate">{t.description}</div>
                    <div className="text-xs text-ink-400">{t.category} · {formatDate(t.createdDate)}</div>
                  </div>
                  <Pill tone={WO_TONE[t.status]}>{t.status}</Pill>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card>
          <SectionHeading title="Community feed" />
          <div className="space-y-4">
            {posts.map((post) => (
              <div key={post.id} className="border-b border-ink-100 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <Pill>{post.category}</Pill>
                  <span className="text-xs text-ink-400">{formatDate(post.date)}</span>
                </div>
                <div className="text-sm font-semibold text-ink-900">{post.title}</div>
                <p className="text-sm text-ink-500 mt-0.5">{post.body}</p>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionHeading title="Amenities" />
          <div className="flex flex-wrap gap-2">
            {property.amenities.map((a) => <Pill key={a}>{a}</Pill>)}
          </div>
        </Card>
      </div>
    </div>
  );
}
