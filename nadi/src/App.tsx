import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { seedIfEmpty } from "./data/seed";
import { useViewpoint } from "./state/viewpoint";

import { Today } from "./pages/clinical/Today";
import { EncounterWorkspace } from "./pages/clinical/EncounterWorkspace";
import { PatientList } from "./pages/chart/PatientList";
import { PatientChart } from "./pages/chart/PatientChart";
import { ReferralsBoard } from "./pages/schedule/ReferralsBoard";
import { ClaimsQueue } from "./pages/claims/ClaimsQueue";
import { ClaimReview } from "./pages/claims/ClaimReview";
import { CommandCenter } from "./pages/command/CommandCenter";
import { PatientPortal } from "./pages/portal/PatientPortal";
import { Settings } from "./pages/settings/Settings";

function HomeRoute() {
  const { viewpoint } = useViewpoint();
  if (viewpoint === "patient") return <Navigate to="/portal" replace />;
  return <Today />;
}

export default function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    seedIfEmpty().then(() => setReady(true));
  }, []);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <div className="flex items-center gap-2 text-ink-soft">
          <span className="h-2 w-2 animate-pulse rounded-full bg-pulse" />
          Waking up Nadi…
        </div>
      </div>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/patients" element={<PatientList />} />
        <Route path="/patients/:id" element={<PatientChart />} />
        <Route path="/patients/:id/encounter/:encounterId" element={<EncounterWorkspace />} />
        <Route path="/referrals" element={<ReferralsBoard />} />
        <Route path="/claims" element={<ClaimsQueue />} />
        <Route path="/claims/:id" element={<ClaimReview />} />
        <Route path="/command" element={<CommandCenter />} />
        <Route path="/portal" element={<PatientPortal />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
