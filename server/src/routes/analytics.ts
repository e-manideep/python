import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export const analyticsRouter = Router();
analyticsRouter.use(requireAuth, requireRole("INSURER_OPS", "ADMIN"));

analyticsRouter.get("/overview", async (_req, res) => {
  const claims = await prisma.claim.findMany({ include: { statusHistory: true } });

  const byStatus: Record<string, number> = {};
  let totalClaimed = 0;
  let totalApproved = 0;
  let aiAssisted = 0;
  let highRisk = 0;
  const tatDaysList: number[] = [];
  const volumeByDay: Record<string, number> = {};

  for (const c of claims) {
    byStatus[c.status] = (byStatus[c.status] ?? 0) + 1;
    totalClaimed += c.claimedAmount;
    totalApproved += c.approvedAmount ?? 0;
    if (c.aiRisk) {
      aiAssisted += 1;
      try {
        if (JSON.parse(c.aiRisk).riskLevel === "HIGH") highRisk += 1;
      } catch {
        /* ignore malformed */
      }
    }
    const terminal = c.statusHistory.find((h) =>
      ["APPROVED", "PARTIALLY_APPROVED", "REJECTED", "SETTLED"].includes(h.status),
    );
    if (terminal) {
      const days = (terminal.createdAt.getTime() - c.submittedAt.getTime()) / (1000 * 60 * 60 * 24);
      tatDaysList.push(Math.max(days, 0.1));
    }
    const day = c.submittedAt.toISOString().slice(0, 10);
    volumeByDay[day] = (volumeByDay[day] ?? 0) + 1;
  }

  const approvedCount = (byStatus.APPROVED ?? 0) + (byStatus.PARTIALLY_APPROVED ?? 0) + (byStatus.SETTLED ?? 0);
  const decidedCount = approvedCount + (byStatus.REJECTED ?? 0);
  const avgTat = tatDaysList.length ? tatDaysList.reduce((a, b) => a + b, 0) / tatDaysList.length : null;

  res.json({
    totalClaims: claims.length,
    byStatus,
    totalClaimed,
    totalApproved,
    leakagePrevented: Math.max(totalClaimed - totalApproved, 0),
    approvalRate: decidedCount ? approvedCount / decidedCount : null,
    avgTatDays: avgTat,
    aiAssistedClaims: aiAssisted,
    highRiskFlagged: highRisk,
    volumeByDay: Object.entries(volumeByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count })),
  });
});
