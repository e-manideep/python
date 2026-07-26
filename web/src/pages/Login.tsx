import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../state/auth";
import { Button } from "../components/Button";
import { ApiError } from "../api/client";

const DEMO_ACCOUNTS = [
  { label: "Policyholder", sub: "Ananya Rao", email: "member@demo.claimsetu.in" },
  { label: "Network Provider", sub: "Yashoda Hospitals desk", email: "provider@demo.claimsetu.in" },
  { label: "Claims Adjudicator", sub: "Insurer ops", email: "ops@demo.claimsetu.in" },
  { label: "Administrator", sub: "Platform admin", email: "admin@demo.claimsetu.in" },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden w-1/2 flex-col justify-between bg-ink p-12 text-white lg:flex">
        <div className="font-serif text-2xl font-semibold">
          Claim<span className="text-teal-light">Setu</span>
        </div>
        <div>
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.2em] text-teal-light">
            The insurance rail for India's healthcare OS
          </div>
          <h1 className="mb-6 max-w-md font-serif text-4xl font-medium leading-tight">
            Claims adjudication that reads the file before you do.
          </h1>
          <p className="max-w-md text-sm leading-relaxed text-white/60">
            ClaimSetu pairs a real claims workflow — pre-auth, reimbursement, queries, settlement — with an AI reviewer
            that drafts the case summary, flags risk, and cites the exact policy clause behind every recommendation.
            A human always makes the final call.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6 border-t border-white/10 pt-6 text-sm text-white/50">
          <div>
            <div className="font-serif text-2xl text-teal-light">72hr</div>
            target claim TAT
          </div>
          <div>
            <div className="font-serif text-2xl text-teal-light">4</div>
            portals, one ledger
          </div>
          <div>
            <div className="font-serif text-2xl text-teal-light">100%</div>
            clause-cited decisions
          </div>
        </div>
      </div>

      <div className="flex w-full flex-col justify-center px-8 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <div className="font-serif text-2xl font-semibold text-ink">
              Claim<span className="text-teal">Setu</span>
            </div>
          </div>
          <h2 className="mb-1 font-serif text-2xl font-medium text-ink">Sign in</h2>
          <p className="mb-6 text-sm text-ink-500">Pick a demo role below, or use any seeded account.</p>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                placeholder="you@demo.claimsetu.in"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-500">Password</label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
              />
            </div>
            {error && <div className="rounded-lg bg-rose-pale px-3 py-2 text-sm text-rose">{error}</div>}
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <div className="mt-8">
            <div className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-300">Quick demo logins</div>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.email}
                  onClick={() => setEmail(acc.email)}
                  className="rounded-lg border border-line px-3 py-2 text-left text-xs hover:border-teal hover:bg-teal-pale"
                >
                  <div className="font-medium text-ink">{acc.label}</div>
                  <div className="text-ink-300">{acc.sub}</div>
                </button>
              ))}
            </div>
            <p className="mt-3 text-xs text-ink-300">Password for every demo account: demo1234</p>
          </div>
        </div>
      </div>
    </div>
  );
}
