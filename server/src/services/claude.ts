import Anthropic from "@anthropic-ai/sdk";
import { aiEnabled, env } from "../env.js";

let client: Anthropic | null = null;
function getClient(): Anthropic | null {
  if (!aiEnabled) return null;
  if (!client) client = new Anthropic({ apiKey: env.anthropicApiKey });
  return client;
}

export const AI_DISABLED_MESSAGE =
  "AI features are turned off — add ANTHROPIC_API_KEY to server/.env and restart the server to enable them.";

/** Pulls the first {...} or [...] block out of a model reply and parses it. */
function extractJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error("Model did not return JSON");
  return JSON.parse(match[0]) as T;
}

async function complete(system: string, prompt: string, maxTokens = 1024): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) throw new Error(AI_DISABLED_MESSAGE);
  const msg = await anthropic.messages.create({
    model: env.anthropicModel,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export interface ClaimSummary {
  summary: string;
  keyFacts: string[];
  flags: string[];
}

export async function summarizeClaim(input: {
  diagnosis: string;
  icdCode: string;
  claimedAmount: number;
  type: string;
  admissionDate: string;
  dischargeDate: string | null;
  documents: { docType: string; extractedText: string }[];
}): Promise<ClaimSummary> {
  const system =
    "You are a clinical claims analyst assisting a health insurance adjudicator in India. " +
    "You read raw hospital documents and produce a short, factual case brief. " +
    "Never invent facts that aren't in the provided text. Respond with ONLY a JSON object, no prose, no markdown fences.";
  const prompt = `Claim details:
Type: ${input.type}
Diagnosis: ${input.diagnosis} (ICD-10: ${input.icdCode})
Claimed amount: INR ${input.claimedAmount}
Admission: ${input.admissionDate}  Discharge: ${input.dischargeDate ?? "not yet discharged"}

Documents on file:
${input.documents.map((d) => `--- ${d.docType} ---\n${d.extractedText}`).join("\n\n") || "(none uploaded yet)"}

Return JSON of the shape:
{"summary": "2-3 sentence plain-language case summary for the adjudicator",
 "keyFacts": ["short factual bullet", "..."],
 "flags": ["anything inconsistent, missing, or worth a second look — empty array if nothing stands out"]}`;
  const text = await complete(system, prompt);
  return extractJson<ClaimSummary>(text);
}

export interface RiskAssessment {
  riskScore: number; // 0-100, higher = more suspicious
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  reasons: string[];
}

export async function assessRisk(input: {
  diagnosis: string;
  claimedAmount: number;
  sumInsured: number;
  type: string;
  admissionDate: string;
  dischargeDate: string | null;
  memberClaimCountLast12Months: number;
  documents: { docType: string; extractedText: string }[];
}): Promise<RiskAssessment> {
  const system =
    "You are a fraud & abuse detection assistant for a health insurance TPA in India. " +
    "You score claims for adjudicator attention, not to auto-deny them. Be measured — most claims are legitimate. " +
    "Respond with ONLY a JSON object, no prose, no markdown fences.";
  const prompt = `Claim: ${input.type}, diagnosis "${input.diagnosis}", claimed INR ${input.claimedAmount} against a sum insured of INR ${input.sumInsured}.
Admission ${input.admissionDate}, discharge ${input.dischargeDate ?? "not yet discharged"}.
This member has filed ${input.memberClaimCountLast12Months} other claim(s) in the last 12 months.

Documents:
${input.documents.map((d) => `--- ${d.docType} ---\n${d.extractedText}`).join("\n\n") || "(none uploaded yet)"}

Consider length-of-stay vs diagnosis norms, claimed amount vs typical cost for this diagnosis in India, document completeness,
and claim frequency. Return JSON:
{"riskScore": 0-100, "riskLevel": "LOW"|"MEDIUM"|"HIGH", "reasons": ["short factual reason", "..."]}`;
  const text = await complete(system, prompt);
  return extractJson<RiskAssessment>(text);
}

export interface AdjudicationRecommendation {
  recommendation: "APPROVE" | "PARTIALLY_APPROVE" | "QUERY" | "REJECT";
  approvedAmount: number;
  justification: string;
  clauses: string[];
}

export async function recommendAdjudication(input: {
  diagnosis: string;
  claimedAmount: number;
  policyWording: string;
  roomRentLimit: string;
  copayPercent: number;
  riskSummary: string;
  caseSummary: string;
}): Promise<AdjudicationRecommendation> {
  const system =
    "You are drafting a recommended adjudication decision for a human claims officer at an Indian health insurer to review — " +
    "you do not have final authority. Ground every judgement in the policy wording given to you. " +
    "Respond with ONLY a JSON object, no prose, no markdown fences.";
  const prompt = `Policy wording (source of truth for coverage rules):
"""
${input.policyWording}
"""
Room rent limit: ${input.roomRentLimit}. Co-pay: ${input.copayPercent}%.

Case summary: ${input.caseSummary}
Risk assessment: ${input.riskSummary}
Diagnosis: ${input.diagnosis}. Claimed amount: INR ${input.claimedAmount}.

Draft a recommendation. approvedAmount should reflect any co-pay/sub-limit deductions you apply, and must be 0 if recommending
QUERY or REJECT. Return JSON:
{"recommendation": "APPROVE"|"PARTIALLY_APPROVE"|"QUERY"|"REJECT",
 "approvedAmount": number,
 "justification": "2-4 sentences citing the specific policy terms used",
 "clauses": ["short quote or paraphrase of the policy clause relied on", "..."]}`;
  const text = await complete(system, prompt);
  return extractJson<AdjudicationRecommendation>(text);
}

export async function policyAssistantReply(input: {
  policyWording: string;
  planName: string;
  insurer: string;
  sumInsured: number;
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
}): Promise<string> {
  const anthropic = getClient();
  if (!anthropic) throw new Error(AI_DISABLED_MESSAGE);
  const system = `You are ClaimSetu's policy assistant, helping a policyholder understand their own health insurance plan
("${input.planName}" by ${input.insurer}, sum insured INR ${input.sumInsured}). Answer ONLY using the policy wording below —
if something isn't covered by it, say the member should raise a query with their insurer rather than guessing. Keep answers
short, warm, and jargon-free. Policy wording:
"""
${input.policyWording}
"""`;
  const msg = await anthropic.messages.create({
    model: env.anthropicModel,
    max_tokens: 500,
    system,
    messages: [...input.history, { role: "user", content: input.question }],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "I couldn't generate a reply — please try again.";
}

export async function draftMemberMessage(input: {
  decision: string;
  note: string;
  diagnosis: string;
  approvedAmount: number | null;
  claimedAmount: number;
}): Promise<string> {
  const system =
    "You write short, empathetic, plain-language claim status messages for policyholders in India. " +
    "No legalese. 3-5 sentences. Plain text only, no markdown, no JSON.";
  const prompt = `Decision: ${input.decision}
Adjudicator's internal note: ${input.note}
Diagnosis: ${input.diagnosis}
Claimed: INR ${input.claimedAmount}  Approved: ${input.approvedAmount ?? "N/A"}

Write the message the member will read in their claim timeline.`;
  return complete(system, prompt, 300);
}
