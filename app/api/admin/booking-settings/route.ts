import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { fail, ok, parseId, serverError } from "@/lib/api";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return null;
  return session;
}

/**
 * GET /api/admin/booking-settings?doctor_id=
 * Admin-only — current online/in-person booking toggle state.
 */
export async function GET(request: Request) {
  try {
    if (!(await requireAdmin())) return fail("Unauthorized", 401);

    const { searchParams } = new URL(request.url);
    const doctorId = parseId(searchParams.get("doctor_id") ?? "");
    if (!doctorId) return fail("doctor_id is required");

    const doctor = await prisma.doctors.findUnique({
      where: { id: doctorId },
      select: { online_enabled: true, in_person_enabled: true },
    });
    if (!doctor) return fail("Doctor not found", 404);

    return ok(doctor);
  } catch (err) {
    return serverError(err);
  }
}

/**
 * PATCH /api/admin/booking-settings
 * Admin-only — body: { doctor_id, online_enabled?, in_person_enabled? }
 */
export async function PATCH(request: Request) {
  try {
    if (!(await requireAdmin())) return fail("Unauthorized", 401);

    const body = await request.json();
    const doctorId = parseId(String(body.doctor_id ?? ""));
    if (!doctorId) return fail("doctor_id is required");

    if (
      typeof body.online_enabled !== "boolean" &&
      typeof body.in_person_enabled !== "boolean"
    ) {
      return fail("Provide online_enabled and/or in_person_enabled");
    }

    const doctor = await prisma.doctors.update({
      where: { id: doctorId },
      data: {
        ...(typeof body.online_enabled === "boolean"
          ? { online_enabled: body.online_enabled }
          : {}),
        ...(typeof body.in_person_enabled === "boolean"
          ? { in_person_enabled: body.in_person_enabled }
          : {}),
      },
      select: { online_enabled: true, in_person_enabled: true },
    });

    return ok(doctor);
  } catch (err) {
    return serverError(err);
  }
}
