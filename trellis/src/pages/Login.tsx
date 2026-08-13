import { useEffect, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTrellisStore } from "../lib/store";
import { DEMO_ACCOUNTS, DEMO_PASSWORD, ROLE_ROUTE, attemptLogin, type PersonaRole } from "../lib/auth";
import { Button } from "../components/ui";
import { TrellisMark } from "../components/Nav";

const ROLE_BLURB: Record<PersonaRole, string> = {
  investor: "Track portfolio performance, financials and Trellis Scores across every asset you own.",
  resident: "Pay rent, raise maintenance requests, and book vendors for your home.",
  vendor: "See your assigned jobs, update job status, and track earnings.",
  ops: "Dispatch work orders, manage vendors, and monitor SLA compliance across your city.",
  builder: "See how every unit you've handed over is performing, post-possession.",
};

function isRole(v: string | null): v is PersonaRole {
  return v === "investor" || v === "resident" || v === "vendor" || v === "ops" || v === "builder";
}

export function Login() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const setPersona = useTrellisStore((s) => s.setPersona);

  const initialRole = isRole(params.get("role")) ? params.get("role")! as PersonaRole : "investor";
  const next = params.get("next");

  const [role, setRole] = useState<PersonaRole>(initialRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
  }, [role]);

  const account = DEMO_ACCOUNTS.find((a) => a.role === role)!;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = attemptLogin(role, email, password);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setPersona(account.persona.id);
    navigate(next && next.startsWith("/") ? next : ROLE_ROUTE[role]);
  }

  function fillDemoCredentials() {
    setEmail(account.email);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="min-h-[calc(100svh-64px)] grid lg:grid-cols-2">
      {/* Branding panel */}
      <div className="hidden lg:flex flex-col justify-between bg-ink-950 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.07] pointer-events-none" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "28px 28px" }} />
        <Link to="/" className="flex items-center gap-2 relative">
          <TrellisMark />
          <span className="font-display text-lg tracking-tight">Trellis</span>
        </Link>
        <div className="relative max-w-md">
          <h1 className="font-display text-3xl leading-tight mb-4">One operating layer. Five real logins.</h1>
          <p className="text-ink-300 leading-relaxed">
            Owners, residents, vendors, field ops and developers each get their own account and their own view of the
            same live operating data — not one shared "god mode" toggle. Sign in as whichever side of the platform you
            want to explore.
          </p>
        </div>
        <p className="relative text-xs text-ink-500">Hyderabad &amp; Secunderabad, Telangana, India</p>
      </div>

      {/* Login form */}
      <div className="flex items-center justify-center p-6 sm:p-10 bg-ink-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <TrellisMark />
            <span className="font-display text-lg tracking-tight text-ink-950">Trellis</span>
          </div>

          <div className="mb-6">
            <h2 className="font-display text-2xl text-ink-950">Sign in</h2>
            <p className="text-sm text-ink-500 mt-1">Choose which side of the platform you're signing in as.</p>
          </div>

          <div className="grid grid-cols-5 gap-1.5 mb-6">
            {DEMO_ACCOUNTS.map((a) => (
              <button
                key={a.role}
                onClick={() => setRole(a.role)}
                className={`rounded-lg px-2 py-2.5 text-[11px] font-semibold text-center leading-tight transition-colors ${role === a.role ? "bg-ink-950 text-white" : "bg-white border border-ink-200 text-ink-600 hover:border-ink-300"}`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-ink-100 p-6 shadow-sm">
            <p className="text-sm text-ink-600 mb-5">{ROLE_BLURB[role]}</p>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <label className="block text-sm">
                <span className="block text-ink-700 font-medium mb-1.5">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={account.email}
                  className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-950/10"
                  autoComplete="username"
                />
              </label>
              <label className="block text-sm">
                <span className="block text-ink-700 font-medium mb-1.5">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full border border-ink-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ink-950/10"
                  autoComplete="current-password"
                />
              </label>

              {error && <div className="rounded-lg bg-score-risk-bg text-score-risk text-sm px-3 py-2">{error}</div>}

              <Button type="submit" className="w-full !py-2.5">Sign In as {account.label}</Button>
            </form>

            <div className="mt-4 pt-4 border-t border-ink-100">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-ink-500">
                  <span className="font-semibold text-ink-700">Demo account</span> — this is a self-contained product
                  demo, not a real login. Credentials are shown so you can explore freely.
                </div>
                <Button type="button" variant="secondary" className="!text-xs !px-3 !py-1.5 shrink-0" onClick={fillDemoCredentials}>
                  Autofill
                </Button>
              </div>
              <div className="mt-2 font-mono text-xs text-ink-500 bg-ink-50 rounded-lg px-3 py-2 space-y-0.5 break-all">
                <div>{account.email}</div>
                <div>{DEMO_PASSWORD}</div>
              </div>
            </div>
          </div>

          <p className="text-xs text-ink-400 text-center mt-6">
            <Link to="/" className="hover:text-ink-600 underline">← Back to overview</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
