import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { generateClaimNumber } from "../lib/ids.js";
import {
  AI_DISABLED_MESSAGE,
  assessRisk,
  draftMemberMessage,
  recommendAdjudication,
  summarizeClaim,
} from "../services/claude.js";

export const claimsRouter = Router();
claimsRouter.use(requireAuth);

const claimInclude = {
  policy: { include: { member: true } },
  provider: true,
  documents: true,
  statusHistory: { orderBy: { createdAt: "asc" as const } },
  queries: { orderBy: { createdAt: "desc" as const } },
};

function serializeClaim(claim: any) {
  return {
    ...claim,
    aiSummary: claim.aiSummary ? JSON.parse(claim.aiSummary) : null,
    aiRisk: claim.aiRisk ? JSON.parse(claim.aiRisk) : null,
    aiRecommendation: claim.aiRecommendation ? JSON.parse(claim.aiRecommendation) : null,
  };
}

async function assertAccess(req: any, claim: any) {
  if (req.user.role === "MEMBER" && claim.policy.memberId !== req.user.memberId) return false;
  if (req.user.role === "PROVIDER" && claim.providerId !== req.user.providerId) return false;
  return true;
}

claimsRouter.get("/", async (req, res) => {
  const where: any = {};
  if (req.user!.role === "MEMBER") where.policy = { memberId: req.user!.memberId };
  if (req.user!.role === "PROVIDER") where.providerId = req.user!.providerId;
  if (typeof req.query.status === "string") where.status = req.query.status;

  const claims = await prisma.claim.findMany({
    where,
    include: claimInclude,
    orderBy: { submittedAt: "desc" },
  });
  res.json({ claims: claims.map(serializeClaim) });
});

const createSchema = z.object({
  policyId: z.string(),
  providerId: z.string(),
  type: z.enum(["CASHLESS", "REIMBURSEMENT"]),
  diagnosis: z.string().min(2),
  icdCode: z.string().min(2),
  admissionDate: z.string(),
  dischargeDate: z.string().nullable().optional(),
  claimedAmount: z.number().positive(),
});

claimsRouter.post("/", requireRole("MEMBER", "PROVIDER"), async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const data = parsed.data;

  const policy = await prisma.policy.findUnique({ where: { id: data.policyId } });
  if (!policy) return res.status(404).json({ error: "Policy not found" });
  if (req.user!.role === "MEMBER" && policy.memberId !== req.user!.memberId) {
    return res.status(403).json({ error: "Not your policy" });
  }

  const claim = await prisma.claim.create({
    data: {
      claimNumber: generateClaimNumber(),
      policyId: data.policyId,
      providerId: req.user!.role === "PROVIDER" ? req.user!.providerId! : data.providerId,
      type: data.type,
      diagnosis: data.diagnosis,
      icdCode: data.icdCode,
      admissionDate: new Date(data.admissionDate),
      dischargeDate: data.dischargeDate ? new Date(data.dischargeDate) : null,
      claimedAmount: data.claimedAmount,
      statusHistory: {
        create: {
          status: "SUBMITTED",
          note: "Claim submitted for processing.",
          actorRole: req.user!.role,
          actorName: req.user!.name,
        },
      },
    },
    include: claimInclude,
  });
  res.status(201).json({ claim: serializeClaim(claim) });
});

claimsRouter.get("/:id", async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id }, include: claimInclude });
  if (!claim) return res.status(404).json({ error: "Claim not found" });
  if (!(await assertAccess(req, claim))) return res.status(403).json({ error: "Not your claim" });
  res.json({ claim: serializeClaim(claim) });
});

const docSchema = z.object({
  docType: z.enum([
    "DISCHARGE_SUMMARY",
    "HOSPITAL_BILL",
    "PRESCRIPTION",
    "LAB_REPORT",
    "ID_PROOF",
    "PRE_AUTH_FORM",
    "OTHER",
  ]),
  fileName: z.string().min(1),
  extractedText: z.string().min(1),
});

claimsRouter.post("/:id/documents", requireRole("MEMBER", "PROVIDER"), async (req, res) => {
  const parsed = docSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id }, include: { policy: true } });
  if (!claim) return res.status(404).json({ error: "Claim not found" });
  if (!(await assertAccess(req, claim))) return res.status(403).json({ error: "Not your claim" });

  await prisma.claimDocument.create({ data: { claimId: claim.id, ...parsed.data } });
  const updated = await prisma.claim.findUnique({ where: { id: claim.id }, include: claimInclude });
  res.status(201).json({ claim: serializeClaim(updated) });
});

// ── AI actions (ops workspace) ──────────────────────────────────────────
claimsRouter.post("/:id/ai/summarize", requireRole("INSURER_OPS", "ADMIN"), async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id }, include: { documents: true } });
  if (!claim) return res.status(404).json({ error: "Claim not found" });
  try {
    const summary = await summarizeClaim({
      diagnosis: claim.diagnosis,
      icdCode: claim.icdCode,
      claimedAmount: claim.claimedAmount,
      type: claim.type,
      admissionDate: claim.admissionDate.toISOString(),
      dischargeDate: claim.dischargeDate?.toISOString() ?? null,
      documents: claim.documents.map((d) => ({ docType: d.docType, extractedText: d.extractedText })),
    });
    await prisma.claim.update({
      where: { id: claim.id },
      data: { aiSummary: JSON.stringify(summary), status: claim.status === "SUBMITTED" ? "AI_TRIAGED" : claim.status },
    });
    res.json({ summary });
  } catch (err: any) {
    res.status(err.message === AI_DISABLED_MESSAGE ? 503 : 500).json({ error: err.message });
  }
});

