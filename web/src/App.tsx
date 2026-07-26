import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./state/auth";
import { Shell } from "./components/Shell";
import { Login } from "./pages/Login";

import { MemberDashboard } from "./pages/member/Dashboard";
import { MemberClaims } from "./pages/member/Claims";
import { NewClaim } from "./pages/NewClaim";
import { ClaimDetail } from "./pages/ClaimDetail";
import { Assistant } from "./pages/member/Assistant";

import { ProviderDashboard } from "./pages/provider/ProviderDashboard";

import { OpsQueue } from "./pages/ops/Queue";
import { OpsClaimReview } from "./pages/ops/ClaimReview";
import { Analytics } from "./pages/admin/Analytics";

function HomeRoute() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "MEMBER") return <MemberDashboard />;
  if (user.role === "PROVIDER") return <ProviderDashboard />;
  return <OpsQueue />;
}

function ClaimDetailRoute() {
  const { user } = useAuth();
  if (user?.role === "INSURER_OPS" || user?.role === "ADMIN") return <OpsClaimReview />;
  return <ClaimDetail />;
}

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-ink-300">Loading ClaimSetu…</div>;
  }

  if (!user) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    );
  }

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/claims" element={<MemberClaims />} />
        <Route path="/claims/new" element={<NewClaim />} />
        <Route path="/claims/:id" element={<ClaimDetailRoute />} />
        <Route path="/assistant" element={<Assistant />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Shell>
  );
}
