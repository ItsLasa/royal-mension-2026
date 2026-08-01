import { Router, urlencoded } from "express";
import { prisma } from "../lib/prisma";
import { ok } from "../lib/apiResponse";
import { PayHerePaymentProvider, processPayHereNotification } from "../payment-providers/payhere";

export const paymentRoutes = Router();
const provider = new PayHerePaymentProvider();

paymentRoutes.post("/payments/payhere/create", async (req, res, next) => { try { const booking = await prisma.booking.findUniqueOrThrow({ where: { reference: req.body.reference }, include: { guest: true, payments: true } }); const payment = booking.payments[0]; const checkout = await provider.createCheckout({ bookingReference: booking.reference, paymentId: payment.id, amount: Number(payment.amount), currency: payment.currency, guest: booking.guest }); await prisma.payment.update({ where: { id: payment.id }, data: { providerOrderId: booking.reference } }); res.json(ok(checkout)); } catch (e) { next(e); } });
paymentRoutes.post("/payments/payhere/notify", urlencoded({ extended: false }), async (req, res, next) => { try { const result = await processPayHereNotification(prisma, provider, req.body); res.json(ok({ processed: true, duplicate: result.duplicate })); } catch (e) { next(e); } });
paymentRoutes.post("/payments/bank-transfer", async (req, res, next) => { try { const booking = await prisma.booking.update({ where: { reference: req.body.reference }, data: { bookingStatus: "PENDING_PAYMENT", paymentStatus: "UNPAID", internalNotes: req.body.bankReference ? `Bank reference submitted: ${req.body.bankReference}` : undefined } }); await prisma.auditLog.create({ data: { action: "BANK_TRANSFER_REFERENCE_SUBMITTED", entityType: "Booking", entityId: booking.reference, newValues: { bankReference: req.body.bankReference ?? null } } }); res.json(ok({ reference: booking.reference, status: booking.bookingStatus })); } catch (e) { next(e); } });
