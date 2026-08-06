import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/auth-utils";
import {
  created,
  fail,
  ok,
  parseDateOnly,
  parseId,
  parseTimeSlot,
  requireNumber,
  requireString,
  serverError,
} from "@/lib/api";

const SESSION_TYPES = ["in_person", "online"] as const;
const BOOKING_FOR = ["self", "family_member"] as const;
const STATUSES = ["tentative", "confirmed", "cancelled", "completed"] as const;

/**
 * POST /api/bookings
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const doctorId = requireNumber(body.doctor_id, "doctor_id");
    const name = requireString(body.name ?? body.patient?.name, "name");
    const phoneInput = requireString(body.phone ?? body.patient?.phone, "phone");
    const sessionType = requireString(body.session_type, "session_type");
    const date = parseDateOnly(body.date);
    const timeSlot = parseTimeSlot(body.time_slot);
    const notes =
      body.notes == null || body.notes === ""
        ? null
        : requireString(body.notes, "notes");

    const ageRaw = body.age ?? body.patient?.age;
    const age =
      ageRaw == null || ageRaw === ""
        ? null
        : requireNumber(ageRaw, "age");

    const bookingForRaw =
      body.booking_for ?? body.patient?.booking_for ?? "self";
    const bookingFor = requireString(bookingForRaw, "booking_for");

    const phone = phoneInput ? normalizePhone(phoneInput) : null;

    if (!doctorId || !name || !phone || !sessionType || !date || !timeSlot) {
      return fail(
        "Required: doctor_id, name, phone, session_type, date, time_slot",
      );
    }
    if (!SESSION_TYPES.includes(sessionType as (typeof SESSION_TYPES)[number])) {
      return fail("session_type must be in_person or online");
    }
    if (!BOOKING_FOR.includes(bookingFor as (typeof BOOKING_FOR)[number])) {
      return fail("booking_for must be self or family_member");
    }
    if (age !== null && (age < 0 || age > 120 || !Number.isInteger(age))) {
      return fail("age must be an integer between 0 and 120");
    }

    const doctor = await prisma.doctors.findUnique({ where: { id: doctorId } });
    if (!doctor) return fail("Doctor not found", 404);

    // Double-booking guard: no confirmed booking on this slot
    const confirmed = await prisma.bookings.findFirst({
      where: {
        doctor_id: doctorId,
        date,
        time_slot: timeSlot,
        status: "confirmed",
      },
    });
    if (confirmed) {
      return fail("slot already booked", 400);
    }

    const booking = await prisma.$transaction(async (tx) => {
      let patient = await tx.patients.findFirst({ where: { phone } });
      if (patient) {
        patient = await tx.patients.update({
          where: { id: patient.id },
          data: {
            name,
            age: age ?? patient.age,
            booking_for: bookingFor as "self" | "family_member",
          },
        });
      } else {
        patient = await tx.patients.create({
          data: {
            name,
            phone,
            age,
            booking_for: bookingFor as "self" | "family_member",
          },
        });
      }

      return tx.bookings.create({
        data: {
          doctor_id: doctorId,
          patient_id: patient.id,
          session_type: sessionType as "in_person" | "online",
          date,
          time_slot: timeSlot,
          status: "tentative",
          payment_status: "unpaid",
          amount_paid: 0,
          total_fee: 5000,
          notes,
        },
        include: { patients: true },
      });
    });

    return created(booking);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * GET /api/bookings?doctor_id=&date=&status=
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const doctorIdRaw = searchParams.get("doctor_id");
    const dateRaw = searchParams.get("date");
    const statusRaw = searchParams.get("status");
    const sessionTypeRaw = searchParams.get("session_type");

    const where: {
      doctor_id?: number;
      date?: Date;
      status?: (typeof STATUSES)[number];
      session_type?: (typeof SESSION_TYPES)[number];
    } = {};

    if (doctorIdRaw) {
      const doctorId = parseId(doctorIdRaw);
      if (!doctorId) return fail("Invalid doctor_id");
      where.doctor_id = doctorId;
    }

    if (dateRaw) {
      const date = parseDateOnly(dateRaw);
      if (!date) return fail("date must be YYYY-MM-DD");
      where.date = date;
    }

    if (statusRaw) {
      if (!STATUSES.includes(statusRaw as (typeof STATUSES)[number])) {
        return fail(
          "status must be tentative, confirmed, cancelled, or completed",
        );
      }
      where.status = statusRaw as (typeof STATUSES)[number];
    }

    if (sessionTypeRaw) {
      if (
        !SESSION_TYPES.includes(sessionTypeRaw as (typeof SESSION_TYPES)[number])
      ) {
        return fail("session_type must be in_person or online");
      }
      where.session_type = sessionTypeRaw as (typeof SESSION_TYPES)[number];
    }

    const bookings = await prisma.bookings.findMany({
      where,
      include: { patients: true },
      orderBy: [{ date: "asc" }, { time_slot: "asc" }],
    });

    return ok(bookings);
  } catch (err) {
    return serverError(err);
  }
}
