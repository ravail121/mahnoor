import { fail, ok, parseId, serverError } from "@/lib/api";
import { prisma } from "@/lib/prisma";

function parseMonthKey(month: string) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;

  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (monthIndex < 0 || monthIndex > 11) return null;

  const start = new Date(Date.UTC(year, monthIndex, 1));
  const end = new Date(Date.UTC(year, monthIndex + 1, 0));
  return { start, end };
}

function dateKeyFromUtc(date: Date) {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = parseId(searchParams.get("doctor_id") ?? "");
    const monthKey = searchParams.get("month") ?? "";

    if (!doctorId) return fail("doctor_id is required");
    const range = parseMonthKey(monthKey);
    if (!range) return fail("month must be YYYY-MM");

    const [availabilityRows, confirmedBookings, weeklyRows] = await Promise.all([
      prisma.availability.findMany({
        where: {
          doctor_id: doctorId,
          date: { gte: range.start, lte: range.end },
        },
        orderBy: [{ date: "asc" }, { time_slot: "asc" }],
      }),
      prisma.bookings.findMany({
        where: {
          doctor_id: doctorId,
          date: { gte: range.start, lte: range.end },
          status: "confirmed",
        },
        select: {
          date: true,
          time_slot: true,
        },
      }),
      prisma.weekly_schedule.findMany({
        where: {
          doctor_id: doctorId,
          is_active: true,
        },
        select: { weekday: true },
      }),
    ]);

    const workingWeekdays = new Set(weeklyRows.map((row) => row.weekday));
    const hasWeeklyPattern = workingWeekdays.size > 0;

    const summaries = new Map<
      string,
      {
        date: string;
        openSlots: number;
        confirmedBookings: number;
        isBlocked: boolean;
        isWeeklyOff: boolean;
        totalSlots: number;
        activeSlots: number;
      }
    >();

    const bookedTimeKeys = new Set(
      confirmedBookings.map(
        (booking) =>
          `${dateKeyFromUtc(booking.date)}|${booking.time_slot.toISOString()}`,
      ),
    );

    // Seed every day in the month so weekly Off days appear even with no slots.
    const cursor = new Date(range.start);
    while (cursor <= range.end) {
      const dateKey = dateKeyFromUtc(cursor);
      const weekday = cursor.getUTCDay();
      const isWeeklyOff = hasWeeklyPattern && !workingWeekdays.has(weekday);

      summaries.set(dateKey, {
        date: dateKey,
        openSlots: 0,
        confirmedBookings: 0,
        isBlocked: isWeeklyOff,
        isWeeklyOff,
        totalSlots: 0,
        activeSlots: 0,
      });

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    for (const slot of availabilityRows) {
      const dateKey = dateKeyFromUtc(slot.date);
      const summary = summaries.get(dateKey);
      if (!summary) continue;

      summary.totalSlots += 1;
      if (slot.is_active) {
        summary.activeSlots += 1;
        const bookedKey = `${dateKey}|${slot.time_slot.toISOString()}`;
        if (!bookedTimeKeys.has(bookedKey)) {
          summary.openSlots += 1;
        }
      }
    }

    for (const booking of confirmedBookings) {
      const dateKey = dateKeyFromUtc(booking.date);
      const summary = summaries.get(dateKey);
      if (!summary) continue;
      summary.confirmedBookings += 1;
    }

    const result = Array.from(summaries.values())
      .map((summary) => {
        // Weekly Off stays blocked until opened (active slots exist).
        // Working days are blocked only when all existing slots are inactive.
        const isBlocked =
          summary.activeSlots === 0 &&
          (summary.isWeeklyOff || summary.totalSlots > 0);

        return {
          date: summary.date,
          openSlots: summary.openSlots,
          confirmedBookings: summary.confirmedBookings,
          isBlocked,
          isWeeklyOff: summary.isWeeklyOff,
        };
      })
      .sort((left, right) => left.date.localeCompare(right.date));

    return ok(result);
  } catch (err) {
    return serverError(err);
  }
}
