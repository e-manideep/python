import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { requireAuth, signToken } from "../middleware/auth.js";

export const authRouter = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid email or password" });

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
    include: { member: true, providerOf: true },
  });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });

  const authUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    memberId: user.member?.id,
    providerId: user.providerOf?.id,
  };
  const token = signToken(authUser);
  res.json({ token, user: authUser });
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
