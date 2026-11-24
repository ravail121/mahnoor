import { prisma } from "@/lib/prisma";
import { fail, ok, parseId, serverError } from "@/lib/api";
import { isSlotSelectable } from "@/lib/booking-window";

const SESSION_TYPES = ["in_person", "online"] as const;

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

/**
 * GET /api/availability/month-summary?doctor_id=&month=YYYY-MM&session_type=
 * Public — which dates in the month have at least one bookable slot for the
 * given session type (used to gray out empty days on the booking calendar,
 * so a patient never lands on a day with nothing to pick).
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = parseId(searchParams.get("doctor_id") ?? "");
    const monthKey = searchParams.get("month") ?? "";
    const sessionTypeRaw = searchParams.get("session_type");

    if (!doctorId) return fail("doctor_id is required");
    const range = parseMonthKey(monthKey);
    if (!range) return fail("month must be YYYY-MM");
    if (!sessionTypeRaw || !SESSION_TYPES.includes(sessionTypeRaw as (typeof SESSION_TYPES)[number])) {
      return fail("session_type must be in_person or online");
    }
    const sessionType = sessionTypeRaw as (typeof SESSION_TYPES)[number];

    const [slots, confirmedBookings] = await Promise.all([
      prisma.availability.findMany({
        where: {
          doctor_id: doctorId,
          date: { gte: range.start, lte: range.end },
          is_active: true,
          ...(sessionType === "online" ? { online_enabled: true } : { in_person_enabled: true }),
        },
        select: { date: true, time_slot: true },
      }),
      prisma.bookings.findMany({
        where: {
          doctor_id: doctorId,
          date: { gte: range.start, lte: range.end },
          status: "confirmed",
        },
        select: { date: true, time_slot: true },
      }),
    ]);

    const takenTimes = new Set(
      confirmedBookings.map((b) => `${b.date.toISOString()}|${b.time_slot.toISOString()}`),
    );

    const availableDates = new Set<string>();
    for (const slot of slots) {
      const key = `${slot.date.toISOString()}|${slot.time_slot.toISOString()}`;
      if (takenTimes.has(key)) continue;
      if (!isSlotSelectable(slot.date, slot.time_slot)) continue;
      availableDates.add(slot.date.toISOString().slice(0, 10));
    }

    return ok(Array.from(availableDates).sort());
  } catch (err) {
    return serverError(err);
  }
}
