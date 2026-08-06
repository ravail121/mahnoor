import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  BookingStatusBadge,
  PaymentStatusBadge,
  SessionTypeBadge,
} from "@/components/admin/AdminBadge";
import { PatientBookingActions } from "@/components/patient/PatientBookingActions";
import { prisma } from "@/lib/prisma";
import { canPatientAccessBooking, getPatientScope } from "@/lib/patient-dashboard";
import { formatTimeDisplay } from "@/lib/schedule";

function isUpcoming(date: Date, status: string) {
  const now = new Date();
  const today = new Date(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}T00:00:00Z`,
  );
  return (
    date >= today &&
    (status === "tentative" || status === "confirmed")
  );
}

function formatDateLabel(value: Date) {
  return value.toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function PatientBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const scope = await getPatientScope();
  if (!scope) {
    redirect("/login");
  }
  if (scope.role === "admin") {
    redirect("/admin");
  }

  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    notFound();
  }

  if (!(await canPatientAccessBooking(bookingId, scope))) {
    notFound();
  }

  const booking = await prisma.bookings.findUnique({
    where: { id: bookingId },
    include: {
      patients: true,
      doctors: true,
      payments: {
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!booking) {
    notFound();
  }

  const latestPayment = booking.payments[0] ?? null;
  const canCancel = isUpcoming(booking.date, booking.status);

  return (
    <section className="min-h-screen bg-cream px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[32px] border border-[rgba(61,92,72,0.1)] bg-white px-6 py-8 shadow-[0_20px_70px_-38px_rgba(44,70,54,0.32)] sm:px-8">
          <Link href="/dashboard" className="text-sm font-semibold text-sage-deep">
            ← Back to dashboard
          </Link>
          <h1 className="mt-4 text-4xl text-forest">Appointment details</h1>
          <p className="mt-3 max-w-2xl text-[15px] text-muted">
            A calm summary of your booking, payment status, and visit details.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-[rgba(61,92,72,0.1)] bg-white p-6 shadow-[0_16px_44px_-34px_rgba(44,70,54,0.35)]">
              <h2 className="font-serif text-3xl text-forest">Your appointment</h2>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    Date
                  </p>
                  <p className="mt-2 font-medium text-forest">
                    {formatDateLabel(booking.date)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    Time
                  </p>
                  <p className="mt-2 font-medium text-forest">
                    {formatTimeDisplay(booking.time_slot)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    Session
                  </p>
                  <div className="mt-2">
                    <SessionTypeBadge sessionType={booking.session_type} />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    Status
                  </p>
                  <div className="mt-2">
                    <BookingStatusBadge status={booking.status} />
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[rgba(61,92,72,0.1)] bg-white p-6 shadow-[0_16px_44px_-34px_rgba(44,70,54,0.35)]">
              <h2 className="font-serif text-3xl text-forest">Visit notes</h2>
              <p className="mt-4 text-sm text-muted">
                {booking.notes || "No additional notes were shared for this appointment."}
              </p>
            </div>
          </div>

          <div className="space-y-6">
            <PatientBookingActions bookingId={booking.id} canCancel={canCancel} />

            <div className="rounded-[28px] border border-[rgba(61,92,72,0.1)] bg-white p-6 shadow-[0_16px_44px_-34px_rgba(44,70,54,0.35)]">
              <h2 className="font-serif text-3xl text-forest">Payment</h2>
              <div className="mt-5 space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    Payment status
                  </p>
                  <div className="mt-2">
                    <PaymentStatusBadge status={booking.payment_status} />
                  </div>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    Amount paid
                  </p>
                  <p className="mt-2 font-medium text-forest">
                    Rs. {booking.amount_paid.toString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-muted">
                    Latest payment record
                  </p>
                  <p className="mt-2 text-sm text-muted">
                    {latestPayment
                      ? `${latestPayment.method} • ${latestPayment.status}`
                      : "No payment record yet"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-[rgba(61,92,72,0.1)] bg-white p-6 shadow-[0_16px_44px_-34px_rgba(44,70,54,0.35)]">
              <h2 className="font-serif text-3xl text-forest">Your profile</h2>
              <div className="mt-5 space-y-3">
                <p className="text-sm text-muted">
                  <span className="font-semibold text-forest">Name:</span>{" "}
                  {booking.patients.name}
                </p>
                <p className="text-sm text-muted">
                  <span className="font-semibold text-forest">Phone:</span>{" "}
                  {booking.patients.phone}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
