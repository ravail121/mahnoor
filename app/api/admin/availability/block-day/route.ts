import { fail, ok, parseDateOnly, requireNumber, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

const SCOPES = ["in_person", "online", "both"] as const;

/**
 * POST /api/admin/availability/block-day
 * Body: { doctor_id, date, action?: "block" | "unblock", scope?: "in_person" | "online" | "both" }
 *
 * block (scope "both")        — deactivate all free slots for the day (confirmed bookings stay protected)
 * block (scope one type)      — turn that type off on free slots for the day, leaving the other type open
 * unblock                     — fully reopen the day: reactivate slots and restore both types; if the
 *                                day has none (e.g. weekly Off), create slots from the working-day pattern
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const doctorId = requireNumber(body.doctor_id, "doctor_id");
    const date = parseDateOnly(body.date);
    const action = body.action === "unblock" ? "unblock" : "block";
    const scope: (typeof SCOPES)[number] = SCOPES.includes(body.scope)
      ? (body.scope as (typeof SCOPES)[number])
      : "both";

    if (!doctorId || !date) {
      return fail("doctor_id and date are required");
    }

    if (action === "unblock") {
      const reactivated = await prisma.availability.updateMany({
        where: {
          doctor_id: doctorId,
          date,
        },
        data: { is_active: true, in_person_enabled: true, online_enabled: true },
      });

      const activeCount = await prisma.availability.count({
        where: {
          doctor_id: doctorId,
          date,
          is_active: true,
        },
      });

      let created = 0;
      if (activeCount === 0) {
        const pattern = await prisma.weekly_schedule.findMany({
          where: {
            doctor_id: doctorId,
            is_active: true,
          },
          orderBy: { time_slot: "asc" },
        });

        const uniqueTimes = [
          ...new Map(
            pattern.map((entry) => [entry.time_slot.toISOString(), entry.time_slot]),
          ).values(),
        ];

        if (uniqueTimes.length === 0) {
          return fail(
            "No weekly hours to open this day from. Set at least one working day first.",
          );
        }

        const seeded = await prisma.availability.createMany({
          data: uniqueTimes.map((time_slot) => ({
            doctor_id: doctorId,
            date,
            time_slot,
            is_active: true,
          })),
          skipDuplicates: true,
        });
        created = seeded.count;
      }

      return ok({
        action: "unblock",
        unblocked: reactivated.count + created,
        created,
      });
    }

    const confirmedBookings = await prisma.bookings.findMany({
      where: {
        doctor_id: doctorId,
        date,
        status: "confirmed",
        // Scoping to one type only needs to protect bookings of that type —
        // an online booking doesn't block narrowing the in-person offering.
        ...(scope === "both" ? {} : { session_type: scope }),
      },
      select: { time_slot: true },
    });

    const protectedTimes = confirmedBookings.map((booking) => booking.time_slot);
    const whereClause = {
      doctor_id: doctorId,
      date,
      is_active: true,
      ...(protectedTimes.length > 0
        ? {
            NOT: {
              time_slot: { in: protectedTimes },
            },
          }
        : {}),
    };

    const updated = await prisma.availability.updateMany({
      where: whereClause,
      data:
        scope === "both"
          ? { is_active: false }
          : scope === "online"
            ? { online_enabled: false }
            : { in_person_enabled: false },
    });

    return ok({
      action: "block",
      scope,
      blocked: updated.count,
      protected_booked_slots: protectedTimes.length,
    });
  } catch (err) {
    return serverError(err);
  }
}
