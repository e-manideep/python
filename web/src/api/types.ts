export type Role = "MEMBER" | "PROVIDER" | "INSURER_OPS" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  memberId?: string;
  providerId?: string;
}

export interface Dependent {
  id: string;
  name: string;
  relation: string;
  dob: string;
}

export interface Policy {
  id: string;
  policyNumber: string;
  memberId: string;
  insurer: string;
  planName: string;
  planTier: string;
  sumInsured: number;
  premium: number;
  roomRentLimit: string;
  copayPercent: number;
  startDate: string;
  endDate: string;
  status: string;
  networkHospitals: string[];
  policyWording: string;
  dependents?: Dependent[];
  member?: { name: string; healthId: string };
}

export interface Provider {
  id: string;
  providerCode: string;
  name: string;
  city: string;
  tier: string;
  networkStatus: string;
  specialties: string[];
}

export interface ClaimSummary {
  summary: string;
  keyFacts: string[];
  flags: string[];
}
export interface RiskAssessment {
  riskScore: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
}
export interface AdjudicationRecommendation {
  recommendation: "APPROVE" | "PARTIALLY_APPROVE" | "QUERY" | "REJECT";
  approvedAmount: number;
  justification: string;
  clauses: string[];
}

export interface ClaimDocument {
  id: string;
  docType: string;
  fileName: string;
  extractedText: string;
  uploadedAt: string;
}

export interface ClaimStatusHistory {
  id: string;
  status: string;
  note: string;
  actorRole: string;
  actorName: string;
  createdAt: string;
}

export interface ClaimQuery {
  id: string;
  question: string;
  memberResponse: string | null;
  resolved: boolean;
  createdAt: string;
}

export interface Claim {
  id: string;
  claimNumber: string;
  policyId: string;
  providerId: string;
  type: "CASHLESS" | "REIMBURSEMENT";
  diagnosis: string;
  icdCode: string;
  admissionDate: string;
  dischargeDate: string | null;
  claimedAmount: number;
  approvedAmount: number | null;
  status: string;
  aiSummary: ClaimSummary | null;
  aiRisk: RiskAssessment | null;
  aiRecommendation: AdjudicationRecommendation | null;
  submittedAt: string;
  updatedAt: string;
  policy: Policy;
  provider: Provider;
  documents: ClaimDocument[];
  statusHistory: ClaimStatusHistory[];
  queries: ClaimQuery[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AnalyticsOverview {
  totalClaims: number;
  byStatus: Record<string, number>;
  totalClaimed: number;
  totalApproved: number;
  leakagePrevented: number;
  approvalRate: number | null;
  avgTatDays: number | null;
  aiAssistedClaims: number;
  highRiskFlagged: number;
  volumeByDay: { date: string; count: number }[];
}
