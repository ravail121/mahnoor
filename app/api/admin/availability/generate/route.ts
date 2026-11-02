import { created, fail, parseDateOnly, requireNumber, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const doctorId = requireNumber(body.doctor_id, "doctor_id");
    const startDate = parseDateOnly(body.start_date);
    const endDate = parseDateOnly(body.end_date);

    if (!doctorId || !startDate || !endDate) {
      return fail("doctor_id, start_date, and end_date are required");
    }
    if (endDate < startDate) {
      return fail("end_date must be on or after start_date");
    }

    const inPersonEnabled = body.in_person_enabled !== false;
    const onlineEnabled = body.online_enabled !== false;
    if (!inPersonEnabled && !onlineEnabled) {
      return fail("Slots must be open to at least one of in-person or online");
    }

    const pattern = await prisma.weekly_schedule.findMany({
      where: { doctor_id: doctorId, is_active: true },
      orderBy: [{ weekday: "asc" }, { time_slot: "asc" }],
    });

    if (pattern.length === 0) {
      return fail("No active weekly schedule found to generate from");
    }

    const confirmedBookings = await prisma.bookings.findMany({
      where: {
        doctor_id: doctorId,
        date: { gte: startDate, lte: endDate },
        status: "confirmed",
      },
      select: { date: true, time_slot: true },
    });
    const protectedSlots = new Set(
      confirmedBookings.map(
        (b) => `${b.date.toISOString()}|${b.time_slot.toISOString()}`,
      ),
    );

    const slotsToPublish: Array<{ date: Date; time_slot: Date }> = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const weekday = cursor.getUTCDay();
      const matching = pattern.filter((entry) => entry.weekday === weekday);
      for (const entry of matching) {
        slotsToPublish.push({ date: new Date(cursor), time_slot: entry.time_slot });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (slotsToPublish.length === 0) {
      return created({ count: 0, message: "No slots matched that date range" });
    }

    // Republishing overrides whatever was there before (scope, and
    // reactivates anything blocked) — except slots with a confirmed booking,
    // which are left untouched so this can never disrupt an existing
    // appointment.
    const publishable = slotsToPublish.filter(
      ({ date, time_slot }) =>
        !protectedSlots.has(`${date.toISOString()}|${time_slot.toISOString()}`),
    );
    const protectedCount = slotsToPublish.length - publishable.length;

    if (publishable.length > 0) {
      await prisma.$transaction(
        publishable.map(({ date, time_slot }) =>
          prisma.availability.upsert({
            where: { doctor_id_date_time_slot: { doctor_id: doctorId, date, time_slot } },
            create: {
              doctor_id: doctorId,
              date,
              time_slot,
              is_active: true,
              in_person_enabled: inPersonEnabled,
              online_enabled: onlineEnabled,
            },
            update: {
              is_active: true,
              in_person_enabled: inPersonEnabled,
              online_enabled: onlineEnabled,
            },
          }),
        ),
      );
    }

    return created({
      count: publishable.length,
      protected_booked_slots: protectedCount,
      generated_from_pattern: pattern.length,
      days_covered: slotsToPublish.length,
    });
  } catch (err) {
    return serverError(err);
  }
}
