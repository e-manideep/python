import { NavLink } from "react-router-dom";
import clsx from "clsx";
import { PersonaSwitcher } from "./PersonaSwitcher";
import { PERSONAS, useTrellisStore } from "../lib/store";
import { isLoggedIn, loggedInRoles } from "../lib/auth";

const LINKS_BY_ROLE: Record<string, { to: string; label: string }[]> = {
  investor: [
    { to: "/portfolio", label: "Portfolio" },
    { to: "/insights", label: "Trellis Intelligence" },
    { to: "/services", label: "Property Services" },
  ],
  resident: [
    { to: "/resident", label: "My Home" },
    { to: "/marketplace", label: "Marketplace" },
  ],
  vendor: [{ to: "/vendor", label: "My Jobs" }],
  ops: [
    { to: "/ops", label: "Dispatch" },
    { to: "/insights", label: "Trellis Intelligence" },
  ],
  builder: [
    { to: "/builder", label: "Developer Portfolio" },
    { to: "/insights", label: "Trellis Intelligence" },
    { to: "/services", label: "Property Services" },
  ],
};

export function Nav() {
  const selectedPersonaId = useTrellisStore((s) => s.selectedPersonaId);
  useTrellisStore((s) => s.sessionVersion); // re-render on every login/logout, even same-id ones
  const selected = PERSONAS.find((p) => p.id === selectedPersonaId);
  const activeRole = selected && isLoggedIn(selected.role) ? selected.role : loggedInRoles()[0];
  const links = activeRole ? (LINKS_BY_ROLE[activeRole] ?? []) : [];

  return (
    <header className="sticky top-0 z-40 border-b border-ink-100 bg-white/90 backdrop-blur">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center gap-8">
        <NavLink to="/" className="flex items-center gap-2 shrink-0">
          <TrellisMark />
          <span className="font-display text-lg font-semibold text-ink-950 tracking-tight">Trellis</span>
        </NavLink>
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) => clsx("px-3 py-2 rounded-lg text-sm font-medium transition-colors", isActive ? "bg-ink-950 text-white" : "text-ink-600 hover:bg-ink-100")}
            >
              {l.label}
            </NavLink>
          ))}
          <NavLink
            to="/listings"
            className={({ isActive }) => clsx("px-3 py-2 rounded-lg text-sm font-medium transition-colors", isActive ? "bg-ink-950 text-white" : "text-ink-600 hover:bg-ink-100")}
          >
            Browse Listings
          </NavLink>
        </nav>
        <div className="ml-auto">
          <PersonaSwitcher />
        </div>
      </div>
    </header>
  );
}

export function TrellisMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" width="26" height="26" className={className}>
      <rect x="0.5" y="0.5" width="27" height="27" rx="7" fill="var(--color-ink-950)" />
      <path d="M14 5 V23 M7 9 Q14 9 14 16 Q14 9 21 9" stroke="var(--color-bronze-400)" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
