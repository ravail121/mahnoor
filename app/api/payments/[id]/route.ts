import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseId, requireString, serverError } from "@/lib/api";
import { APPOINTMENT_DURATION_MINUTES, toEventStart } from "@/lib/calendar-invite";
import { siteConfig } from "@/lib/site-config";
import { createZoomMeeting, isZoomConfigured } from "@/lib/zoom";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = ["pending", "success", "failed", "refunded"] as const;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

/**
 * PATCH /api/payments/[id]
 * Admin-only — verifies or rejects a claimed bank transfer.
 * Body: { status: 'pending' | 'success' | 'failed' | 'refunded' }
 *
 * When status becomes 'success':
 * - booking.payment_status = 'paid'
 * - booking.amount_paid += payment.amount
 * - booking.status = 'confirmed'
 * - other tentative bookings on same slot → cancelled
 * All in one transaction.
 */
export async function PATCH(request: Request, context: Ctx) {
  try {
    if (!(await requireAdmin())) return fail("Unauthorized", 401);

    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (!id) return fail("Invalid payment id");

    const body = await request.json();
    const status = requireString(body.status, "status");
    if (!status || !STATUSES.includes(status as (typeof STATUSES)[number])) {
      return fail("status must be pending, success, failed, or refunded");
    }

    const payment = await prisma.payments.findUnique({ where: { id } });
    if (!payment) return fail("Payment not found", 404);

    if (status !== "success") {
      const updated = await prisma.payments.update({
        where: { id },
        data: { status: status as (typeof STATUSES)[number] },
      });
      return ok({ payment: updated, bumped: [] });
    }

    // Success path: update payment + confirm booking + bump tentatives
    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payments.update({
        where: { id },
        data: { status: "success" },
      });

      const booking = await tx.bookings.findUnique({
        where: { id: payment.booking_id },
      });
      if (!booking) throw new Error("Booking not found");

      const existingConfirmed = await tx.bookings.findFirst({
        where: {
          doctor_id: booking.doctor_id,
          date: booking.date,
          time_slot: booking.time_slot,
          status: "confirmed",
          NOT: { id: booking.id },
        },
      });
      if (existingConfirmed) throw new Error("slot already booked");

      const newPaid = Number(booking.amount_paid) + Number(payment.amount);

      const updatedBooking = await tx.bookings.update({
        where: { id: booking.id },
        data: {
          status: "confirmed",
          payment_status: "paid",
          amount_paid: newPaid,
        },
        include: { patients: true },
      });

      const toBump = await tx.bookings.findMany({
        where: {
          doctor_id: booking.doctor_id,
          date: booking.date,
          time_slot: booking.time_slot,
          status: "tentative",
          NOT: { id: booking.id },
        },
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

      return {
        payment: updatedPayment,
        booking: updatedBooking,
        bumped,
      };
    });

    // Best-effort: an online booking gets a Zoom meeting once payment is
    // verified. Done outside the transaction (it's an HTTP round-trip to
    // Zoom) and never blocks payment verification if Zoom is unreachable
    // or not configured yet.
    if (
      result.booking.session_type === "online" &&
      !result.booking.zoom_join_url &&
      isZoomConfigured()
    ) {
      try {
        const startTime = toEventStart(
          result.booking.date,
          result.booking.time_slot,
        );
        const meeting = await createZoomMeeting({
          topic: `Appointment: ${result.booking.patients.name} — ${siteConfig.doctorName}`,
          startTime,
          durationMinutes: APPOINTMENT_DURATION_MINUTES,
        });
        result.booking = await prisma.bookings.update({
          where: { id: result.booking.id },
          data: {
            zoom_meeting_id: meeting.id,
            zoom_join_url: meeting.joinUrl,
            zoom_start_url: meeting.startUrl,
          },
          include: { patients: true },
        });
      } catch (zoomErr) {
        console.error("Zoom meeting creation failed:", zoomErr);
      }
    }

    return ok(result);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "slot already booked") return fail(err.message, 400);
      if (err.message === "Booking not found") return fail(err.message, 404);
    }
    return serverError(err);
  }
}
