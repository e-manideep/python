import { createContext, useContext, useState, type ReactNode } from "react";
import type { Viewpoint } from "../data/types";

// Nadi is a single-browser prototype, not a multi-account system — this
// toggle simulates how the same data looks from each seat at the table
// (clinician, patient, admin) rather than being a real auth boundary.
interface ViewpointContextValue {
  viewpoint: Viewpoint;
  setViewpoint: (v: Viewpoint) => void;
  activePatientId: string | null;
  setActivePatientId: (id: string | null) => void;
}

const ViewpointContext = createContext<ViewpointContextValue | null>(null);

export function ViewpointProvider({ children }: { children: ReactNode }) {
  const [viewpoint, setViewpoint] = useState<Viewpoint>("clinician");
  const [activePatientId, setActivePatientId] = useState<string | null>(null);
  return (
    <ViewpointContext.Provider value={{ viewpoint, setViewpoint, activePatientId, setActivePatientId }}>
      {children}
    </ViewpointContext.Provider>
  );
}

export function useViewpoint() {
  const ctx = useContext(ViewpointContext);
  if (!ctx) throw new Error("useViewpoint must be used inside ViewpointProvider");
  return ctx;
}
