import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { PERSONAS, useTrellisStore } from "../lib/store";
import { ROLE_ROUTE, ROLE_LABEL, loggedInRoles, isLoggedIn, logout, logoutAll } from "../lib/auth";
import { Button } from "./ui";

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
  useTrellisStore((s) => s.sessionVersion); // re-render on every login/logout, even same-id ones
  const setPersona = useTrellisStore((s) => s.setPersona);
  const navigate = useNavigate();

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const loggedIn = loggedInRoles();
  let current = PERSONAS.find((p) => p.id === selectedPersonaId);
  if (!current || !isLoggedIn(current.role)) {
    current = PERSONAS.find((p) => loggedIn.includes(p.role));
  }

  if (!current) {
    return (
      <Link to="/login">
        <Button variant="primary" className="!py-2">Log In</Button>
      </Link>
    );
  }

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
            <div className="text-xs font-semibold uppercase tracking-wide text-ink-500">Signed in as</div>
            <div className="text-sm text-ink-600 mt-0.5">{loggedIn.length} of 5 stakeholder accounts logged in on this browser.</div>
          </div>
          {PERSONAS.map((p) => {
            const active = isLoggedIn(p.role);
            return (
              <button
                key={p.id}
                onClick={() => {
                  setOpen(false);
                  if (active) {
                    setPersona(p.id);
                    navigate(ROLE_ROUTE[p.role]);
                  } else {
                    navigate(`/login?role=${p.role}`);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-ink-50 transition-colors ${p.id === current!.id ? "bg-bronze-50" : ""}`}
              >
                <span className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-semibold shrink-0 ${active ? "bg-ink-950 text-white" : "bg-ink-100 text-ink-400"}`}>
                  {active ? initials(p.displayName || "?") : "?"}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-ink-900 truncate">{active ? p.displayName : `Not signed in`}</span>
                  <span className="block text-xs text-ink-500 truncate">{active ? p.subtitle : "Click to sign in"}</span>
                </span>
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-bronze-700 bg-bronze-100 rounded-full px-2 py-0.5 shrink-0">{ROLE_LABEL[p.role]}</span>
              </button>
            );
          })}
          <div className="border-t border-ink-100 px-4 py-2.5 flex items-center justify-between gap-2">
            <button
              className="text-xs font-medium text-ink-500 hover:text-ink-800"
              onClick={() => {
                logout(current!.role);
                setPersona("");
                setOpen(false);
                navigate("/");
              }}
            >
              Log out of {ROLE_LABEL[current.role]}
            </button>
            <button
              className="text-xs font-medium text-score-risk hover:underline"
              onClick={() => {
                logoutAll();
                setPersona("");
                setOpen(false);
                navigate("/");
              }}
            >
              Log out all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
