import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminBookingActions } from "@/components/admin/AdminBookingActions";
import { AdminPaymentVerify } from "@/components/admin/AdminPaymentVerify";
import { buildInviteUrl } from "@/lib/invite-token";
import { prisma } from "@/lib/prisma";
import { formatTimeDisplay, formatTimeInput } from "@/lib/schedule";

function formatMoney(value: { toString(): string } | number | string) {
  const amount = Number(value.toString());
  if (!Number.isFinite(amount)) return "Rs 0";
  return `Rs ${amount.toLocaleString("en-PK")}`;
}

function formatLongDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function bookingForLabel(value: string) {
  const normalized = value.replaceAll("_", " ").toLowerCase();
  if (normalized === "self") return "Herself";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function statusLabel(status: string) {
  if (status === "tentative") return "Awaiting verification";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export default async function AdminBookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const bookingId = Number(id);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    notFound();
  }

  const booking = await prisma.bookings.findUnique({
    where: { id: bookingId },
    include: {
      patients: true,
      payments: true,
      doctors: true,
    },
  });

  if (!booking) {
    notFound();
  }

  const totalFee = Number(booking.total_fee.toString());
  const amountPaid = Number(booking.amount_paid.toString());
  const dueAtClinic = Math.max(0, totalFee - amountPaid);
  const ageLabel =
    booking.patients.age != null ? `${booking.patients.age} years` : null;

  const paymentRows = [...booking.payments]
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .map((payment) => ({
      id: payment.id,
      amount: payment.amount.toString(),
      method: payment.method,
      status: payment.status,
      created_at: payment.created_at.toISOString(),
      inviteUrl: buildInviteUrl(booking.id),
      booking: {
        id: booking.id,
        patientName: booking.patients.name,
        patientPhone: booking.patients.phone,
        dateLabel: formatShortDate(booking.date),
        timeLabel: formatTimeDisplay(booking.time_slot),
      },
    }));

  return (
    <div className="booking-detail">
      <Link href="/admin/bookings" className="back">
        ← Back to bookings
      </Link>

      <div className="detail-grid">
        <div className="card">
          <div className="d-head">
            <div>
              <h1>{booking.patients.name}</h1>
              <div className="phone">
                {booking.patients.phone}
                {ageLabel ? ` · ${ageLabel}` : ""}
              </div>
            </div>
            <span className={`status ${booking.status}`}>
              {statusLabel(booking.status)}
            </span>
          </div>

          <div className="info-row">
            <div className="lab">Session type</div>
            <div className="val">
              {booking.session_type === "online"
                ? "Online visit"
                : "In-person visit"}
            </div>
          </div>
          <div className="info-row">
            <div className="lab">Date</div>
            <div className="val">{formatLongDate(booking.date)}</div>
          </div>
          <div className="info-row">
            <div className="lab">Time</div>
            <div className="val mono">{formatTimeDisplay(booking.time_slot)}</div>
          </div>
          <div className="info-row">
            <div className="lab">Booking for</div>
            <div className="val">
              {bookingForLabel(booking.patients.booking_for)}
            </div>
          </div>
          <div className="info-row">
            <div className="lab">Booked on</div>
            <div className="val">{formatShortDate(booking.created_at)}</div>
          </div>

          <div className="note-box">
            <div className="nl">Patient&apos;s note</div>
            {booking.notes?.trim()
              ? booking.notes
              : "No note shared for this booking."}
          </div>
        </div>

        <div className="card actions-card">
          <AdminBookingActions
            bookingId={booking.id}
            status={booking.status}
            doctorId={booking.doctor_id}
            initialDate={booking.date.toISOString().slice(0, 10)}
            initialTime={formatTimeInput(booking.time_slot)}
            initialSessionType={booking.session_type}
          />

          <div className="pay-summary">
            <div className="pay-line">
              <span style={{ color: "var(--muted)" }}>Consultation fee</span>
              <span className="mono">{formatMoney(totalFee)}</span>
            </div>
            <div className="pay-line">
              <span style={{ color: "var(--muted)" }}>Verified so far</span>
              <span className="mono">{formatMoney(amountPaid)}</span>
            </div>
            <div className="pay-line total">
              <span>Due at clinic</span>
              <span className="mono">{formatMoney(dueAtClinic)}</span>
            </div>
          </div>
        </div>

        <AdminPaymentVerify payments={paymentRows} />
      </div>
    </div>
  );
}
