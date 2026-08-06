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

    const pattern = await prisma.weekly_schedule.findMany({
      where: { doctor_id: doctorId, is_active: true },
      orderBy: [{ weekday: "asc" }, { time_slot: "asc" }],
    });

    if (pattern.length === 0) {
      return fail("No active weekly schedule found to generate from");
    }

    const createData: Array<{
      doctor_id: number;
      date: Date;
      time_slot: Date;
      is_active: boolean;
    }> = [];

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const weekday = cursor.getUTCDay();
      const matching = pattern.filter((entry) => entry.weekday === weekday);
      for (const entry of matching) {
        createData.push({
          doctor_id: doctorId,
          date: new Date(cursor),
          time_slot: entry.time_slot,
          is_active: true,
        });
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (createData.length === 0) {
      return created({ count: 0, message: "No slots matched that date range" });
    }

    const result = await prisma.availability.createMany({
      data: createData,
      skipDuplicates: true,
    });

    return created({
      count: result.count,
      generated_from_pattern: pattern.length,
      days_covered: createData.length,
    });
  } catch (err) {
    return serverError(err);
  }
}
