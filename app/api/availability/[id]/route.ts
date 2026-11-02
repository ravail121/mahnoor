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

const REMOVE_SCOPES = ["in_person", "online", "both"] as const;

/**
 * DELETE /api/availability/[id]
 * Optional body: { remove?: "in_person" | "online" | "both" } — default "both".
 * Narrows the slot's offering rather than deleting it outright, unless the
 * removal empties out both types (or "both" was requested), in which case
 * the row is deleted — same as before this scope feature existed.
 */
export async function DELETE(request: Request, context: Ctx) {
  try {
    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (!id) return fail("Invalid availability id");

    let remove: (typeof REMOVE_SCOPES)[number] = "both";
    const rawBody = await request.text();
    if (rawBody) {
      const body = JSON.parse(rawBody);
      if (body.remove != null) {
        if (!REMOVE_SCOPES.includes(body.remove)) {
          return fail("remove must be in_person, online, or both");
        }
        remove = body.remove;
      }
    }

    const existing = await prisma.availability.findUnique({ where: { id } });
    if (!existing) return fail("Availability slot not found", 404);

    const removeInPerson = remove === "in_person" || remove === "both";
    const removeOnline = remove === "online" || remove === "both";
    const remainingInPerson = removeInPerson ? false : existing.in_person_enabled;
    const remainingOnline = removeOnline ? false : existing.online_enabled;

    const confirmedBooking = await prisma.bookings.findFirst({
      where: {
        doctor_id: existing.doctor_id,
        date: existing.date,
        time_slot: existing.time_slot,
        status: "confirmed",
      },
      select: { session_type: true },
    });
    if (confirmedBooking) {
      const stillCovered =
        confirmedBooking.session_type === "online"
          ? remainingOnline
          : remainingInPerson;
      if (!stillCovered) {
        return fail("Booked slots cannot be removed for the type that's booked", 400);
      }
    }

    if (!remainingInPerson && !remainingOnline) {
      await prisma.availability.delete({ where: { id } });
      return ok({ id, deleted: true });
    }

    const updated = await prisma.availability.update({
      where: { id },
      data: {
        in_person_enabled: remainingInPerson,
        online_enabled: remainingOnline,
      },
    });
    return ok({ ...updated, deleted: false });
  } catch (err) {
    return serverError(err);
  }
}
