import { auth } from "@/auth";
import { normalizePhone } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export type PatientScope = {
  userId: number;
  patientId: number | null;
  phone: string | null;
  role: "patient" | "admin";
};

export async function getPatientScope() {
  const session = await auth();
  if (!session?.user) return null;

  const userId = Number(session.user.id);
  if (!Number.isInteger(userId) || userId <= 0) return null;

  let phone = normalizePhone(session.user.phone ?? "") ?? null;
  if (!phone && session.user.patientId) {
    const patient = await prisma.patients.findUnique({
      where: { id: session.user.patientId },
      select: { phone: true },
    });
    phone = normalizePhone(patient?.phone ?? "") ?? null;
  }

  return {
    userId,
    patientId: session.user.patientId ?? null,
    phone,
    role: session.user.role,
  } satisfies PatientScope;
}

export async function getPatientScopedIds(scope: PatientScope) {
  if (scope.role !== "patient") {
    return [];
  }

  const filters = [
    scope.patientId ? { id: scope.patientId } : undefined,
    scope.phone ? { phone: scope.phone } : undefined,
  ].filter(Boolean) as Array<{ id?: number; phone?: string }>;

  if (filters.length === 0) {
    return [];
  }

  const rows = await prisma.patients.findMany({
    where: {
      OR: filters,
    },
    select: { id: true, phone: true, name: true },
  });

  return rows;
}

export async function canPatientAccessBooking(
  bookingId: number,
  scope: PatientScope,
) {
  if (scope.role !== "patient") return true;

  const patients = await getPatientScopedIds(scope);
  if (patients.length === 0) return false;

  const booking = await prisma.bookings.findFirst({
    where: {
      id: bookingId,
      patient_id: {
        in: patients.map((patient) => patient.id),
      },
    },
    select: { id: true },
  });

  return Boolean(booking);
}
