import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/auth.js";

export const providersRouter = Router();
providersRouter.use(requireAuth);

providersRouter.get("/", async (_req, res) => {
  const providers = await prisma.provider.findMany({ orderBy: { name: "asc" } });
  res.json({
    providers: providers.map((p) => ({ ...p, specialties: JSON.parse(p.specialties) })),
  });
});
