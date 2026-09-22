import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { confirmBookingAndBump } from "@/lib/booking-service";
import {
  fail,
  ok,
  parseDateOnly,
  parseId,
  parseTimeSlot,
  requireNumber,
  requireString,
  serverError,
} from "@/lib/api";
import { isBookingEditable, isSlotSelectable } from "@/lib/booking-window";
import { canPatientAccessBooking, getPatientScope } from "@/lib/patient-dashboard";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = ["tentative", "confirmed", "cancelled", "completed"] as const;
const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;
const SESSION_TYPES = ["in_person", "online"] as const;

const LOCKED_MESSAGE =
  "This appointment can no longer be changed. Changes close 3 hours before the visit.";

/**
 * GET /api/bookings/[id]
 */
export async function GET(_request: Request, context: Ctx) {
  try {
    const session = await auth();
    if (!session?.user) return fail("Unauthorized", 401);

    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (!id) return fail("Invalid booking id");

    const scope = await getPatientScope();
    if (!scope) return fail("Unauthorized", 401);
    if (!(await canPatientAccessBooking(id, scope))) {
      return fail("Booking not found", 404);
    }

    const booking = await prisma.bookings.findUnique({
      where: { id },
      include: { patients: true, payments: true, doctors: true },
    });
    if (!booking) return fail("Booking not found", 404);

    return ok(booking);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * PATCH /api/bookings/[id]
 * Body: { status?, payment_status?, amount_paid?, date?, time_slot?, session_type?, notes? }
 */
export async function PATCH(request: Request, context: Ctx) {
  try {
    const session = await auth();
    if (!session?.user) return fail("Unauthorized", 401);

    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (!id) return fail("Invalid booking id");

    const scope = await getPatientScope();
    if (!scope) return fail("Unauthorized", 401);
    if (!(await canPatientAccessBooking(id, scope))) {
      return fail("Booking not found", 404);
    }

    const body = await request.json();
    const existing = await prisma.bookings.findUnique({ where: { id } });
    if (!existing) return fail("Booking not found", 404);

    const wantsDetailsUpdate =
      body.date != null ||
      body.time_slot != null ||
      body.session_type != null ||
      body.notes !== undefined;
    const wantsCancel = body.status === "cancelled";

    if (scope.role === "patient") {
      if (body.payment_status != null || body.amount_paid != null) {
        return fail("Patients cannot change payment details", 403);
      }
      if (body.status && body.status !== "cancelled") {
        return fail("Patients can only cancel or update their own bookings", 403);
      }
      if (existing.status === "completed" || existing.status === "cancelled") {
        return fail("This booking can no longer be changed", 400);
      }
      if (!isBookingEditable(existing)) {
        return fail(LOCKED_MESSAGE, 400);
      }
    }

    if (body.status != null) {
      if (!STATUSES.includes(body.status)) {
        return fail(
          "status must be tentative, confirmed, cancelled, or completed",
        );
      }
    }
    if (body.payment_status != null) {
      if (!PAYMENT_STATUSES.includes(body.payment_status)) {
        return fail("payment_status must be unpaid, paid, or refunded");
      }
    }

    let amountPaid: number | undefined;
    if (body.amount_paid != null) {
      const n = requireNumber(body.amount_paid, "amount_paid");
      if (n === null || n < 0) return fail("amount_paid must be a non-negative number");
      amountPaid = n;
    }

    let nextDate = existing.date;
    let nextTime = existing.time_slot;
    let nextSession = existing.session_type;
    let nextNotes = existing.notes;

    if (wantsDetailsUpdate && !wantsCancel) {
      if (body.date != null) {
        const parsed = parseDateOnly(body.date);
        if (!parsed) return fail("date must be YYYY-MM-DD");
        nextDate = parsed;
      }
      if (body.time_slot != null) {
        const parsed = parseTimeSlot(body.time_slot);
        if (!parsed) return fail("Invalid time_slot (use HH:MM or H:MM AM/PM)");
        nextTime = parsed;
      }
      if (body.session_type != null) {
        const sessionType = requireString(body.session_type, "session_type");
        if (
          !sessionType ||
          !SESSION_TYPES.includes(sessionType as (typeof SESSION_TYPES)[number])
        ) {
          return fail("session_type must be in_person or online");
        }
        nextSession = sessionType as (typeof SESSION_TYPES)[number];
      }
      if (body.notes !== undefined) {
        if (body.notes == null || body.notes === "") {
          nextNotes = null;
        } else {
          const notes = requireString(body.notes, "notes");
          if (!notes) return fail("Invalid notes");
          nextNotes = notes;
        }
      }

      if (scope.role === "patient" && !isSlotSelectable(nextDate, nextTime)) {
        return fail("Please choose a time at least 3 hours from now.", 400);
      }

      const slotChanged =
        nextDate.getTime() !== existing.date.getTime() ||
        nextTime.getTime() !== existing.time_slot.getTime();

      if (slotChanged) {
        const openSlot = await prisma.availability.findFirst({
          where: {
            doctor_id: existing.doctor_id,
            date: nextDate,
            time_slot: nextTime,
            is_active: true,
          },
          select: { id: true },
        });
        if (!openSlot) {
          return fail("That time is not available", 400);
        }

        const confirmed = await prisma.bookings.findFirst({
          where: {
            doctor_id: existing.doctor_id,
            date: nextDate,
            time_slot: nextTime,
            status: "confirmed",
            NOT: { id },
          },
          select: { id: true },
        });
        if (confirmed) {
          return fail("slot already booked", 400);
        }
      }
    }

    // Confirming triggers bump logic
    if (body.status === "confirmed") {
      try {
        const result = await confirmBookingAndBump(id, {
          payment_status: body.payment_status,
          amount_paid: amountPaid,
        });
        return ok({
          booking: result.booking,
          bumped: result.bumped,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to confirm";
        if (msg === "slot already booked") return fail(msg, 400);
        if (msg === "Booking not found") return fail(msg, 404);
        throw err;
      }
    }

    const updated = await prisma.bookings.update({
      where: { id },
      data: {
        ...(body.status ? { status: body.status } : {}),
        ...(body.payment_status
          ? { payment_status: body.payment_status }
          : {}),
        ...(amountPaid !== undefined ? { amount_paid: amountPaid } : {}),
        ...(wantsDetailsUpdate && !wantsCancel
          ? {
              date: nextDate,
              time_slot: nextTime,
              session_type: nextSession,
              notes: nextNotes,
            }
          : {}),
      },
      include: { patients: true },
    });

    return ok({ booking: updated, bumped: [] });
  } catch (err) {
    return serverError(err);
  }
}

/**
 * DELETE /api/bookings/[id]
 * Soft-cancel (status = cancelled)
 */
export async function DELETE(_request: Request, context: Ctx) {
  try {
    const session = await auth();
    if (!session?.user) return fail("Unauthorized", 401);

    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (!id) return fail("Invalid booking id");

    const scope = await getPatientScope();
    if (!scope) return fail("Unauthorized", 401);
    if (!(await canPatientAccessBooking(id, scope))) {
      return fail("Booking not found", 404);
    }

    const existing = await prisma.bookings.findUnique({ where: { id } });
    if (!existing) return fail("Booking not found", 404);

    if (scope.role === "patient") {
      if (existing.status === "completed" || existing.status === "cancelled") {
        return fail("This booking can no longer be changed", 400);
      }
      if (!isBookingEditable(existing)) {
        return fail(LOCKED_MESSAGE, 400);
      }
    }

    const updated = await prisma.bookings.update({
      where: { id },
      data: { status: "cancelled" },
      include: { patients: true },
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}
