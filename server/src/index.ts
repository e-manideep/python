import express from "express";
import cors from "cors";
import { env, aiEnabled } from "./env.js";
import { authRouter } from "./routes/auth.js";
import { policiesRouter } from "./routes/policies.js";
import { claimsRouter } from "./routes/claims.js";
import { chatRouter } from "./routes/chat.js";
import { analyticsRouter } from "./routes/analytics.js";
import { providersRouter } from "./routes/providers.js";

const app = express();
app.use(cors());
app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true, aiEnabled }));
app.use("/api/auth", authRouter);
app.use("/api/policies", policiesRouter);
app.use("/api/claims", claimsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/analytics", analyticsRouter);
app.use("/api/providers", providersRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Unexpected server error" });
});

app.listen(env.port, () => {
  console.log(`ClaimSetu API listening on http://localhost:${env.port}`);
  console.log(`AI features: ${aiEnabled ? "enabled" : "disabled (add ANTHROPIC_API_KEY to server/.env)"}`);
});
