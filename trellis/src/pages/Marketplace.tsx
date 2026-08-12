import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { dataset, PERSONAS, useTrellisStore } from "../lib/store";
import { formatINR } from "../lib/format";
import { loadJSON, saveJSON } from "../lib/storage";
import { Button, Card, EmptyState, Pill, SectionHeading } from "../components/ui";
import type { Vendor, VendorCategory, WorkOrderCategory } from "../types";

const ALL_CATEGORIES: VendorCategory[] = [
  "Plumbing",
  "Electrical",
  "HVAC",
  "Lift/Elevator",
  "Painting",
  "Pest Control",
  "Civil/Structural",
  "Housekeeping",
  "Security Systems",
  "Landscaping",
  "Interior Design",
];

type SortKey = "rating" | "jobs" | "cost-asc";

export function Marketplace() {
  const persona = PERSONAS.find((p) => p.role === "resident")!;
  const resident = dataset.residents.find((r) => r.id === persona.linkedId)!;
  const unit = dataset.units.find((u) => u.id === resident.unitId)!;
  const property = dataset.properties.find((p) => p.id === unit.propertyId)!;
  const bookVendor = useTrellisStore((s) => s.bookVendor);
  const workOrders = useTrellisStore((s) => s.workOrders);

  const [category, setCategory] = useState<VendorCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("rating");
  const [quoteRequests, setQuoteRequests] = useState<string[]>(() => loadJSON("marketplaceQuotes", [] as string[]));

  const cityVendors = useMemo(() => dataset.vendors.filter((v) => v.cityId === property.cityId), [property.cityId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return cityVendors
      .filter((v) => category === "all" || v.categories.includes(category))
      .filter((v) => !q || v.name.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sort === "rating") return b.avgRating - a.avgRating;
        if (sort === "jobs") return b.jobsCompleted - a.jobsCompleted;
        return a.avgCostPerJob - b.avgCostPerJob;
      });
  }, [cityVendors, category, query, sort]);

  function requestQuote(vendorId: string) {
    setQuoteRequests((prev) => {
      if (prev.includes(vendorId)) return prev;
      const next = [...prev, vendorId];
      saveJSON("marketplaceQuotes", next);
      return next;
    });
  }

  const myBookings = workOrders.filter((w) => w.unitId === unit.id && w.raisedBy === "Marketplace Booking").sort((a, b) => (a.createdDate < b.createdDate ? 1 : -1));

  return (
    <div className="max-w-6xl mx-auto px-5 sm:px-8 py-10">
      <div className="mb-8">
        <div className="text-xs font-semibold uppercase tracking-wide text-bronze-700">Marketplace</div>
        <h1 className="font-display text-3xl text-ink-950 mt-1">Every trade your home needs, vetted and accountable</h1>
        <p className="text-ink-500 text-sm mt-2 max-w-2xl">
          Plumbers, electricians, interior designers and every other trade Trellis manages — the same vendor network Ops
          uses to dispatch work orders, with the real performance numbers behind each one. Booking for{" "}
          <span className="font-semibold text-ink-800">{unit.unitNumber}, {property.name}</span>, {property.locality}.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setCategory("all")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${category === "all" ? "bg-ink-950 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200"}`}
        >
          All trades
        </button>
        {ALL_CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${category === c ? "bg-ink-950 text-white" : "bg-ink-100 text-ink-700 hover:bg-ink-200"}`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search vendors…"
          className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-950/10 min-w-[200px] flex-1 sm:flex-none sm:w-64"
        />
        <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900">
          <option value="rating">Sort: Highest rated</option>
          <option value="jobs">Sort: Most jobs completed</option>
          <option value="cost-asc">Sort: Lowest avg. cost</option>
        </select>
        <div className="text-sm text-ink-500 ml-auto">{filtered.length} vendors in {dataset.cities.find((c) => c.id === property.cityId)?.name}</div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="No vendors match this filter" description="Try a different trade or clear your search." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {filtered.map((v) => (
            <VendorCard
              key={v.id}
              vendor={v}
              filterCategory={category}
              quoteRequested={quoteRequests.includes(v.id)}
              onRequestQuote={() => requestQuote(v.id)}
              onBook={(cat, description) => bookVendor({ propertyId: property.id, unitId: unit.id, vendorId: v.id, category: cat, description })}
            />
          ))}
        </div>
      )}

      <Card>
        <SectionHeading title="Your bookings" description="Vendors you've booked directly — these are real work orders, visible to Ops and updated as work progresses." />
        {myBookings.length === 0 ? (
          <EmptyState title="No direct bookings yet" description="Book a vendor above and it'll show up here, and on your My Home page." />
        ) : (
          <div className="space-y-2">
            {myBookings.map((w) => {
              const vendor = dataset.vendors.find((v) => v.id === w.vendorId);
              return (
                <div key={w.id} className="flex items-center justify-between text-sm py-2 border-b border-ink-100 last:border-0">
                  <div className="min-w-0">
                    <div className="text-ink-800 truncate">{w.description}</div>
                    <div className="text-xs text-ink-400">{vendor?.name} · {w.category}</div>
                  </div>
                  <Pill tone={w.status === "Completed" ? "good" : "neutral"}>{w.status}</Pill>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-xs text-ink-400 mt-4">
          Track progress on <Link to="/resident" className="underline hover:text-ink-600">My Home</Link>.
        </p>
      </Card>
    </div>
  );
}

function VendorCard({
  vendor,
  filterCategory,
  quoteRequested,
  onRequestQuote,
  onBook,
}: {
  vendor: Vendor;
  filterCategory: VendorCategory | "all";
  quoteRequested: boolean;
  onRequestQuote: () => void;
  onBook: (category: WorkOrderCategory, description: string) => void;
}) {
  const isDesign = vendor.categories.includes("Interior Design");
  const bookableCategory = ((filterCategory !== "all" && vendor.categories.includes(filterCategory) ? filterCategory : vendor.categories[0]) as WorkOrderCategory);
  const [expanded, setExpanded] = useState(false);
  const [description, setDescription] = useState("");
  const [booked, setBooked] = useState(false);

  return (
    <Card className="flex flex-col gap-3">
      <div>
        <div className="font-display text-lg text-ink-950">{vendor.name}</div>
        <div className="flex flex-wrap gap-1.5 mt-1.5">
          {vendor.categories.map((c) => <Pill key={c} tone="neutral">{c}</Pill>)}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center border-y border-ink-100 py-3">
        <div>
          <div className="font-display text-lg text-ink-950">{vendor.avgRating.toFixed(1)} ★</div>
          <div className="text-[11px] text-ink-500">Rating</div>
        </div>
        <div>
          <div className="font-display text-lg text-ink-950">{vendor.jobsCompleted}</div>
          <div className="text-[11px] text-ink-500">{isDesign ? "Projects" : "Jobs done"}</div>
        </div>
        <div>
          <div className="font-display text-lg text-ink-950">{vendor.slaCompliancePct.toFixed(0)}%</div>
          <div className="text-[11px] text-ink-500">SLA met</div>
        </div>
      </div>

      <div className="text-sm text-ink-600">
        Avg. {isDesign ? "project value" : "cost per job"}: <span className="font-mono text-ink-800">{formatINR(vendor.avgCostPerJob)}</span>
      </div>

      {isDesign ? (
        <Button variant={quoteRequested ? "secondary" : "primary"} onClick={onRequestQuote} disabled={quoteRequested} className="mt-auto">
          {quoteRequested ? "Quote Requested ✓" : "Request a Quote"}
        </Button>
      ) : booked ? (
        <Button variant="secondary" disabled className="mt-auto">Booked ✓</Button>
      ) : expanded ? (
        <form
          className="mt-auto space-y-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!description.trim()) return;
            onBook(bookableCategory, description);
            setBooked(true);
          }}
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={`Describe the ${bookableCategory.toLowerCase()} work needed…`}
            className="w-full border border-ink-200 rounded-lg px-2.5 py-2 text-sm"
            autoFocus
          />
          <div className="flex gap-2">
            <Button type="submit" className="flex-1">Confirm Booking</Button>
            <Button type="button" variant="ghost" onClick={() => setExpanded(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <Button onClick={() => setExpanded(true)} className="mt-auto">Book This Vendor</Button>
      )}
    </Card>
  );
}
