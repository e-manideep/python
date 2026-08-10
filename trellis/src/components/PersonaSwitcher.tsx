import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PERSONAS, useTrellisStore } from "../lib/store";
import type { Persona } from "../types";

const ROLE_ROUTE: Record<Persona["role"], string> = {
  investor: "/portfolio",
  resident: "/resident",
  vendor: "/vendor",
  ops: "/ops",
  builder: "/builder",
};

const ROLE_LABEL: Record<Persona["role"], string> = {
  investor: "Owner / Investor",
  resident: "Resident",
  vendor: "Vendor Partner",
  ops: "Ops Manager",
  builder: "Developer Partner",
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function PersonaSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selectedPersonaId = useTrellisStore((s) => s.selectedPersonaId);
  const setPersona = useTrellisStore((s) => s.setPersona);
  const navigate = useNavigate();
  const current = PERSONAS.find((p) => p.id === selectedPersonaId) ?? PERSONAS[0];

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2.5 rounded-full border border-ink-200 bg-white pl-1.5 pr-3 py-1.5 hover:border-ink-300 transition-colors">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-ink-950 text-white text-[11px] font-semibold">{initials(current.displayName || "?")}</span>
        <span className="text-left leading-tight">
          <span className="block text-sm font-semibold text-ink-900">{current.displayName}</span>
          <span className="block text-[11px] text-ink-500">{ROLE_LABEL[current.role]}</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 12 12" className="text-ink-400 ml-0.5">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-xl border border-ink-100 bg-white shadow-xl shadow-ink-950/5 overflow-hidden z-50">
          <div className="px-4 py-3 border-b border-ink-100 bg-ink-50">
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">Demo mode</div>
            <div className="text-sm text-ink-600 mt-0.5">Switch stakeholder view — one login, every side of the platform.</div>
          </div>
          {PERSONAS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPersona(p.id);
                setOpen(false);
                navigate(ROLE_ROUTE[p.role]);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-ink-50 transition-colors ${p.id === selectedPersonaId ? "bg-bronze-50" : ""}`}
            >
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-ink-950 text-white text-xs font-semibold shrink-0">{initials(p.displayName || "?")}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink-900 truncate">{p.displayName}</span>
                <span className="block text-xs text-ink-500 truncate">{p.subtitle}</span>
              </span>
              <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-bronze-700 bg-bronze-100 rounded-full px-2 py-0.5 shrink-0">{ROLE_LABEL[p.role]}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
