import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AdminPatientDetail } from "@/components/admin/AdminPatientDetail";
import { prisma } from "@/lib/prisma";

export default async function AdminPatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    redirect("/login");
  }

  const { id } = await params;
  const patientId = Number(id);
  if (!Number.isInteger(patientId) || patientId <= 0) {
    notFound();
  }

  const patient = await prisma.patients.findUnique({
    where: { id: patientId },
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

  if (!patient) {
    notFound();
  }

  const bookings = patient.bookings.map((booking) => ({
    ...booking,
    date: booking.date.toISOString(),
    time_slot: booking.time_slot.toISOString(),
  }));

  const lastVisit = patient.bookings[0]?.date ?? null;
  const firstSeen =
    patient.bookings.length > 0
      ? patient.bookings[patient.bookings.length - 1]?.date ?? patient.created_at
      : patient.created_at;

  return (
    <AdminPatientDetail
      initialPatient={{
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        age: patient.age,
        total_visits: patient.bookings.length,
        first_seen: firstSeen.toISOString(),
        last_visit: lastVisit ? lastVisit.toISOString() : null,
        bookings,
      }}
    />
  );
}
