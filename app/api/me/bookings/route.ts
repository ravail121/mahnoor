import { fail, ok, serverError } from "@/lib/api";
import { getPatientScope, getPatientScopedIds } from "@/lib/patient-dashboard";
import { prisma } from "@/lib/prisma";

function todayDateOnly() {
  const now = new Date();
  return new Date(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T00:00:00Z`,
  );
}

export async function GET() {
  try {
    const scope = await getPatientScope();
    if (!scope) return fail("Unauthorized", 401);
    if (scope.role !== "patient") return fail("Patient dashboard only", 403);

    const patients = await getPatientScopedIds(scope);
    if (patients.length === 0) {
      return ok({
        profile: null,
        upcoming: [],
        past: [],
        cancelled: [],
      });
    }

    const patientIds = patients.map((patient) => patient.id);
    const primaryPatient =
      patients.find((patient) => patient.id === scope.patientId) ?? patients[0];
    const today = todayDateOnly();

    const bookings = await prisma.bookings.findMany({
      where: {
        patient_id: { in: patientIds },
      },
      include: {
        patients: true,
        doctors: true,
      },
      orderBy: [{ date: "asc" }, { time_slot: "asc" }],
    });

    const upcoming = bookings.filter(
      (booking) =>
        booking.date >= today &&
        (booking.status === "tentative" || booking.status === "confirmed"),
    );

    const past = bookings
      .filter(
        (booking) =>
          booking.status === "completed" ||
          (booking.date < today && booking.status !== "cancelled"),
      )
      .sort((left, right) => {
        if (left.date.getTime() !== right.date.getTime()) {
          return right.date.getTime() - left.date.getTime();
        }
        return right.time_slot.getTime() - left.time_slot.getTime();
      });

    const cancelled = bookings
      .filter((booking) => booking.status === "cancelled")
      .sort((left, right) => {
        if (left.date.getTime() !== right.date.getTime()) {
          return right.date.getTime() - left.date.getTime();
        }
        return right.time_slot.getTime() - left.time_slot.getTime();
      });

    return ok({
      profile: {
        name: primaryPatient.name,
        phone: primaryPatient.phone,
      },
      upcoming,
      past,
      cancelled,
    });
  } catch (err) {
    return serverError(err);
  }
}
