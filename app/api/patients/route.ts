import { auth } from "@/auth";
import { normalizePhone } from "@/lib/auth-utils";
import {
  created,
  fail,
  ok,
  requireNumber,
  requireString,
  serverError,
} from "@/lib/api";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

function toListItem(patient: {
  id: number;
  name: string;
  phone: string;
  age: number | null;
  created_at: Date;
  bookings: Array<{ id: number; date: Date }>;
}) {
  const lastVisit = patient.bookings[0]?.date ?? null;
  return {
    id: patient.id,
    name: patient.name,
    phone: patient.phone,
    age: patient.age,
    created_at: patient.created_at,
    booking_count: patient.bookings.length,
    last_visit: lastVisit,
  };
}

/**
 * GET /api/patients?q=
 * Admin patient directory (search by name or phone).
 *
 * POST /api/patients
 * Admin create patient: { name, phone, age? }
 */
export async function GET(request: Request) {
  try {
    if (!(await requireAdmin())) return fail("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const q = requireString(searchParams.get("q"), "q");

    const patients = await prisma.patients.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q } },
              { phone: { contains: q } },
            ],
          }
        : undefined,
      include: {
        bookings: {
          select: { id: true, date: true },
          orderBy: [{ date: "desc" }, { time_slot: "desc" }],
        },
      },
      orderBy: { name: "asc" },
    });

    return ok(patients.map(toListItem));
  } catch (err) {
    return serverError(err);
  }
}

export async function POST(request: Request) {
  try {
    if (!(await requireAdmin())) return fail("Unauthorized", 401);

    const body = await request.json();
    const name = requireString(body.name, "name");
    const phoneRaw = requireString(body.phone, "phone");
    const phone = phoneRaw ? normalizePhone(phoneRaw) : null;
    const age =
      body.age == null || body.age === ""
        ? null
        : requireNumber(body.age, "age");

    if (!name || !phone) return fail("Required: name, phone");
    if (age != null && (age < 0 || age > 120)) {
      return fail("age must be between 0 and 120");
    }

    const existing = await prisma.patients.findFirst({ where: { phone } });
    if (existing) {
      return fail("A patient with this phone already exists", 409);
    }

    const patient = await prisma.patients.create({
      data: {
        name,
        phone,
        age,
      },
      include: {
        bookings: {
          select: { id: true, date: true },
          orderBy: [{ date: "desc" }, { time_slot: "desc" }],
        },
      },
    });

    return created(toListItem(patient));
  } catch (err) {
    return serverError(err);
  }
}
