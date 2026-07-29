// Nadi domain model. Every store here is a plain interface + a Dexie table —
// swapping IndexedDB for a real API later means reimplementing
// src/data/repositories.ts against that API; nothing above the repository
// layer needs to change.

export type Gender = "Female" | "Male" | "Other";
export type ClinicianRole = "CLINICIAN" | "ADMIN";
export type Viewpoint = "clinician" | "patient" | "admin";

export interface Patient {
  id: string;
  mrn: string; // e.g. MRN-2026-004821
  healthId: string; // ABHA-style unique health identifier
  name: string;
  dob: string; // ISO date
  gender: Gender;
  phone: string;
  city: string;
  photoInitials: string;
  policyId?: string;
  createdAt: string;
}

export interface Problem {
  id: string;
  patientId: string;
  description: string;
  icdCode: string;
  status: "ACTIVE" | "RESOLVED";
  onsetDate: string;
  source: "MANUAL" | "AI_NOTE";
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dose: string;
  frequency: string;
  route: string;
  status: "ACTIVE" | "DISCONTINUED";
  startDate: string;
  prescribedInEncounterId?: string;
}

export interface Allergy {
  id: string;
  patientId: string;
  substance: string;
  reaction: string;
  severity: "MILD" | "MODERATE" | "SEVERE";
}

export interface VitalsReading {
  id: string;
  patientId: string;
  encounterId?: string;
  takenAt: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  tempC: number;
  spo2: number;
  weightKg: number;
}

export type EncounterStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "NO_SHOW";
export type NoteStatus = "NONE" | "DRAFTING" | "DRAFT" | "SIGNED";

export interface SoapNote {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  icdSuggestions: { code: string; label: string }[];
  afterVisitSummary: string;
}

export interface Encounter {
  id: string;
  patientId: string;
  clinicianName: string;
  type: "Office Visit" | "Telehealth" | "Follow-up" | "New Patient";
  scheduledAt: string;
  durationMin: number;
  status: EncounterStatus;
  chiefComplaint: string;
  transcript: string;
  note: SoapNote | null;
  noteStatus: NoteStatus;
  signedAt?: string;
  noShowRisk?: number; // 0-100, AI-estimated at scheduling time
}

export type ReferralStatus = "DRAFTED" | "SENT" | "SCHEDULED" | "COMPLETED";

export interface Referral {
  id: string;
  patientId: string;
  encounterId: string;
  toSpecialty: string;
  toProvider: string;
  reason: string;
  letter: string;
  status: ReferralStatus;
  createdAt: string;
}

export interface Policy {
  id: string;
  patientId: string;
  policyNumber: string;
  insurer: string;
  planName: string;
  sumInsured: number;
  copayPercent: number;
  roomRentLimit: string;
  policyWording: string;
}

export type ClaimStatus =
  | "SUBMITTED"
  | "AI_TRIAGED"
  | "UNDER_REVIEW"
  | "QUERY_RAISED"
  | "APPROVED"
  | "PARTIALLY_APPROVED"
  | "REJECTED"
  | "SETTLED";

export interface ClaimAiSummary {
  summary: string;
  keyFacts: string[];
  flags: string[];
}
export interface ClaimAiRisk {
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
}
export interface ClaimAiRecommendation {
  recommendation: "APPROVE" | "PARTIALLY_APPROVE" | "QUERY" | "REJECT";
  approvedAmount: number;
  justification: string;
  clauses: string[];
}

export interface ClaimStatusEvent {
  status: ClaimStatus;
  note: string;
  actor: string;
  createdAt: string;
}

export interface Claim {
  id: string;
  claimNumber: string;
  patientId: string;
  encounterId: string;
  policyId: string;
  claimedAmount: number;
  approvedAmount: number | null;
  status: ClaimStatus;
  aiSummary: ClaimAiSummary | null;
  aiRisk: ClaimAiRisk | null;
  aiRecommendation: ClaimAiRecommendation | null;
  history: ClaimStatusEvent[];
  submittedAt: string;
}

export interface Message {
  id: string;
  patientId: string;
  from: "patient" | "clinician" | "ai";
  content: string;
  createdAt: string;
}

export interface AppSettings {
  id: "singleton";
  anthropicApiKey: string;
  anthropicModel: string;
  clinicianName: string;
  seeded: boolean;
}
