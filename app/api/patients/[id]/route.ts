import { auth } from "@/auth";
import { normalizePhone } from "@/lib/auth-utils";
import {
  fail,
  ok,
  parseId,
  requireNumber,
  requireString,
  serverError,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

/**
 * GET /api/patients/[id]
 * Admin patient profile + booking history.
 *
 * PATCH /api/patients/[id]
 * Admin edit: { name?, phone?, age? }
 */
export async function GET(_request: Request, context: Ctx) {
  try {
    if (!(await requireAdmin())) return fail("Unauthorized", 401);

    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (!id) return fail("Invalid patient id");

    const patient = await prisma.patients.findUnique({
      where: { id },
      include: {
        bookings: {
          orderBy: [{ date: "desc" }, { time_slot: "desc" }],
          select: {
            id: true,
            date: true,
            time_slot: true,
            session_type: true,
            status: true,
            payment_status: true,
            notes: true,
          },
        },
      },
    });

    if (!patient) return fail("Patient not found", 404);

    const datedBookings = patient.bookings;
    const lastVisit = datedBookings[0]?.date ?? null;
    const firstSeen =
      datedBookings.length > 0
        ? datedBookings[datedBookings.length - 1]?.date ?? patient.created_at
        : patient.created_at;

    return ok({
      id: patient.id,
      name: patient.name,
      phone: patient.phone,
      age: patient.age,
      booking_for: patient.booking_for,
      created_at: patient.created_at,
      total_visits: datedBookings.length,
      first_seen: firstSeen,
      last_visit: lastVisit,
      bookings: datedBookings,
    });
  } catch (err) {
    return serverError(err);
  }
}

export async function PATCH(request: Request, context: Ctx) {
  try {
    if (!(await requireAdmin())) return fail("Unauthorized", 401);

    const { id: idRaw } = await context.params;
    const id = parseId(idRaw);
    if (!id) return fail("Invalid patient id");

    const existing = await prisma.patients.findUnique({ where: { id } });
    if (!existing) return fail("Patient not found", 404);

    const body = await request.json();
    const data: {
      name?: string;
      phone?: string;
      age?: number | null;
    } = {};

    if (body.name != null) {
      const name = requireString(body.name, "name");
      if (!name) return fail("name is required");
      data.name = name;
    }

    if (body.phone != null) {
      const phoneRaw = requireString(body.phone, "phone");
      const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
      if (!phone) return fail("phone is required");

      const duplicate = await prisma.patients.findFirst({
        where: {
          phone,
          NOT: { id },
        },
      });
      if (duplicate) {
        return fail("A patient with this phone already exists", 409);
      }
      data.phone = phone;
    }

    if (body.age !== undefined) {
      if (body.age === null || body.age === "") {
        data.age = null;
      } else {
        const age = requireNumber(body.age, "age");
        if (age === null || age < 0 || age > 120) {
          return fail("age must be between 0 and 120");
        }
        data.age = age;
      }
    }

    if (Object.keys(data).length === 0) {
      return fail("No fields to update");
    }

    const updated = await prisma.patients.update({
      where: { id },
      data,
    });

    return ok(updated);
  } catch (err) {
    return serverError(err);
  }
}
