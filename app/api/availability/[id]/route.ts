import { prisma } from "@/lib/prisma";
import { fail, ok, parseId, serverError } from "@/lib/api";

type Ctx = { params: Promise<{ id: string }> };

/**
 * PATCH /api/availability/[id]
 * Body: { is_active: boolean }
 */
export async function PATCH(request: Request, context: Ctx) {
  try {
    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (!id) return fail("Invalid availability id");

    const body = await request.json();
    if (typeof body.is_active !== "boolean") {
      return fail("is_active (boolean) is required");
    }

    const existing = await prisma.availability.findUnique({ where: { id } });
    if (!existing) return fail("Availability slot not found", 404);

    if (body.is_active === false) {
      const confirmedBooking = await prisma.bookings.findFirst({
        where: {
          doctor_id: existing.doctor_id,
          date: existing.date,
          time_slot: existing.time_slot,
          status: "confirmed",
        },
      });
      if (confirmedBooking) {
        return fail("Booked slots cannot be deactivated", 400);
      }
    }

    const updated = await prisma.availability.update({
      where: { id },
      data: { is_active: body.is_active },
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * DELETE /api/availability/[id]
 */
export async function DELETE(_request: Request, context: Ctx) {
  try {
    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (!id) return fail("Invalid availability id");

    const existing = await prisma.availability.findUnique({ where: { id } });
    if (!existing) return fail("Availability slot not found", 404);

    const confirmedBooking = await prisma.bookings.findFirst({
      where: {
        doctor_id: existing.doctor_id,
        date: existing.date,
        time_slot: existing.time_slot,
        status: "confirmed",
      },
    });
    if (confirmedBooking) {
      return fail("Booked slots cannot be deleted", 400);
    }

    await prisma.availability.delete({ where: { id } });
    return ok({ id, deleted: true });
  } catch (err) {
    return serverError(err);
  }
}
