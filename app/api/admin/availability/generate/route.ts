import { created, fail, parseDateOnly, requireNumber, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

function slotKey(row: { date: Date; time_slot: Date }) {
  return `${row.date.toISOString()}|${row.time_slot.toISOString()}`;
}

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

    // Which type(s) this publish action is actually about. Each is handled
    // completely independently below — publishing in-person never reads or
    // writes online_enabled, and vice versa. "Both" simply means both of
    // the independent passes run together.
    const publishInPerson = body.in_person_enabled !== false;
    const publishOnline = body.online_enabled !== false;
    if (!publishInPerson && !publishOnline) {
      return fail("Slots must be open to at least one of in-person or online");
    }

    const pattern = await prisma.weekly_schedule.findMany({
      where: { doctor_id: doctorId, is_active: true },
      orderBy: [{ weekday: "asc" }, { time_slot: "asc" }],
    });
    if (pattern.length === 0) {
      return fail("No active weekly schedule found to generate from");
    }

    const slotsToPublish: Array<{ date: Date; time_slot: Date }> = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const weekday = cursor.getUTCDay();
      for (const entry of pattern.filter((e) => e.weekday === weekday)) {
        slotsToPublish.push({ date: new Date(cursor), time_slot: entry.time_slot });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    if (slotsToPublish.length === 0) {
      return created({ count: 0, message: "No slots matched that date range" });
    }
    const patternKeys = new Set(slotsToPublish.map(slotKey));

    // Step 1 — stamp the requested type(s) onto every pattern slot. Setting
    // a flag to true is always safe (it only adds availability), so this
    // never needs to check for confirmed bookings.
    await prisma.$transaction(
      slotsToPublish.map(({ date, time_slot }) =>
        prisma.availability.upsert({
          where: { doctor_id_date_time_slot: { doctor_id: doctorId, date, time_slot } },
          create: {
            doctor_id: doctorId,
            date,
            time_slot,
            is_active: true,
            in_person_enabled: publishInPerson,
            online_enabled: publishOnline,
          },
          update: {
            is_active: true,
            ...(publishInPerson ? { in_person_enabled: true } : {}),
            ...(publishOnline ? { online_enabled: true } : {}),
          },
        }),
      ),
    );

    // Step 2 — the requested type(s) are now authoritative for the whole
    // range: anywhere else already published in this range loses that same
    // type (narrowed, or deleted if nothing would be left open), unless a
    // confirmed booking of that exact type depends on it. The type(s) NOT
    // included in this publish are never read or written here, so an
    // in-person-only publish can't affect a day's online availability at
    // all, and vice versa — the two are fully independent.
    const confirmedBookings = await prisma.bookings.findMany({
      where: { doctor_id: doctorId, date: { gte: startDate, lte: endDate }, status: "confirmed" },
      select: { date: true, time_slot: true, session_type: true },
    });
    const confirmedInPerson = new Set(
      confirmedBookings.filter((b) => b.session_type === "in_person").map(slotKey),
    );
    const confirmedOnline = new Set(
      confirmedBookings.filter((b) => b.session_type === "online").map(slotKey),
    );

    const existingInRange = await prisma.availability.findMany({
      where: { doctor_id: doctorId, date: { gte: startDate, lte: endDate } },
      select: { id: true, date: true, time_slot: true, in_person_enabled: true, online_enabled: true },
    });

    const toDelete: number[] = [];
    const toUpdate: Array<{ id: number; in_person_enabled: boolean; online_enabled: boolean }> = [];
    let protectedCount = 0;

    for (const row of existingInRange) {
      const key = slotKey(row);
      if (patternKeys.has(key)) continue; // handled in step 1

      let nextInPerson = row.in_person_enabled;
      let nextOnline = row.online_enabled;

      if (publishInPerson && row.in_person_enabled) {
        if (confirmedInPerson.has(key)) {
          protectedCount += 1;
        } else {
          nextInPerson = false;
        }
      }
      if (publishOnline && row.online_enabled) {
        if (confirmedOnline.has(key)) {
          protectedCount += 1;
        } else {
          nextOnline = false;
        }
      }

      if (nextInPerson === row.in_person_enabled && nextOnline === row.online_enabled) {
        continue; // nothing changed for this row
      }
      if (!nextInPerson && !nextOnline) {
        toDelete.push(row.id);
      } else {
        toUpdate.push({ id: row.id, in_person_enabled: nextInPerson, online_enabled: nextOnline });
      }
    }

    if (toDelete.length > 0) {
      await prisma.availability.deleteMany({ where: { id: { in: toDelete } } });
    }
    if (toUpdate.length > 0) {
      await prisma.$transaction(
        toUpdate.map((u) =>
          prisma.availability.update({
            where: { id: u.id },
            data: { in_person_enabled: u.in_person_enabled, online_enabled: u.online_enabled },
          }),
        ),
      );
    }

    return created({
      count: slotsToPublish.length,
      removed_stale_slots: toDelete.length,
      narrowed_slots: toUpdate.length,
      protected_booked_slots: protectedCount,
      generated_from_pattern: pattern.length,
    });
  } catch (err) {
    return serverError(err);
  }
}
