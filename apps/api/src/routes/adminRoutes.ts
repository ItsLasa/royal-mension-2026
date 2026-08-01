import { Router } from "express";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { requireAdmin } from "../middleware/auth";

export const adminRoutes = Router();
adminRoutes.use(requireAdmin);
adminRoutes.get("/admin/dashboard", async (_req, res, next) => { try { const [bookings, revenue, arrivals] = await Promise.all([prisma.booking.count(), prisma.booking.aggregate({ _sum: { grandTotal: true, amountPaid: true } }), prisma.booking.findMany({ take: 8, orderBy: { checkInDate: "asc" }, include: { guest: true, package: true } })]); res.json(ok({ bookings, revenue: revenue._sum, arrivals })); } catch (e) { next(e); } });
adminRoutes.get("/admin/bookings", async (_req, res, next) => { try { res.json(ok(await prisma.booking.findMany({ take: 50, orderBy: { createdAt: "desc" }, include: { guest: true, package: true, payments: true } }))); } catch (e) { next(e); } });
adminRoutes.get("/admin/packages", async (_req, res, next) => { try { res.json(ok(await prisma.package.findMany({ include: { unit: true, images: true } }))); } catch (e) { next(e); } });
adminRoutes.get("/admin/calendar", async (_req, res, next) => { try { const [bookings, blocks] = await Promise.all([prisma.booking.findMany({ where: { bookingStatus: { in: ["HOLD", "PENDING_PAYMENT", "CONFIRMED"] } }, include: { package: true } }), prisma.availabilityBlock.findMany()]); res.json(ok({ bookings, blocks })); } catch (e) { next(e); } });
adminRoutes.post("/admin/availability-blocks", async (req, res, next) => { try { res.status(201).json(ok(await prisma.availabilityBlock.create({ data: req.body }))); } catch (e) { next(e); } });
adminRoutes.get("/admin/payments", async (_req, res, next) => { try { res.json(ok(await prisma.payment.findMany({ take: 50, orderBy: { createdAt: "desc" }, include: { booking: true, events: true } }))); } catch (e) { next(e); } });
adminRoutes.get("/admin/reports", async (_req, res, next) => { try { const byStatus = await prisma.booking.groupBy({ by: ["bookingStatus"], _count: true, _sum: { grandTotal: true } }); res.json(ok({ byStatus })); } catch (e) { next(e); } });
