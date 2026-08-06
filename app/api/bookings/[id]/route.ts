import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { confirmBookingAndBump } from "@/lib/booking-service";
import { fail, ok, parseId, requireNumber, serverError } from "@/lib/api";
import { canPatientAccessBooking, getPatientScope } from "@/lib/patient-dashboard";

type Ctx = { params: Promise<{ id: string }> };

const STATUSES = ["tentative", "confirmed", "cancelled", "completed"] as const;
const PAYMENT_STATUSES = ["unpaid", "paid", "refunded"] as const;

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
 * Body: { status?, payment_status?, amount_paid? }
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

    if (scope.role === "patient") {
      if (body.status && body.status !== "cancelled") {
        return fail("Patients can only cancel their own upcoming bookings", 403);
      }
      if (existing.status === "completed" || existing.status === "cancelled") {
        return fail("This booking can no longer be cancelled", 400);
      }
      const today = new Date();
      const todayDate = new Date(
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}T00:00:00Z`,
      );
      if (existing.date < todayDate) {
        return fail("Past bookings cannot be cancelled", 400);
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
