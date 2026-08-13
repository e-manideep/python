// Per-persona demo authentication. There's no backend (browser-storage-only app, by
// design — see README), so this can't be a real multi-tenant auth system. What it can
// be, and is, is an honest one: five pre-provisioned demo accounts, one per stakeholder
// role, with real credential validation and a session stored independently per role —
// logging in as the resident doesn't log you into the investor account, exactly like
// separate accounts in a real product. Wrong credentials fail. This replaces the old
// "instant persona switcher" which let anyone become any stakeholder with zero auth.

import { dataset, PERSONAS } from "./store";
import { loadJSON, saveJSON } from "./storage";
import type { Persona } from "../types";

export type PersonaRole = Persona["role"];

export const ROLE_ROUTE: Record<PersonaRole, string> = {
  investor: "/portfolio",
  resident: "/resident",
  vendor: "/vendor",
  ops: "/ops",
  builder: "/builder",
};

export const ROLE_LABEL: Record<PersonaRole, string> = {
  investor: "Owner / Investor",
  resident: "Resident",
  vendor: "Vendor Partner",
  ops: "Ops Manager",
  builder: "Developer Partner",
};

const ALL_ROLES: PersonaRole[] = ["investor", "resident", "vendor", "ops", "builder"];

function slugify(name: string): string {
  return name
    .split(" — ")[0] // strip " — City" disambiguation suffix some vendor names carry
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, ".");
}

/** Compact variant for domain/org labels — no dot-per-word, so a multi-word company
 *  name (e.g. "Southbridge Realty Partners") reads as one short domain segment instead
 *  of a long dotted chain. */
function slugifyCompact(name: string): string {
  return name
    .split(" — ")[0]
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "");
}

function personaFor(role: PersonaRole): Persona {
  return PERSONAS.find((p) => p.role === role)!;
}

/** One deterministic demo email per role, derived from the same seeded data every other
 *  screen reads from — not a separate invented identity. Residents already have a real
 *  generated `.email` field; the rest are derived the same way that field was: name + org. */
function demoEmail(role: PersonaRole): string {
  const persona = personaFor(role);
  if (role === "resident") {
    const resident = dataset.residents.find((r) => r.id === persona.linkedId)!;
    return resident.email;
  }
  if (role === "vendor") {
    const vendor = dataset.vendors.find((v) => v.id === persona.linkedId)!;
    return `contact@${slugifyCompact(vendor.name)}.example`;
  }
  if (role === "investor") {
    const owner = dataset.owners.find((o) => o.id === persona.linkedId);
    const org = owner ? slugifyCompact(owner.name) : "trellis";
    return `${slugify(persona.displayName)}@${org}.example`;
  }
  if (role === "builder") {
    return `${slugify(persona.displayName)}@${slugifyCompact(persona.linkedId)}.example`;
  }
  // ops — Trellis's own field team
  return `${slugify(persona.displayName)}@trellis.example`;
}

export const DEMO_PASSWORD = "trellis2026";

export interface DemoAccount {
  role: PersonaRole;
  persona: Persona;
  email: string;
  label: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = ALL_ROLES.map((role) => ({
  role,
  persona: personaFor(role),
  email: demoEmail(role),
  label: ROLE_LABEL[role],
}));

export function accountFor(role: PersonaRole): DemoAccount {
  return DEMO_ACCOUNTS.find((a) => a.role === role)!;
}

interface Session {
  email: string;
  loggedInAt: string;
}

function sessionKey(role: PersonaRole): string {
  return `session:${role}`;
}

export function getSession(role: PersonaRole): Session | null {
  return loadJSON<Session | null>(sessionKey(role), null);
}

export function isLoggedIn(role: PersonaRole): boolean {
  return getSession(role) !== null;
}

export function anyLoggedIn(): boolean {
  return ALL_ROLES.some(isLoggedIn);
}

export function loggedInRoles(): PersonaRole[] {
  return ALL_ROLES.filter(isLoggedIn);
}

/** Real (if simple) credential check against the known demo account for that role. */
export function attemptLogin(role: PersonaRole, email: string, password: string): { ok: true } | { ok: false; error: string } {
  const account = accountFor(role);
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !password) return { ok: false, error: "Enter both email and password." };
  if (normalizedEmail !== account.email.toLowerCase()) return { ok: false, error: "No demo account found with that email for this role." };
  if (password !== DEMO_PASSWORD) return { ok: false, error: "Incorrect password." };
  saveJSON<Session>(sessionKey(role), { email: account.email, loggedInAt: new Date().toISOString() });
  return { ok: true };
}

export function logout(role: PersonaRole): void {
  saveJSON<Session | null>(sessionKey(role), null);
}

export function logoutAll(): void {
  ALL_ROLES.forEach(logout);
}
