import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { asyncHandler } from "../lib/asyncHandler";
import { requireAdmin } from "../middleware/auth";
import { createAvailabilityBlock, getAdminCalendarSummary, getBookingStatusReport, getDashboardSummary, listAdminBookings, listAdminPackages, listAdminPayments } from "../services/adminService";

export const adminRoutes = Router();
adminRoutes.use(requireAdmin);

adminRoutes.get("/admin/dashboard", asyncHandler(async (_req, res) => {
  res.json(ok(await getDashboardSummary(prisma)));
}));

adminRoutes.get("/admin/bookings", asyncHandler(async (_req, res) => {
  res.json(ok(await listAdminBookings(prisma)));
}));

adminRoutes.get("/admin/packages", asyncHandler(async (_req, res) => {
  res.json(ok(await listAdminPackages(prisma)));
}));

adminRoutes.get("/admin/calendar", asyncHandler(async (_req, res) => {
  res.json(ok(await getAdminCalendarSummary(prisma)));
}));

adminRoutes.post("/admin/availability-blocks", asyncHandler(async (req, res) => {
  const block = await createAvailabilityBlock(prisma, req.body);
  res.status(201).json(ok(block));
}));

adminRoutes.get("/admin/payments", asyncHandler(async (_req, res) => {
  res.json(ok(await listAdminPayments(prisma)));
}));

adminRoutes.get("/admin/reports", asyncHandler(async (_req, res) => {
  res.json(ok(await getBookingStatusReport(prisma)));
}));
