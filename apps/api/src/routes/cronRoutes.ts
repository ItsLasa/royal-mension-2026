import { Router } from "express";
import { requireCronSecret } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { expireHolds } from "../services/availabilityService";

export const cronRoutes = Router();
cronRoutes.post("/cron/expire-holds", requireCronSecret, async (_req, res, next) => { try { const result = await expireHolds(prisma); res.json(ok({ expired: result.count })); } catch (e) { next(e); } });
