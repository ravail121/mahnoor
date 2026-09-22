import Link from "next/link";
import { AdminDashboardMiniCal } from "@/components/admin/AdminDashboardMiniCal";
import { AdminPaymentVerify } from "@/components/admin/AdminPaymentVerify";
import { buildInviteUrl } from "@/lib/invite-token";
import { prisma } from "@/lib/prisma";
import {
  DOCTOR_ID,
  addDays,
  formatDateInput,
  formatTimeDisplay,
  getGreetingLabel,
} from "@/lib/schedule";

function formatShortDate(value: Date) {
  return value.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function dateOnly(value: Date) {
  return new Date(`${formatDateInput(value)}T00:00:00Z`);
}

function formatDateEyebrow(value = new Date()) {
  return value.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function splitTime(value: Date) {
  const label = formatTimeDisplay(value);
  const [time, meridiem] = label.split(" ");
  return { time, meridiem: meridiem ?? "" };
}

function statusClass(status: string) {
  if (status === "tentative") return "tentative";
  if (status === "confirmed") return "confirmed";
  if (status === "completed") return "completed";
  if (status === "cancelled") return "cancelled";
  return "completed";
}

function statusLabel(status: string) {
  if (status === "tentative") return "Awaiting verification";
  if (status === "confirmed") return "Confirmed";
  if (status === "completed") return "Completed";
  if (status === "cancelled") return "Cancelled";
  return status;
}

export default async function AdminPage() {
  const today = dateOnly(new Date());
  const weekEnd = dateOnly(addDays(new Date(), 6));

  const [todayAppointments, todayCount, weekCount, pendingArrival, pendingPayments] =
    await Promise.all([
      prisma.bookings.findMany({
        where: {
          doctor_id: DOCTOR_ID,
          date: today,
          status: { in: ["tentative", "confirmed", "completed"] },
        },
        include: { patients: true },
        orderBy: { time_slot: "asc" },
      }),
      prisma.bookings.count({
        where: {
          doctor_id: DOCTOR_ID,
          date: today,
          status: { in: ["tentative", "confirmed", "completed"] },
        },
      }),
      prisma.bookings.count({
        where: {
          doctor_id: DOCTOR_ID,
          date: { gte: today, lte: weekEnd },
          status: { in: ["tentative", "confirmed", "completed"] },
        },
      }),
      prisma.bookings.count({
        where: {
          doctor_id: DOCTOR_ID,
          status: "tentative",
          payment_status: "unpaid",
          date: { gte: today },
        },
      }),
      prisma.payments.findMany({
        where: { status: "pending", bookings: { doctor_id: DOCTOR_ID } },
        include: { bookings: { include: { patients: true } } },
        orderBy: { created_at: "asc" },
      }),
    ]);

  const pendingPaymentRows = pendingPayments.map((payment) => ({
    id: payment.id,
    amount: payment.amount.toString(),
    method: payment.method,
    status: payment.status,
    created_at: payment.created_at.toISOString(),
    inviteUrl: buildInviteUrl(payment.bookings.id),
    booking: {
      id: payment.bookings.id,
      patientName: payment.bookings.patients.name,
      patientPhone: payment.bookings.patients.phone,
      dateLabel: formatShortDate(payment.bookings.date),
      timeLabel: formatTimeDisplay(payment.bookings.time_slot),
    },
  }));

  const nextPatient =
    todayAppointments.find(
      (booking) =>
        booking.status === "tentative" || booking.status === "confirmed",
    ) ?? null;

  const bookedDates = todayAppointments.length
    ? [formatDateInput(new Date())]
    : [];

  return (
    <>
      <div className="topbar">
        <div className="greeting">
          <div className="date-line">{formatDateEyebrow()}</div>
          <h1>
            {getGreetingLabel()}, <em>Dr. Mahnoor</em>
          </h1>
        </div>
        <div className="top-actions">
          <Link href="/admin/schedule" className="btn ghost">
            + Add slots
          </Link>
          <Link href="/admin/bookings" className="btn">
            View bookings
          </Link>
        </div>
      </div>

      {pendingPaymentRows.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <AdminPaymentVerify
            payments={pendingPaymentRows}
            title={`Payments awaiting verification (${pendingPaymentRows.length})`}
            showIcon
          />
        </div>
      )}

      <div className="stats">
        <div className="stat today">
          <div className="spark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3D5C48" strokeWidth="2">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <div className="k">{todayCount}</div>
          <div className="l">Appointments today</div>
        </div>
        <div className="stat week">
          <div className="spark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B5843A" strokeWidth="2">
              <path d="M3 3v18h18" />
              <path d="M7 14l4-4 3 3 5-6" />
            </svg>
          </div>
          <div className="k">{weekCount}</div>
          <div className="l">Upcoming this week</div>
        </div>
        <div className="stat pending">
          <div className="spark" aria-hidden="true">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#B06A5E" strokeWidth="2">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
          <div className="k">{pendingArrival}</div>
          <div className="l">Awaiting verification</div>
        </div>
      </div>

      <div className="cols">
        <div className="card">
          <div className="card-head">
            <h2>Today&apos;s appointments</h2>
            <Link href="/admin/bookings">View all →</Link>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="empty">
              <h3>No appointments today</h3>
              <p>A clear calendar gives you room to plan ahead.</p>
              <Link href="/admin/schedule" className="btn ghost">
                Open schedule
              </Link>
            </div>
          ) : (
            todayAppointments.map((booking) => {
              const { time, meridiem } = splitTime(booking.time_slot);
              const online = booking.session_type === "online";

              return (
                <Link
                  key={booking.id}
                  href={`/admin/bookings/${booking.id}`}
                  className="appt"
                >
                  <div className="appt-time">
                    {time} <small>{meridiem}</small>
                  </div>
                  <div className="appt-who">
                    <strong>{booking.patients.name}</strong>
                    <span>
                      <span className={`type-pill ${online ? "online" : "inperson"}`}>
                        {online ? "▶ Online" : "◈ In-person"}
                      </span>
                      {booking.patients.age != null
                        ? ` · ${booking.patients.age} yrs`
                        : ""}
                    </span>
                  </div>
                  <div className={`status ${statusClass(booking.status)}`}>
                    {statusLabel(booking.status)}
                  </div>
                </Link>
              );
            })
          )}
        </div>

        <div>
          {nextPatient ? (
            <div className="next-card">
              <div className="lbl">
                Up next ·{" "}
                <span className="np-time">
                  {formatTimeDisplay(nextPatient.time_slot)}
                </span>
              </div>
              <div className="np-name">{nextPatient.patients.name}</div>
              <div className="np-meta">
                {nextPatient.session_type === "online" ? "Online" : "In-person"}
                {nextPatient.patients.age != null
                  ? ` · ${nextPatient.patients.age} yrs`
                  : ""}
              </div>
              <div className="np-note">
                {nextPatient.notes
                  ? `"${nextPatient.notes}"`
                  : "No visit note shared yet."}
              </div>
            </div>
          ) : (
            <div className="next-card">
              <div className="lbl">Up next</div>
              <div className="np-name">Nothing queued</div>
              <div className="np-meta">No upcoming patients for today.</div>
            </div>
          )}

          <AdminDashboardMiniCal bookedDates={bookedDates} />
        </div>
      </div>
    </>
  );
}
