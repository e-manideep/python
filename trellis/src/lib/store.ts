import { create } from "zustand";
import { generateDataset, FLAGSHIP_DEVELOPER } from "../data/seed";
import type { Persona, RentPayment, TrellisDataset, WorkOrder, WorkOrderCategory, WorkOrderPriority } from "../types";
import { loadJSON, saveJSON } from "./storage";
import { isoDate } from "../lib/dates";

export const dataset: TrellisDataset = generateDataset();

export const PERSONAS: Persona[] = [
  {
    id: "persona-investor",
    role: "investor",
    displayName: "Aditya Rao",
    subtitle: "Portfolio Director, Southbridge Realty Partners",
    linkedId: dataset.owners.find((o) => o.name === "Southbridge Realty Partners")?.id ?? dataset.owners[0].id,
  },
  {
    id: "persona-resident",
    role: "resident",
    displayName: "",
    subtitle: "Resident",
    linkedId: "",
  },
  {
    id: "persona-vendor",
    role: "vendor",
    displayName: "",
    subtitle: "Vendor Partner",
    linkedId: "",
  },
  {
    id: "persona-ops",
    role: "ops",
    displayName: "Karthik Subramanian",
    subtitle: "City Operations Manager, Bengaluru",
    linkedId: "blr",
  },
  {
    id: "persona-builder",
    role: "builder",
    displayName: "Vikram Chowdary",
    subtitle: `VP Post-Handover Services, ${FLAGSHIP_DEVELOPER}`,
    linkedId: FLAGSHIP_DEVELOPER,
  },
];

// Wire the resident persona to someone with recent activity, so the demo has substance.
(function wireResidentPersona() {
  const occupiedUnitIds = new Set(dataset.residents.map((r) => r.unitId));
  const withOpenTicket = dataset.workOrders.find((w) => w.status !== "Completed" && w.unitId && occupiedUnitIds.has(w.unitId));
  const unitId = withOpenTicket?.unitId ?? dataset.units.find((u) => u.status === "Occupied")!.id;
  const resident = dataset.residents.find((r) => r.unitId === unitId)!;
  const p = PERSONAS.find((p) => p.id === "persona-resident")!;
  p.displayName = resident.name;
  const unit = dataset.units.find((u) => u.id === unitId)!;
  const property = dataset.properties.find((pr) => pr.id === unit.propertyId)!;
  p.subtitle = `Resident, ${unit.unitNumber}, ${property.name}`;
  p.linkedId = resident.id;

  // Guarantee the showcased resident always has this month's rent payable, so the
  // "Pay Rent" flow is demoable without depending on the luck of the generator's roll.
  const lease = dataset.leases.find((l) => l.id === unit.activeLeaseId);
  const currentMonth = dataset.months[dataset.months.length - 1];
  const payment = dataset.rentPayments.find((rp) => rp.leaseId === lease?.id && rp.month === currentMonth);
  if (payment) {
    payment.status = "Pending";
    payment.paidDate = null;
  }
})();

(function wireVendorPersona() {
  const vendor = [...dataset.vendors].sort((a, b) => b.jobsCompleted - a.jobsCompleted)[0];
  const p = PERSONAS.find((p) => p.id === "persona-vendor")!;
  p.displayName = vendor.name;
  p.subtitle = `${vendor.categories.join(", ")} · ${vendor.cityId === "blr" ? "Bengaluru" : "Pune"}`;
  p.linkedId = vendor.id;
})();

interface WorkOrderOverride {
  status: WorkOrder["status"];
  vendorId?: string | null;
  resolvedDate?: string | null;
  residentRating?: number | null;
}

interface MutationState {
  workOrderOverrides: Record<string, WorkOrderOverride>;
  newWorkOrders: WorkOrder[];
  paidPaymentIds: string[];
  selectedPersonaId: string;
}

const DEFAULT_MUTATIONS: MutationState = {
  workOrderOverrides: {},
  newWorkOrders: [],
  paidPaymentIds: [],
  selectedPersonaId: "persona-investor",
};

interface TrellisStore extends MutationState {
  workOrders: WorkOrder[];
  rentPayments: RentPayment[];
  setPersona: (id: string) => void;
  advanceWorkOrder: (id: string, status: WorkOrder["status"], vendorId?: string | null) => void;
  raiseTicket: (input: { propertyId: string; unitId: string | null; category: WorkOrderCategory; description: string; priority: WorkOrderPriority }) => void;
  payRent: (paymentId: string) => void;
  resetDemoState: () => void;
}

function computeDerived(state: MutationState) {
  const workOrders = dataset.workOrders
    .map((w) => {
      const o = state.workOrderOverrides[w.id];
      return o ? { ...w, status: o.status, vendorId: o.vendorId ?? w.vendorId, resolvedDate: o.resolvedDate ?? w.resolvedDate } : w;
    })
    .concat(state.newWorkOrders);

  const paidSet = new Set(state.paidPaymentIds);
  const rentPayments = dataset.rentPayments.map((p) => (paidSet.has(p.id) ? { ...p, status: "Paid" as const, paidDate: p.paidDate ?? isoDate(0) } : p));

  return { workOrders, rentPayments };
}

const persisted = loadJSON<MutationState>("mutations", DEFAULT_MUTATIONS);

export const useTrellisStore = create<TrellisStore>((set, get) => ({
  ...persisted,
  ...computeDerived(persisted),

  setPersona: (id) => {
    set({ selectedPersonaId: id });
    persist(get());
  },

  advanceWorkOrder: (id, status, vendorId) => {
    const overrides = { ...get().workOrderOverrides };
    const resolvedDate = status === "Completed" ? isoDate(0) : (overrides[id]?.resolvedDate ?? null);
    overrides[id] = { status, vendorId: vendorId ?? overrides[id]?.vendorId ?? undefined, resolvedDate };
    const next = { ...get(), workOrderOverrides: overrides };
    set({ workOrderOverrides: overrides, ...computeDerived(next) });
    persist(get());
  },

  raiseTicket: (input) => {
    const id = `wo-new-${get().newWorkOrders.length}-${Date.now()}`;
    const slaHours = { Low: 168, Medium: 72, High: 24, Critical: 4 }[input.priority];
    const wo: WorkOrder = {
      id,
      propertyId: input.propertyId,
      unitId: input.unitId,
      category: input.category,
      description: input.description,
      priority: input.priority,
      status: "Open",
      raisedBy: "Resident",
      createdDate: isoDate(0),
      slaHours,
      vendorId: null,
      resolvedDate: null,
      cost: null,
      residentRating: null,
    };
    const newWorkOrders = [...get().newWorkOrders, wo];
    const next = { ...get(), newWorkOrders };
    set({ newWorkOrders, ...computeDerived(next) });
    persist(get());
  },

  payRent: (paymentId) => {
    const paidPaymentIds = [...get().paidPaymentIds, paymentId];
    const next = { ...get(), paidPaymentIds };
    set({ paidPaymentIds, ...computeDerived(next) });
    persist(get());
  },

  resetDemoState: () => {
    set({ ...DEFAULT_MUTATIONS, ...computeDerived(DEFAULT_MUTATIONS) });
    persist(get());
  },
}));

function persist(state: MutationState) {
  saveJSON("mutations", {
    workOrderOverrides: state.workOrderOverrides,
    newWorkOrders: state.newWorkOrders,
    paidPaymentIds: state.paidPaymentIds,
    selectedPersonaId: state.selectedPersonaId,
  });
}
