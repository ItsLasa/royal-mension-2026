import type { PrismaClient } from "@prisma/client";

export async function getDashboardSummary(prisma: PrismaClient) {
  const [bookings, revenue, arrivals] = await Promise.all([
    prisma.booking.count(),
    prisma.booking.aggregate({ _sum: { grandTotal: true, amountPaid: true } }),
    prisma.booking.findMany({ take: 8, orderBy: { checkInDate: "asc" }, include: { guest: true, package: true } }),
  ]);
  return { bookings, revenue: revenue._sum, arrivals };
}

export async function listAdminBookings(prisma: PrismaClient) {
  return prisma.booking.findMany({ take: 50, orderBy: { createdAt: "desc" }, include: { guest: true, package: true, payments: true } });
}

export async function listAdminPackages(prisma: PrismaClient) {
  return prisma.package.findMany({ include: { unit: true, images: true } });
}

export async function getAdminCalendarSummary(prisma: PrismaClient) {
  const [bookings, blocks] = await Promise.all([
    prisma.booking.findMany({ where: { bookingStatus: { in: ["HOLD", "PENDING_PAYMENT", "CONFIRMED"] } }, include: { package: true } }),
    prisma.availabilityBlock.findMany(),
  ]);
  return { bookings, blocks };
}

export type AvailabilityBlockInput = {
  unitId: string;
  startDate: string;
  endDate: string;
  reason: string;
  notes?: string;
};

export function createAvailabilityBlock(prisma: PrismaClient, input: AvailabilityBlockInput) {
  return prisma.availabilityBlock.create({ data: input });
}

export async function listAdminPayments(prisma: PrismaClient) {
  return prisma.payment.findMany({ take: 50, orderBy: { createdAt: "desc" }, include: { booking: true, events: true } });
}

export async function getBookingStatusReport(prisma: PrismaClient) {
  const byStatus = await prisma.booking.groupBy({ by: ["bookingStatus"], _count: true, _sum: { grandTotal: true } });
  return { byStatus };
}
