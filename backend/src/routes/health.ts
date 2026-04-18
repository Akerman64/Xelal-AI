import { Router } from "express";
import { env } from "../config/env";
import { isPrismaEnabled } from "../lib/prisma";

export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({
    status: "ok",
    service: env.appName,
    environment: env.nodeEnv,
    persistence: {
      mode: isPrismaEnabled() ? "prisma" : "memory",
      databaseConfigured: Boolean(env.databaseUrl),
    },
    timestamp: new Date().toISOString(),
  });
});
