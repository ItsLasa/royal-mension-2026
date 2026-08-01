import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { env } from "./config/env";
import { publicRoutes } from "./routes/publicRoutes";
import { adminRoutes } from "./routes/adminRoutes";
import { adminAuthRoutes } from "./routes/adminAuthRoutes";
import { paymentRoutes } from "./routes/paymentRoutes";
import { calendarRoutes } from "./routes/calendarRoutes";
import { cronRoutes } from "./routes/cronRoutes";
import { errorHandler } from "./middleware/validation";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
  app.use(rateLimit({ windowMs: 60_000, limit: 120 }));
  app.use(cookieParser(env.SESSION_SECRET));
  app.use(pinoHttp({ redact: ["req.headers.authorization", "req.body.md5sig", "req.body.hash"] }));
  app.use(express.json({ limit: "256kb" }));
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/v1", publicRoutes, paymentRoutes, adminAuthRoutes, adminRoutes, cronRoutes);
  app.use("/api/v1", calendarRoutes);
  app.use(errorHandler);
  return app;
}
