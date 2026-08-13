import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { anyLoggedIn, isLoggedIn, type PersonaRole } from "../lib/auth";

/** Gates a portal route behind a real logged-in session for that role (or, with
 *  role="any", behind any logged-in session at all — used for cross-stakeholder pages
 *  like Trellis Intelligence and property detail that aren't owned by one persona). */
export function ProtectedRoute({ role, children }: { role: PersonaRole | "any"; children: ReactNode }) {
  const location = useLocation();
  const authorized = role === "any" ? anyLoggedIn() : isLoggedIn(role);

  if (!authorized) {
    const roleParam = role === "any" ? "" : `role=${role}&`;
    return <Navigate to={`/login?${roleParam}next=${encodeURIComponent(location.pathname)}`} replace />;
  }

  return children;
}
