import Anthropic from "@anthropic-ai/sdk";
import * as repo from "../data/repositories";
import type {
  Allergy,
  ClaimAiRecommendation,
  ClaimAiRisk,
  ClaimAiSummary,
  Medication,
  Problem,
  SoapNote,
} from "../data/types";

// Every AI call in Nadi goes through this file. It talks to Anthropic directly
// from the browser (dangerouslyAllowBrowser) using a key the user pastes into
// Settings — a deliberate prototype choice: no server round-trip needed to
// demo the product, but a real deployment should proxy this through a backend
// so the key never ships to a browser at all.

export const AI_DISABLED_MESSAGE =
  "Add your Anthropic API key in Settings to turn this on — everything else in Nadi works without it.";

async function getClient(): Promise<Anthropic | null> {
  const s = await repo.settings.get();
  if (!s.anthropicApiKey) return null;
  return new Anthropic({ apiKey: s.anthropicApiKey, dangerouslyAllowBrowser: true });
}

function extractJson<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!match) throw new Error("Model did not return JSON");
  return JSON.parse(match[0]) as T;
}

async function complete(system: string, prompt: string, maxTokens = 1200): Promise<string> {
  const client = await getClient();
  if (!client) throw new Error(AI_DISABLED_MESSAGE);
  const s = await repo.settings.get();
  const msg = await client.messages.create({
    model: s.anthropicModel,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: prompt }],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

function patientContextBlock(opts: {
  name: string;
  age: number;
  gender: string;
  problems: Problem[];
  medications: Medication[];
  allergies: Allergy[];
}): string {
  return `Patient: ${opts.name}, ${opts.age}${opts.gender[0]}.
Active problems: ${opts.problems.filter((p) => p.status === "ACTIVE").map((p) => `${p.description} (${p.icdCode})`).join("; ") || "none on file"}.
Active medications: ${opts.medications.filter((m) => m.status === "ACTIVE").map((m) => `${m.name} ${m.dose} ${m.frequency}`).join("; ") || "none on file"}.
Known allergies: ${opts.allergies.map((a) => `${a.substance} (${a.reaction}, ${a.severity})`).join("; ") || "NKDA"}.`;
}

/** Structures a raw dictated/typed encounter transcript into a SOAP note. */
export async function structureEncounterNote(input: {
  chiefComplaint: string;
  transcript: string;
  patient: { name: string; age: number; gender: string; problems: Problem[]; medications: Medication[]; allergies: Allergy[] };
}): Promise<SoapNote> {
  const system =
    "You are a clinical documentation assistant embedded in a doctor's encounter workspace. You turn a clinician's " +
    "spoken or typed notes from a patient visit into a structured SOAP note. Never invent findings, values, or history " +
    "that aren't stated or clearly implied in the dictation — if objective findings weren't dictated, say so rather than " +
    "fabricating vitals or exam results. Write in a clinical register a physician would actually use, not a summary for " +
    "a layperson (except the afterVisitSummary field, which IS for the patient). Respond with ONLY a JSON object, no " +
    "prose, no markdown fences.";
  const prompt = `${patientContextBlock(input.patient)}
Chief complaint: ${input.chiefComplaint}

Clinician's raw dictation from today's encounter:
"""
${input.transcript}
"""

Return JSON of the shape:
{"subjective": "...", "objective": "... (only include exam/vitals actually dictated; note explicitly if none were given)",
 "assessment": "...", "plan": "...",
 "icdSuggestions": [{"code":"...", "label":"..."}],
 "afterVisitSummary": "3-4 warm, plain-language sentences the patient will read in their portal"}`;
  const text = await complete(system, prompt, 1400);
  return extractJson<SoapNote>(text);
}

export interface DecisionSupport {
  interactions: string[];
  alerts: string[];
  differentials: string[];
}

/** Real-time-ish clinical decision support triggered while a note is being written. */
export async function clinicalDecisionSupport(input: {
  transcript: string;
  patient: { name: string; age: number; gender: string; problems: Problem[]; medications: Medication[]; allergies: Allergy[] };
}): Promise<DecisionSupport> {
  const system =
    "You are a clinical decision support assistant for a physician, surfaced alongside their note as they write it. " +
    "Flag only things a careful clinician would actually want surfaced — real interactions with the patient's actual " +
    "medication list, real conflicts with their documented allergies, and differentials genuinely suggested by the " +
    "chief complaint and history given. Do not pad the list with generic textbook advice with no bearing on this " +
    "specific patient. Empty arrays are a correct answer when nothing applies. Respond with ONLY a JSON object.";
  const prompt = `${patientContextBlock(input.patient)}

Today's encounter so far:
"""
${input.transcript}
"""

Return JSON: {"interactions": ["specific drug-drug or drug-disease interaction relevant to this patient's actual med list, if any"],
"alerts": ["allergy conflicts or other patient-safety flags specific to this encounter, if any"],
"differentials": ["differential diagnoses genuinely worth considering for this presentation, if the complaint is diagnostically open"]}`;
  const text = await complete(system, prompt, 700);
  return extractJson<DecisionSupport>(text);
}

/** Drafts a structured e-referral letter from the chart + reason. */
export async function draftReferralLetter(input: {
  patient: { name: string; age: number; gender: string; problems: Problem[]; medications: Medication[]; allergies: Allergy[] };
  toSpecialty: string;
  reason: string;
  recentNoteSummary: string;
}): Promise<string> {
  const system =
    "You draft referral letters from one clinician to a specialist. Professional clinical register, concise, " +
    "includes exactly the context a specialist needs to triage and prepare — relevant history, current medications, " +
    "the specific question being asked. 4-6 sentences. Plain text, no markdown, no headers.";
  const prompt = `${patientContextBlock(input.patient)}
Recent relevant note: ${input.recentNoteSummary}
Referring to: ${input.toSpecialty}
Reason for referral: ${input.reason}

Draft the referral letter.`;
  return complete(system, prompt, 500);
}

/** Patient-facing navigator chat, grounded in the patient's own chart. */
export async function patientNavigatorReply(input: {
  patient: { name: string; problems: Problem[]; medications: Medication[]; allergies: Allergy[] };
  upcomingVisit: string | null;
  history: { role: "user" | "assistant"; content: string }[];
  question: string;
}): Promise<string> {
  const client = await getClient();
  if (!client) throw new Error(AI_DISABLED_MESSAGE);
  const s = await repo.settings.get();
  const system = `You are Nadi's patient navigator for ${input.patient.name}. Answer using only their actual chart below —
never invent a diagnosis, medication, or instruction that isn't on file. For anything clinical you're unsure about,
tell them to message their care team rather than guessing. Warm, brief, no jargon.
${patientContextBlock({ ...input.patient, age: 0, gender: "", problems: input.patient.problems, medications: input.patient.medications, allergies: input.patient.allergies })}
${input.upcomingVisit ? "Upcoming visit: " + input.upcomingVisit : "No upcoming visit scheduled."}`;
  const msg = await client.messages.create({
    model: s.anthropicModel,
    max_tokens: 500,
    system,
    messages: [...input.history, { role: "user", content: input.question }],
  });
  const block = msg.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "I couldn't generate a reply — please try again.";
}

// ---------------------------------------------------------------- Claims AI
// Same three-step review pattern as the insurance module: summarize, assess
// risk, then recommend a decision grounded in the actual policy wording.

export async function summarizeClaim(input: {
  diagnosis: string;
  claimedAmount: number;
  noteText: string;
}): Promise<ClaimAiSummary> {
  const system =
    "You are a clinical claims analyst assisting a health insurance adjudicator. Read the clinical note and produce a " +
    "short, factual case brief. Never invent facts not in the note. Respond with ONLY a JSON object.";
  const prompt = `Diagnosis: ${input.diagnosis}. Claimed amount: INR ${input.claimedAmount}.
Clinical note on file:
"""
${input.noteText}
"""
Return JSON: {"summary": "2-3 sentence case summary for the adjudicator", "keyFacts": ["..."], "flags": ["anything inconsistent or worth a second look — empty array if none"]}`;
  const text = await complete(system, prompt, 700);
  return extractJson<ClaimAiSummary>(text);
}

export async function assessClaimRisk(input: {
  diagnosis: string;
  claimedAmount: number;
  sumInsured: number;
  priorClaimCount: number;
}): Promise<ClaimAiRisk> {
  const system =
    "You are a fraud & abuse detection assistant for a health insurer. Score claims for adjudicator attention, not to " +
    "auto-deny them — most claims are legitimate. Respond with ONLY a JSON object.";
  const prompt = `Diagnosis: ${input.diagnosis}. Claimed INR ${input.claimedAmount} against sum insured INR ${input.sumInsured}.
This member has ${input.priorClaimCount} other claim(s) on file.
Return JSON: {"riskScore": 0-100, "riskLevel": "LOW"|"MEDIUM"|"HIGH", "reasons": ["..."]}`;
  const text = await complete(system, prompt, 500);
  return extractJson<ClaimAiRisk>(text);
}

export async function recommendClaimDecision(input: {
  diagnosis: string;
  claimedAmount: number;
  policyWording: string;
  caseSummary: string;
  riskSummary: string;
}): Promise<ClaimAiRecommendation> {
  const system =
    "You draft a recommended adjudication decision for a human claims officer to review — you do not have final " +
    "authority. Ground every judgement in the policy wording given. Respond with ONLY a JSON object.";
  const prompt = `Policy wording:
"""
${input.policyWording}
"""
Diagnosis: ${input.diagnosis}. Claimed: INR ${input.claimedAmount}.
Case summary: ${input.caseSummary}
Risk assessment: ${input.riskSummary}

Return JSON: {"recommendation": "APPROVE"|"PARTIALLY_APPROVE"|"QUERY"|"REJECT", "approvedAmount": number,
"justification": "2-4 sentences citing specific policy terms", "clauses": ["quoted or paraphrased clause relied on"]}`;
  const text = await complete(system, prompt, 700);
  return extractJson<ClaimAiRecommendation>(text);
}
