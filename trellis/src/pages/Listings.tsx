import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { dataset } from "../lib/store";
import { vacantListings, listingsSummary, type VacantListing } from "../lib/listings";
import { formatINR, formatINRCompact } from "../lib/format";
import { loadJSON, saveJSON } from "../lib/storage";
import { Button, Card, EmptyState, Pill } from "../components/ui";
import { ScoreBadge } from "../components/ScoreBadge";
import { TrellisMark } from "../components/Nav";
import type { CityId, UnitConfig } from "../types";

type SortKey = "score" | "rent-asc" | "rent-desc" | "area-desc";

const SORTERS: Record<SortKey, (a: VacantListing, b: VacantListing) => number> = {
  score: (a, b) => b.trellisScore - a.trellisScore,
  "rent-asc": (a, b) => a.rentPerMonth - b.rentPerMonth,
  "rent-desc": (a, b) => b.rentPerMonth - a.rentPerMonth,
  "area-desc": (a, b) => b.areaSqft - a.areaSqft,
};

const CONFIGS: UnitConfig[] = ["1BHK", "2BHK", "3BHK", "4BHK", "Villa"];
const PAGE_SIZE = 24;

export function Listings() {
  const all = useMemo(() => vacantListings(dataset), []);
  const summary = useMemo(() => listingsSummary(all), [all]);

  const [cityFilter, setCityFilter] = useState<CityId | "all">("all");
  const [configFilter, setConfigFilter] = useState<UnitConfig | "all">("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortKey>("score");
  const [shortlistOnly, setShortlistOnly] = useState(false);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [shortlist, setShortlist] = useState<string[]>(() => loadJSON("listingsShortlist", [] as string[]));
  const [requested, setRequested] = useState<string[]>(() => loadJSON("listingsRequested", [] as string[]));

  function toggleShortlist(unitId: string) {
    setShortlist((prev) => {
      const next = prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId];
      saveJSON("listingsShortlist", next);
      return next;
    });
  }

  function requestVisit(unitId: string) {
    setRequested((prev) => {
      if (prev.includes(unitId)) return prev;
      const next = [...prev, unitId];
      saveJSON("listingsRequested", next);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((l) => cityFilter === "all" || l.cityId === cityFilter)
      .filter((l) => configFilter === "all" || l.config === configFilter)
      .filter((l) => !shortlistOnly || shortlist.includes(l.unitId))
      .filter((l) => !q || l.propertyName.toLowerCase().includes(q) || l.locality.toLowerCase().includes(q))
      .sort(SORTERS[sort]);
  }, [all, cityFilter, configFilter, query, sort, shortlistOnly, shortlist]);

  const visible = filtered.slice(0, visibleCount);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-ink-100 bg-ink-950 text-white">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 pb-16 relative">
          <div className="flex items-center gap-2 mb-8">
            <TrellisMark />
            <span className="font-display text-lg tracking-tight">Trellis</span>
          </div>
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-bronze-300 mb-6">
              Available Homes · Hyderabad &amp; Secunderabad
            </div>
            <h1 className="font-display text-4xl sm:text-5xl leading-[1.08] tracking-tight">
              Move into a home that's actually being looked after.
            </h1>
            <p className="mt-6 text-lg text-ink-300 leading-relaxed">
              Every listing below is a real vacant unit inside a Trellis-operated community — not a broker's photo of
              someone else's property. Compliance is current, maintenance is tracked, and the Trellis Score shown on
              each home is the same operating score the owner sees, not a marketing number.
            </p>
          </div>
          <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-6 max-w-2xl">
            <div>
              <div className="font-display text-2xl">{summary.totalVacant}</div>
              <div className="text-xs text-ink-400 mt-0.5">Homes available now</div>
            </div>
            <div>
              <div className="font-display text-2xl">{formatINRCompact(summary.avgRent)}</div>
              <div className="text-xs text-ink-400 mt-0.5">Average monthly rent</div>
            </div>
            <div>
              <div className="font-display text-2xl">{summary.avgTrellisScore}</div>
              <div className="text-xs text-ink-400 mt-0.5">Avg. Trellis Score</div>
            </div>
            <div>
              <div className="font-display text-2xl">{summary.citiesCovered}</div>
              <div className="text-xs text-ink-400 mt-0.5">Cities covered</div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10">
        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-3 mb-8 sticky top-16 z-30 bg-ink-50/95 backdrop-blur py-3 -mx-5 px-5 sm:-mx-8 sm:px-8 border-b border-ink-100">
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setVisibleCount(PAGE_SIZE); }}
            placeholder="Search by property or locality…"
            className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none focus:ring-2 focus:ring-ink-950/10 min-w-[220px] flex-1 sm:flex-none sm:w-64"
          />
          <select value={cityFilter} onChange={(e) => { setCityFilter(e.target.value as CityId | "all"); setVisibleCount(PAGE_SIZE); }} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900">
            <option value="all">All cities</option>
            {dataset.cities.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select value={configFilter} onChange={(e) => { setConfigFilter(e.target.value as UnitConfig | "all"); setVisibleCount(PAGE_SIZE); }} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900">
            <option value="all">All configurations</option>
            {CONFIGS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select value={sort} onChange={(e) => { setSort(e.target.value as SortKey); setVisibleCount(PAGE_SIZE); }} className="rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900">
            <option value="score">Sort: Trellis Score</option>
            <option value="rent-asc">Sort: Rent (low to high)</option>
            <option value="rent-desc">Sort: Rent (high to low)</option>
            <option value="area-desc">Sort: Area (largest first)</option>
          </select>
          <button
            onClick={() => { setShortlistOnly((v) => !v); setVisibleCount(PAGE_SIZE); }}
            className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${shortlistOnly ? "bg-ink-950 text-white border-ink-950" : "bg-white text-ink-700 border-ink-200 hover:bg-ink-100"}`}
          >
            ♥ Shortlisted{shortlist.length ? ` (${shortlist.length})` : ""}
          </button>
          <div className="text-sm text-ink-500 ml-auto">{filtered.length} of {all.length} homes</div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState title="No homes match these filters" description="Try widening your search — clear a filter or the shortlist-only toggle." />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {visible.map((l) => (
                <ListingCard
                  key={l.unitId}
                  listing={l}
                  shortlisted={shortlist.includes(l.unitId)}
                  requested={requested.includes(l.unitId)}
                  onToggleShortlist={() => toggleShortlist(l.unitId)}
                  onRequestVisit={() => requestVisit(l.unitId)}
                />
              ))}
            </div>
            {visibleCount < filtered.length && (
              <div className="flex justify-center mt-8">
                <Button variant="secondary" onClick={() => setVisibleCount((v) => v + PAGE_SIZE)}>
                  Load more homes ({filtered.length - visibleCount} remaining)
                </Button>
              </div>
            )}
          </>
        )}

        <p className="text-xs text-ink-400 mt-10 text-center max-w-xl mx-auto">
          Own a unit sitting vacant? <Link to="/services" className="underline hover:text-ink-600">See how Property Services turns it into a listing like these</Link> — furnished units on Trellis lease ~25% faster on average.
        </p>
      </div>
    </div>
  );
}

function ListingCard({ listing, shortlisted, requested, onToggleShortlist, onRequestVisit }: { listing: VacantListing; shortlisted: boolean; requested: boolean; onToggleShortlist: () => void; onRequestVisit: () => void }) {
  const upliftPct = Math.round(((listing.furnishedRentPotential - listing.rentPerMonth) / listing.rentPerMonth) * 100);
  return (
    <Card className="flex flex-col gap-4 relative">
      <button
        onClick={onToggleShortlist}
        aria-label={shortlisted ? "Remove from shortlist" : "Add to shortlist"}
        className={`absolute top-5 right-5 sm:top-6 sm:right-6 text-lg leading-none transition-colors ${shortlisted ? "text-score-risk" : "text-ink-300 hover:text-ink-500"}`}
      >
        {shortlisted ? "♥" : "♡"}
      </button>
      <div className="pr-8">
        <div className="text-xs font-semibold uppercase tracking-wide text-bronze-700">{listing.config} · {listing.areaSqft.toLocaleString("en-IN")} sqft</div>
        <div className="font-display text-lg text-ink-950 mt-1">{listing.propertyName}</div>
        <div className="text-sm text-ink-500 mt-0.5">{listing.locality}, {listing.cityName} · Unit {listing.unitNumber}</div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="font-display text-2xl text-ink-950">{formatINR(listing.rentPerMonth)}<span className="text-sm font-sans font-normal text-ink-500">/mo</span></div>
          {upliftPct > 0 && <div className="text-xs text-score-good mt-0.5">Furnished option: {formatINR(listing.furnishedRentPotential)}/mo (+{upliftPct}%)</div>}
        </div>
        <ScoreBadge composite={listing.trellisScore} band={listing.scoreBand} size="sm" />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {listing.hasLift && <Pill>Lift</Pill>}
        {listing.amenities.slice(0, 3).map((a) => (
          <Pill key={a} tone="neutral">{a}</Pill>
        ))}
      </div>

      <div className="text-xs text-ink-400 border-t border-ink-100 pt-3">{listing.developer} · RERA {listing.reraNumber}</div>

      <Button variant={requested ? "secondary" : "primary"} onClick={onRequestVisit} disabled={requested} className="w-full">
        {requested ? "Visit Requested ✓" : "Request a Visit"}
      </Button>
    </Card>
  );
}
