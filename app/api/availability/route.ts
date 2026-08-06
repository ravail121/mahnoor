import { prisma } from "@/lib/prisma";
import {
  created,
  fail,
  ok,
  parseDateOnly,
  parseId,
  parseTimeSlot,
  requireNumber,
  serverError,
} from "@/lib/api";

/**
 * POST /api/availability
 * Body: { doctor_id, date, time_slot? } or { doctor_id, date, time_slots: string[] }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const doctorId = requireNumber(body.doctor_id, "doctor_id");
    const date = parseDateOnly(body.date);

    if (!doctorId || !date) {
      return fail("doctor_id and date (YYYY-MM-DD) are required");
    }

    const doctor = await prisma.doctors.findUnique({ where: { id: doctorId } });
    if (!doctor) return fail("Doctor not found", 404);

    let slots: Date[] = [];
    if (Array.isArray(body.time_slots)) {
      for (const t of body.time_slots) {
        const parsed = parseTimeSlot(t);
        if (!parsed) return fail(`Invalid time_slot: ${String(t)}`);
        slots.push(parsed);
      }
    } else if (body.time_slot != null) {
      const parsed = parseTimeSlot(body.time_slot);
      if (!parsed) return fail("Invalid time_slot (use HH:MM or H:MM AM/PM)");
      slots = [parsed];
    } else {
      return fail("Provide time_slot or time_slots[]");
    }

    if (slots.length === 0) return fail("At least one time_slot is required");

    const createdSlots = await prisma.$transaction(
      slots.map((time_slot) =>
        prisma.availability.create({
          data: {
            doctor_id: doctorId,
            date,
            time_slot,
            is_active: true,
          },
        }),
      ),
    );

    return created(createdSlots);
  } catch (err) {
    // Unique constraint → duplicate slot
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2002"
    ) {
      return fail("One or more slots already exist for this doctor/date/time");
    }
    return serverError(err);
  }
}

/**
 * GET /api/availability?doctor_id=&date=&available_only=true
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = parseId(searchParams.get("doctor_id") ?? "");
    const dateRaw = searchParams.get("date");
    const availableOnly = searchParams.get("available_only") === "true";

    if (!doctorId || !dateRaw) {
      return fail("Query params doctor_id and date are required");
    }

    const date = parseDateOnly(dateRaw);
    if (!date) return fail("date must be YYYY-MM-DD");

    const slots = await prisma.availability.findMany({
      where: {
        doctor_id: doctorId,
        date,
        ...(availableOnly ? { is_active: true } : {}),
      },
      orderBy: { time_slot: "asc" },
    });

    if (!availableOnly) {
      return ok(slots);
    }

    // Exclude slots that already have a CONFIRMED booking
    const confirmed = await prisma.bookings.findMany({
      where: {
        doctor_id: doctorId,
        date,
        status: "confirmed",
      },
      select: { time_slot: true },
    });
    const takenTimes = new Set(
      confirmed.map((b) => b.time_slot.toISOString()),
    );

    const available = slots.filter(
      (s) => !takenTimes.has(s.time_slot.toISOString()),
    );

    return ok(available);
  } catch (err) {
    return serverError(err);
  }
}
