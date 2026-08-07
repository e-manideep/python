// Core domain model for Trellis. Every screen in the app reads from this
// shape (or the derived score/insight types below) — there is exactly one
// path data travels, so numbers stay consistent across pages.

export type CityId = "blr" | "pun";

export interface City {
  id: CityId;
  name: string;
  state: string;
}

export type PropertyType = "Apartment Community" | "Villa Community" | "Independent Villa";

export type OwnerType = "Individual" | "NRI" | "Institutional Fund" | "Builder-Retained";

export interface Owner {
  id: string;
  name: string;
  type: OwnerType;
  baseLocation: string;
}

export interface ComplianceItem {
  id: string;
  type: "RERA Registration" | "Fire Safety NOC" | "Building Insurance" | "Lift AMC" | "Lease Documentation";
  status: "Valid" | "Expiring Soon" | "Expired";
  reference: string;
  expiryDate: string; // ISO date
}

export interface Property {
  id: string;
  name: string;
  cityId: CityId;
  locality: string;
  type: PropertyType;
  developer: string;
  yearBuilt: number;
  hasLift: boolean;
  totalUnits: number;
  ownerId: string;
  reraNumber: string;
  compliance: ComplianceItem[];
  amenities: string[];
}

export type UnitConfig = "1BHK" | "2BHK" | "3BHK" | "4BHK" | "Villa";
export type UnitStatus = "Occupied" | "Vacant" | "Notice Period";

export interface Unit {
  id: string;
  propertyId: string;
  unitNumber: string;
  config: UnitConfig;
  areaSqft: number;
  marketRent: number; // computed comp benchmark for this config+locality
  currentRent: number; // actual rent being charged (may drift from marketRent)
  capitalValue: number; // estimated market value, used for AUM / yield calcs
  status: UnitStatus;
  activeLeaseId: string | null;
  /** Month this unit has been continuously occupied since (independent of the current lease
   *  document's start date, which resets on renewal). Null if currently vacant. Drives the
   *  occupancy trend so a mature portfolio doesn't look like it launched 18 months ago. */
  occupiedSinceMonth: string | null;
}

export interface Resident {
  id: string;
  name: string;
  phone: string;
  email: string;
  unitId: string;
  moveInDate: string;
}

export interface Lease {
  id: string;
  unitId: string;
  residentId: string;
  rentAmount: number;
  depositAmount: number;
  startDate: string;
  endDate: string;
  status: "Active" | "Ended" | "Notice Period";
  renewedFromLeaseId: string | null;
}

export type RentPaymentStatus = "Paid" | "Paid Late" | "Pending" | "Overdue";

export interface RentPayment {
  id: string;
  leaseId: string;
  month: string; // YYYY-MM
  dueDate: string;
  paidDate: string | null;
  amount: number;
  status: RentPaymentStatus;
}

export type TransactionType =
  | "income-rent"
  | "income-other"
  | "expense-maintenance"
  | "expense-utilities"
  | "expense-staff"
  | "expense-property-tax"
  | "expense-insurance"
  | "expense-vendor"
  | "expense-marketing"
  | "expense-management-fee";

export interface Transaction {
  id: string;
  propertyId: string;
  month: string; // YYYY-MM
  type: TransactionType;
  amount: number;
  note: string;
}

export type WorkOrderCategory =
  | "Plumbing"
  | "Electrical"
  | "HVAC"
  | "Lift/Elevator"
  | "Painting"
  | "Pest Control"
  | "Civil/Structural"
  | "Housekeeping"
  | "Security Systems"
  | "Landscaping";

export type WorkOrderStatus = "Open" | "Assigned" | "In Progress" | "Completed" | "Overdue";
export type WorkOrderPriority = "Low" | "Medium" | "High" | "Critical";

export interface WorkOrder {
  id: string;
  propertyId: string;
  unitId: string | null;
  category: WorkOrderCategory;
  description: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  raisedBy: "Resident" | "Ops Inspection" | "Owner Request";
  createdDate: string;
  slaHours: number;
  vendorId: string | null;
  resolvedDate: string | null;
  cost: number | null;
  residentRating: number | null; // 1-5, set once completed
}

export type VendorCategory =
  | "Plumbing"
  | "Electrical"
  | "HVAC"
  | "Lift/Elevator"
  | "Painting"
  | "Pest Control"
  | "Civil/Structural"
  | "Housekeeping"
  | "Security Systems"
  | "Landscaping";

export interface Vendor {
  id: string;
  name: string;
  categories: VendorCategory[];
  cityId: CityId;
  contactPerson: string;
  gstNumber: string;
  jobsCompleted: number;
  avgRating: number; // 1-5
  slaCompliancePct: number; // 0-100
  avgCostPerJob: number;
  onboardedDate: string;
}

export interface CommunityPost {
  id: string;
  propertyId: string;
  authorRole: "Community Manager" | "Resident";
  authorName: string;
  title: string;
  body: string;
  date: string;
  category: "Notice" | "Event" | "Amenity Booking" | "General";
}

// ---- Derived / computed types (produced by the domain logic layer) ----

export interface SubScore {
  key: "financial" | "occupancy" | "maintenance" | "compliance" | "satisfaction";
  label: string;
  value0to100: number;
  weight: number;
  summary: string;
  drivers: string[];
}

export type ScoreBand = "Excellent" | "Good" | "Fair" | "Needs Attention";

export interface TrellisScoreResult {
  propertyId: string;
  composite: number; // 300-900
  band: ScoreBand;
  subScores: SubScore[];
  asOfMonth: string;
}

export interface ScoreSnapshot {
  propertyId: string;
  month: string;
  composite: number;
  financial: number;
  occupancy: number;
  maintenance: number;
  compliance: number;
  satisfaction: number;
}

export interface PropertyFinancials {
  propertyId: string;
  month: string;
  grossIncome: number;
  operatingExpenses: number;
  noi: number;
  noiMargin: number;
  collectionEfficiencyPct: number;
  yieldPct: number;
}

export type InsightSeverity = "info" | "watch" | "action";

export interface Insight {
  id: string;
  category: "Rent Optimization" | "Maintenance Risk" | "Occupancy Forecast" | "Renewal Risk" | "Vendor Performance" | "Compliance" | "Capital Planning" | "Sustainability" | "Portfolio";
  severity: InsightSeverity;
  propertyId: string | null;
  vendorId: string | null;
  title: string;
  detail: string;
  metricLabel: string;
  metricValue: string;
  method: string; // one line describing how it was computed — explainability
}

export interface TrellisDataset {
  cities: City[];
  owners: Owner[];
  properties: Property[];
  units: Unit[];
  residents: Resident[];
  leases: Lease[];
  rentPayments: RentPayment[];
  transactions: Transaction[];
  workOrders: WorkOrder[];
  vendors: Vendor[];
  communityPosts: CommunityPost[];
  months: string[];
  /** Internal generation quality lever per property, exposed only for verification/testing. */
  healthFactors: Record<string, number>;
}

export interface Persona {
  id: string;
  role: "investor" | "resident" | "vendor" | "ops";
  displayName: string;
  subtitle: string;
  linkedId: string; // ownerId | residentId | vendorId | cityId
}
