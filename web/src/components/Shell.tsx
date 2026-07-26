import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../state/auth";
import { api } from "../api/client";

interface NavItem {
  to: string;
  label: string;
}

const NAV: Record<string, NavItem[]> = {
  MEMBER: [
    { to: "/", label: "Dashboard" },
    { to: "/claims", label: "My Claims" },
    { to: "/claims/new", label: "File a Claim" },
    { to: "/assistant", label: "Policy Assistant" },
  ],
  PROVIDER: [
    { to: "/", label: "Provider Desk" },
    { to: "/claims/new", label: "Submit Claim" },
  ],
  INSURER_OPS: [
    { to: "/", label: "Claims Queue" },
    { to: "/analytics", label: "Analytics" },
  ],
  ADMIN: [
    { to: "/", label: "Claims Queue" },
    { to: "/analytics", label: "Analytics" },
  ],
};

const ROLE_LABEL: Record<string, string> = {
  MEMBER: "Policyholder",
  PROVIDER: "Network Provider",
  INSURER_OPS: "Claims Adjudicator",
  ADMIN: "Administrator",
};

export function Shell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    api
      .get<{ ok: boolean; aiEnabled: boolean }>("/health")
      .then((r) => setAiEnabled(r.aiEnabled))
      .catch(() => setAiEnabled(false));
  }, []);

  if (!user) return <>{children}</>;
  const items = NAV[user.role] ?? [];

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-white">
        <div className="border-b border-line px-5 py-5">
          <div className="font-serif text-xl font-semibold text-ink">
            Claim<span className="text-teal">Setu</span>
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-300">
            Health Claims OS
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? "bg-ink text-white" : "text-ink-500 hover:bg-paper hover:text-ink"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-line px-4 py-3">
          <div
            className={`mb-3 rounded-lg border px-3 py-2 text-[11px] leading-tight ${
              aiEnabled ? "border-teal/25 bg-teal-pale text-teal" : "border-amber/30 bg-amber-pale text-amber"
            }`}
          >
            {aiEnabled === null ? "Checking AI status…" : aiEnabled ? "Claude AI: connected" : "Claude AI: no key set"}
          </div>
          <div className="text-sm font-medium text-ink">{user.name}</div>
          <div className="mb-2 text-xs text-ink-300">{ROLE_LABEL[user.role]}</div>
          <button onClick={logout} className="text-xs font-medium text-ink-500 underline hover:text-ink">
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
