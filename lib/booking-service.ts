import { prisma } from "@/lib/prisma";
import type { bookings } from "@/lib/generated/prisma/client";

/**
 * Confirm a booking and cancel any other tentative bookings on the same slot.
 * Used by PATCH /api/bookings/[id] and payment success flow.
 */
export async function confirmBookingAndBump(
  bookingId: number,
  extra?: {
    payment_status?: "paid" | "unpaid" | "refunded";
    amount_paid?: number;
  },
): Promise<{ booking: bookings; bumped: bookings[] }> {
  return prisma.$transaction(async (tx) => {
    const booking = await tx.bookings.findUnique({ where: { id: bookingId } });
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Guard: slot must not already have a different confirmed booking
    const existingConfirmed = await tx.bookings.findFirst({
      where: {
        doctor_id: booking.doctor_id,
        date: booking.date,
        time_slot: booking.time_slot,
        status: "confirmed",
        NOT: { id: bookingId },
      },
    });
    if (existingConfirmed) {
      throw new Error("slot already booked");
    }

    const updated = await tx.bookings.update({
      where: { id: bookingId },
      data: {
        status: "confirmed",
        ...(extra?.payment_status
          ? { payment_status: extra.payment_status }
          : {}),
        ...(extra?.amount_paid !== undefined
          ? { amount_paid: extra.amount_paid }
          : {}),
      },
    });

    const toBump = await tx.bookings.findMany({
      where: {
        doctor_id: booking.doctor_id,
        date: booking.date,
        time_slot: booking.time_slot,
        status: "tentative",
        NOT: { id: bookingId },
      },
    });

    if (toBump.length > 0) {
      await tx.bookings.updateMany({
        where: {
          id: { in: toBump.map((b) => b.id) },
        },
        data: { status: "cancelled" },
      });
    }

    const bumped = await tx.bookings.findMany({
      where: { id: { in: toBump.map((b) => b.id) } },
      include: { patients: true },
    });

    return { booking: updated, bumped };
  });
}
