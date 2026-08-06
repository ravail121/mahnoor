import { Prisma } from "@/lib/generated/prisma/client";
import {
  fail,
  ok,
  parseId,
  parseTimeSlot,
  requireNumber,
  serverError,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

type ScheduleInput = {
  weekday: number;
  time_slots: string[];
  is_active?: boolean;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorId = parseId(searchParams.get("doctor_id") ?? "");
    if (!doctorId) return fail("doctor_id is required");

    const rows = await prisma.weekly_schedule.findMany({
      where: { doctor_id: doctorId },
      orderBy: [{ weekday: "asc" }, { time_slot: "asc" }],
    });

    return ok(rows);
  } catch (err) {
    return serverError(err);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const doctorId = requireNumber(body.doctor_id, "doctor_id");
    const entries = Array.isArray(body.entries) ? body.entries : null;

    if (!doctorId || !entries) {
      return fail("doctor_id and entries[] are required");
    }

    const doctor = await prisma.doctors.findUnique({ where: { id: doctorId } });
    if (!doctor) return fail("Doctor not found", 404);

    const createData: Prisma.weekly_scheduleCreateManyInput[] = [];
    for (const entry of entries as ScheduleInput[]) {
      if (!Number.isInteger(entry.weekday) || entry.weekday < 0 || entry.weekday > 6) {
        return fail("weekday must be an integer between 0 and 6");
      }

      const isActive = entry.is_active ?? true;
      const seen = new Set<string>();
      for (const rawTime of entry.time_slots ?? []) {
        const timeSlot = parseTimeSlot(rawTime);
        if (!timeSlot) {
          return fail(`Invalid time slot: ${String(rawTime)}`);
        }

        const key = timeSlot.toISOString();
        if (seen.has(key)) continue;
        seen.add(key);

        createData.push({
          doctor_id: doctorId,
          weekday: entry.weekday,
          time_slot: timeSlot,
          is_active: isActive,
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.weekly_schedule.deleteMany({ where: { doctor_id: doctorId } });
      if (createData.length > 0) {
        await tx.weekly_schedule.createMany({
          data: createData,
        });
      }
    });

    const rows = await prisma.weekly_schedule.findMany({
      where: { doctor_id: doctorId },
      orderBy: [{ weekday: "asc" }, { time_slot: "asc" }],
    });

    return ok(rows);
  } catch (err) {
    return serverError(err);
  }
}