claimsRouter.post("/:id/ai/risk", requireRole("INSURER_OPS", "ADMIN"), async (req, res) => {
  const claim = await prisma.claim.findUnique({
    where: { id: req.params.id },
    include: { documents: true, policy: true },
  });
  if (!claim) return res.status(404).json({ error: "Claim not found" });
  const priorClaims = await prisma.claim.count({
    where: { policyId: claim.policyId, id: { not: claim.id } },
  });
  try {
    const risk = await assessRisk({
      diagnosis: claim.diagnosis,
      claimedAmount: claim.claimedAmount,
      sumInsured: claim.policy.sumInsured,
      type: claim.type,
      admissionDate: claim.admissionDate.toISOString(),
      dischargeDate: claim.dischargeDate?.toISOString() ?? null,
      memberClaimCountLast12Months: priorClaims,
      documents: claim.documents.map((d) => ({ docType: d.docType, extractedText: d.extractedText })),
    });
    await prisma.claim.update({ where: { id: claim.id }, data: { aiRisk: JSON.stringify(risk) } });
    res.json({ risk });
  } catch (err: any) {
    res.status(err.message === AI_DISABLED_MESSAGE ? 503 : 500).json({ error: err.message });
  }
});

claimsRouter.post("/:id/ai/recommend", requireRole("INSURER_OPS", "ADMIN"), async (req, res) => {
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id }, include: { policy: true } });
  if (!claim) return res.status(404).json({ error: "Claim not found" });
  if (!claim.aiSummary || !claim.aiRisk) {
    return res.status(400).json({ error: "Run summarize and risk assessment first" });
  }
  try {
    const rec = await recommendAdjudication({
      diagnosis: claim.diagnosis,
      claimedAmount: claim.claimedAmount,
      policyWording: claim.policy.policyWording,
      roomRentLimit: claim.policy.roomRentLimit,
      copayPercent: claim.policy.copayPercent,
      riskSummary: claim.aiRisk,
      caseSummary: claim.aiSummary,
    });
    await prisma.claim.update({
      where: { id: claim.id },
      data: { aiRecommendation: JSON.stringify(rec), status: "UNDER_REVIEW" },
    });
    res.json({ recommendation: rec });
  } catch (err: any) {
    res.status(err.message === AI_DISABLED_MESSAGE ? 503 : 500).json({ error: err.message });
  }
});

// ── Human decision ───────────────────────────────────────────────────────
const decisionSchema = z.object({
  status: z.enum(["APPROVED", "PARTIALLY_APPROVED", "QUERY_RAISED", "REJECTED", "SETTLED"]),
  approvedAmount: z.number().nonnegative().nullable().optional(),
  note: z.string().min(1),
  queryQuestion: z.string().optional(),
});

claimsRouter.post("/:id/decision", requireRole("INSURER_OPS", "ADMIN"), async (req, res) => {
  const parsed = decisionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.issues[0].message });
  const claim = await prisma.claim.findUnique({ where: { id: req.params.id } });
  if (!claim) return res.status(404).json({ error: "Claim not found" });
  const data = parsed.data;

  let memberMessage = data.note;
  try {
    memberMessage = await draftMemberMessage({
      decision: data.status,
      note: data.note,
      diagnosis: claim.diagnosis,
      approvedAmount: data.approvedAmount ?? null,
      claimedAmount: claim.claimedAmount,
    });
  } catch {
    // AI disabled — fall back to the adjudicator's raw note, still a fine demo experience.
  }

  await prisma.$transaction([
    prisma.claim.update({
      where: { id: claim.id },
      data: {
        status: data.status,
        approvedAmount: data.approvedAmount ?? claim.approvedAmount,
      },
    }),
    prisma.claimStatusHistory.create({
      data: {
        claimId: claim.id,
        status: data.status,
        note: memberMessage,
        actorRole: req.user!.role,
        actorName: req.user!.name,
      },
    }),
    ...(data.status === "QUERY_RAISED" && data.queryQuestion
      ? [
          prisma.claimQuery.create({
            data: { claimId: claim.id, question: data.queryQuestion },
          }),
        ]
      : []),
  ]);

  const updated = await prisma.claim.findUnique({ where: { id: claim.id }, include: claimInclude });
  res.json({ claim: serializeClaim(updated) });
});

const queryResponseSchema = z.object({ response: z.string().min(1) });

claimsRouter.post("/queries/:queryId/respond", requireRole("MEMBER"), async (req, res) => {
  const parsed = queryResponseSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Response required" });
  const query = await prisma.claimQuery.findUnique({
    where: { id: req.params.queryId },
    include: { claim: { include: { policy: true } } },
  });
  if (!query) return res.status(404).json({ error: "Query not found" });
  if (query.claim.policy.memberId !== req.user!.memberId) return res.status(403).json({ error: "Not your claim" });

  await prisma.$transaction([
    prisma.claimQuery.update({ where: { id: query.id }, data: { memberResponse: parsed.data.response, resolved: true } }),
    prisma.claim.update({ where: { id: query.claimId }, data: { status: "UNDER_REVIEW" } }),
    prisma.claimStatusHistory.create({
      data: {
        claimId: query.claimId,
        status: "UNDER_REVIEW",
        note: "Member responded to the query — back with the claims team for review.",
        actorRole: "MEMBER",
        actorName: req.user!.name,
      },
    }),
  ]);

  const updated = await prisma.claim.findUnique({ where: { id: query.claimId }, include: claimInclude });
  res.json({ claim: serializeClaim(updated) });
});
