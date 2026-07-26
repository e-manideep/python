import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { policyAssistantReply } from "../services/claude.js";

export const chatRouter = Router();
chatRouter.use(requireAuth, requireRole("MEMBER"));

chatRouter.get("/", async (req, res) => {
  const messages = await prisma.chatMessage.findMany({
    where: { memberId: req.user!.memberId },
    orderBy: { createdAt: "asc" },
  });
  res.json({ messages });
});

const schema = z.object({ message: z.string().min(1) });

chatRouter.post("/", async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Message required" });

  const policy = await prisma.policy.findFirst({
    where: { memberId: req.user!.memberId, status: "ACTIVE" },
    orderBy: { startDate: "desc" },
  });
  if (!policy) return res.status(404).json({ error: "No active policy found for your account" });

  const history = await prisma.chatMessage.findMany({
    where: { memberId: req.user!.memberId },
    orderBy: { createdAt: "asc" },
    take: 20,
  });

  await prisma.chatMessage.create({
    data: { memberId: req.user!.memberId!, role: "user", content: parsed.data.message },
  });

  try {
    const reply = await policyAssistantReply({
      policyWording: policy.policyWording,
      planName: policy.planName,
      insurer: policy.insurer,
      sumInsured: policy.sumInsured,
      history: history.map((h) => ({ role: h.role as "user" | "assistant", content: h.content })),
      question: parsed.data.message,
    });
    const saved = await prisma.chatMessage.create({
      data: { memberId: req.user!.memberId!, role: "assistant", content: reply },
    });
    res.json({ message: saved });
  } catch (err: any) {
    res.status(503).json({ error: err.message });
  }
});
