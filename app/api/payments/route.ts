import { prisma } from "@/lib/prisma";
import {
  created,
  fail,
  requireNumber,
  requireString,
  serverError,
} from "@/lib/api";

const METHODS = ["card", "jazzcash", "easypaisa", "bank"] as const;
const STATUSES = ["pending", "success", "failed", "refunded"] as const;

/**
 * POST /api/payments
 * Body: { booking_id, amount, method, gateway_ref?, status? }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bookingId = requireNumber(body.booking_id, "booking_id");
    const amount = requireNumber(body.amount, "amount");
    const method = requireString(body.method, "method");
    const statusRaw = body.status == null ? "pending" : body.status;
    const status = requireString(statusRaw, "status");
    const gatewayRef =
      body.gateway_ref == null || body.gateway_ref === ""
        ? null
        : String(body.gateway_ref);

    if (!bookingId || amount === null || !method || !status) {
      return fail("Required: booking_id, amount, method");
    }
    if (amount < 0) return fail("amount must be non-negative");
    if (!METHODS.includes(method as (typeof METHODS)[number])) {
      return fail("method must be card, jazzcash, easypaisa, or bank");
    }
    if (!STATUSES.includes(status as (typeof STATUSES)[number])) {
      return fail("status must be pending, success, failed, or refunded");
    }

    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
    });
    if (!booking) return fail("Booking not found", 404);

    // If creating already as success, use the same confirm+bump path via transaction
    if (status === "success") {
      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payments.create({
          data: {
            booking_id: bookingId,
            amount,
            method: method as (typeof METHODS)[number],
            gateway_ref: gatewayRef,
            status: "success",
          },
        });

        const currentPaid = Number(booking.amount_paid);
        const newPaid = currentPaid + amount;

        // Confirm + bump inside same transaction
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

        const updatedBooking = await tx.bookings.update({
          where: { id: bookingId },
          data: {
            status: "confirmed",
            payment_status: "paid",
            amount_paid: newPaid,
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
          include: { patients: true },
        });

        if (toBump.length > 0) {
          await tx.bookings.updateMany({
            where: { id: { in: toBump.map((b) => b.id) } },
            data: { status: "cancelled" },
          });
        }

        const bumped = await tx.bookings.findMany({
          where: { id: { in: toBump.map((b) => b.id) } },
          include: { patients: true },
        });

        return { payment, booking: updatedBooking, bumped };
      });

      return created(result);
    }

    const payment = await prisma.payments.create({
      data: {
        booking_id: bookingId,
        amount,
        method: method as (typeof METHODS)[number],
        gateway_ref: gatewayRef,
        status: status as (typeof STATUSES)[number],
      },
    });

    return created({ payment, booking, bumped: [] });
  } catch (err) {
    if (err instanceof Error && err.message === "slot already booked") {
      return fail(err.message, 400);
    }
    return serverError(err);
  }
}
