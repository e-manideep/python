import { useEffect, useState, type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useViewpoint } from "../state/viewpoint";
import * as repo from "../data/repositories";

interface NavItem {
  to: string;
  label: string;
}

const NAV: Record<string, NavItem[]> = {
  clinician: [
    { to: "/", label: "Today" },
    { to: "/patients", label: "Patients" },
    { to: "/referrals", label: "Referrals" },
    { to: "/claims", label: "Claims" },
    { to: "/command", label: "Command Center" },
  ],
  patient: [{ to: "/portal", label: "My Care" }],
  admin: [
    { to: "/command", label: "Command Center" },
    { to: "/claims", label: "Claims" },
    { to: "/patients", label: "Patients" },
  ],
};

const VIEWPOINT_LABEL: Record<string, string> = {
  clinician: "Dr. Meera Krishnan",
  patient: "Patient view",
  admin: "Practice admin",
};

export function AppShell({ children }: { children: ReactNode }) {
  const { viewpoint, setViewpoint } = useViewpoint();
  const [aiEnabled, setAiEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    repo.settings.get().then((s) => setAiEnabled(Boolean(s.anthropicApiKey)));
    const id = setInterval(() => repo.settings.get().then((s) => setAiEnabled(Boolean(s.anthropicApiKey))), 2000);
    return () => clearInterval(id);
  }, []);

  const items = NAV[viewpoint] ?? [];

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-64 shrink-0 flex-col border-r border-line bg-surface">
        <div className="border-b border-line px-5 py-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-pulse live-dot" />
            <div className="font-display text-xl font-bold tracking-tight text-ink">Nadi</div>
          </div>
          <div className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">
            Clinical AI Operating System
          </div>
        </div>

        <div className="border-b border-line px-4 py-3">
          <div className="grid grid-cols-3 gap-1 rounded-lg border border-line bg-paper p-1">
            {(["clinician", "patient", "admin"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setViewpoint(v)}
                className={`rounded-md px-2 py-1.5 text-[11px] font-semibold capitalize transition-colors ${
                  viewpoint === v ? "bg-ink text-white" : "text-ink-soft hover:bg-white"
                }`}
              >
                {v}
              </button>
            ))}
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
                  isActive ? "bg-ink text-white" : "text-ink-soft hover:bg-paper hover:text-ink"
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
              aiEnabled ? "border-pulse/30 bg-pulse-pale text-pulse" : "border-warn/30 bg-warn-pale text-warn"
            }`}
          >
            {aiEnabled === null ? "Checking Claude…" : aiEnabled ? "Claude: connected" : "Claude: no key set"}
          </div>
          <div className="mb-2 text-sm font-medium text-ink">{VIEWPOINT_LABEL[viewpoint]}</div>
          <NavLink to="/settings" className="text-xs font-medium text-ink-soft underline hover:text-ink">
            Settings
          </NavLink>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}
