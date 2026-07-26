import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const policiesRouter = Router();
policiesRouter.use(requireAuth);

function serializePolicy(policy: any) {
  return {
    ...policy,
    networkHospitals: JSON.parse(policy.networkHospitals),
  };
}

policiesRouter.get("/mine", requireRole("MEMBER"), async (req, res) => {
  const policies = await prisma.policy.findMany({
    where: { memberId: req.user!.memberId },
    include: { dependents: true, member: true },
    orderBy: { startDate: "desc" },
  });
  res.json({ policies: policies.map(serializePolicy), member: req.user });
});

policiesRouter.get("/lookup/:policyNumber", requireRole("PROVIDER", "INSURER_OPS", "ADMIN"), async (req, res) => {
  const policy = await prisma.policy.findUnique({
    where: { policyNumber: req.params.policyNumber },
    include: { member: true, dependents: true },
  });
  if (!policy) return res.status(404).json({ error: "No policy found with that number" });
  res.json({ policy: serializePolicy(policy) });
});

policiesRouter.get("/:id", async (req, res) => {
  const policy = await prisma.policy.findUnique({
    where: { id: req.params.id },
    include: { dependents: true, member: true },
  });
  if (!policy) return res.status(404).json({ error: "Policy not found" });
  if (req.user!.role === "MEMBER" && policy.memberId !== req.user!.memberId) {
    return res.status(403).json({ error: "Not your policy" });
  }
  res.json({ policy: serializePolicy(policy) });
});
