"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { formatTimeDisplay } from "@/lib/schedule";
import { siteConfig } from "@/lib/site-config";

type DashboardBooking = {
  id: number;
  date: string;
  time_slot: string;
  session_type: "in_person" | "online";
  payment_status: "unpaid" | "paid" | "refunded";
  amount_paid: string;
  status: "tentative" | "confirmed" | "cancelled" | "completed";
};

type DashboardResponse = {
  profile: {
    name: string;
    phone: string;
  } | null;
  upcoming: DashboardBooking[];
  past: DashboardBooking[];
  cancelled: DashboardBooking[];
};

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };

function parsePayload<T>(payload: ApiSuccess<T> | ApiFailure) {
  if (!payload.success) {
    throw new Error(payload.error);
  }
  return payload.data;
}

function firstName(fullName: string) {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function initialFromName(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

function dateParts(value: string) {
  const date = new Date(value);
  return {
    day: String(date.getUTCDate()).padStart(2, "0"),
    mon: date.toLocaleDateString("en-US", {
      month: "short",
      timeZone: "UTC",
    }),
  };
}

function sessionMeta(sessionType: DashboardBooking["session_type"]) {
  if (sessionType === "online") {
    return {
      pillClass: "online",
      pillLabel: "▶ Online",
      location: "Video session",
    };
  }
  return {
    pillClass: "inperson",
    pillLabel: "◈ In-person",
    location: siteConfig.clinic.replace(", DHA Lahore", " DHA"),
  };
}

function statusLabel(status: DashboardBooking["status"]) {
  switch (status) {
    case "confirmed":
      return "Confirmed";
    case "tentative":
      return "Pay on arrival";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function UpcomingCard({
  booking,
  onCancel,
  onCancelAndRebook,
  busyId,
}: {
  booking: DashboardBooking;
  onCancel: (bookingId: number, rebook: boolean) => void;
  onCancelAndRebook: (bookingId: number) => void;
  busyId: number | null;
}) {
  const isBusy = busyId === booking.id;
  const { day, mon } = dateParts(booking.date);
  const meta = sessionMeta(booking.session_type);
  const statusClass =
    booking.status === "confirmed" ? "confirmed" : "tentative";

  return (
    <div className="appt-card">
      <div className="appt-date">
        <div className="day">{day}</div>
        <div className="mon">{mon}</div>
      </div>
      <div className="appt-body">
        <div className="time">
          {formatTimeDisplay(new Date(booking.time_slot))}
        </div>
        <div className="meta">
          <span className={`type-pill ${meta.pillClass}`}>{meta.pillLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{meta.location}</span>
        </div>
      </div>
      <div className="appt-right">
        <span className={`appt-status ${statusClass}`}>
          {statusLabel(booking.status)}
        </span>
        <button
          type="button"
          className="appt-cancel"
          disabled={isBusy}
          onClick={() => onCancel(booking.id, false)}
        >
          {isBusy ? "Cancelling..." : "Cancel"}
        </button>
        <button
          type="button"
          className="appt-cancel-sub"
          disabled={isBusy}
          onClick={() => onCancelAndRebook(booking.id)}
        >
          Cancel &amp; rebook
        </button>
      </div>
    </div>
  );
}

function PastCard({
  booking,
  past = true,
}: {
  booking: DashboardBooking;
  past?: boolean;
}) {
  const { day, mon } = dateParts(booking.date);
  const meta = sessionMeta(booking.session_type);
  const statusClass =
    booking.status === "cancelled"
      ? "cancelled"
      : booking.status === "completed"
        ? "completed"
        : "completed";

  return (
    <Link
      href={`/dashboard/bookings/${booking.id}`}
      className={`appt-card${past ? " past" : ""}`}
    >
      <div className="appt-date">
        <div className="day">{day}</div>
        <div className="mon">{mon}</div>
      </div>
      <div className="appt-body">
        <div className="time">
          {formatTimeDisplay(new Date(booking.time_slot))}
        </div>
        <div className="meta">
          <span className={`type-pill ${meta.pillClass}`}>{meta.pillLabel}</span>
          <span aria-hidden="true">·</span>
          <span>{meta.location}</span>
        </div>
      </div>
      <div className="appt-right">
        <span className={`appt-status ${statusClass}`}>
          {statusLabel(booking.status)}
        </span>
      </div>
    </Link>
  );
}

export function PatientDashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyBookingId, setBusyBookingId] = useState<number | null>(null);

  useEffect(() => {
    void loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/me/bookings");
      const payload = (await response.json()) as
        | ApiSuccess<DashboardResponse>
        | ApiFailure;
      setData(parsePayload(payload));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load your appointments",
      );
    } finally {
      setLoading(false);
    }
  }

  async function cancelBooking(bookingId: number, rebook: boolean) {
    if (!window.confirm("Cancel this appointment?")) return;

    setBusyBookingId(bookingId);
    setError("");
    setNotice("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "cancelled" }),
      });
      const payload = (await response.json()) as
        | ApiSuccess<unknown>
        | ApiFailure;
      parsePayload(payload);
      setNotice("Your appointment has been cancelled.");
      await loadDashboard();
      if (rebook) {
        router.push("/booking");
      }
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Could not cancel this appointment",
      );
    } finally {
      setBusyBookingId(null);
    }
  }

  const profileName = data?.profile?.name ?? session?.user?.name ?? "there";
  const displayFirst = firstName(profileName);
  const totalBookings =
    (data?.upcoming.length ?? 0) +
    (data?.past.length ?? 0) +
    (data?.cancelled.length ?? 0);

  return (
    <div className="patient-dash">
      <header className="pt-nav">
        <div className="pt-nav-inner">
          <Link href="/" className="pt-brand">
            <div className="pt-mark">{siteConfig.brandInitial}</div>
            <div>
              <strong>{siteConfig.doctorName}</strong>
              <span>{siteConfig.title}</span>
            </div>
          </Link>
          <div className="pt-user">
            <span className="pt-user-name">{displayFirst}</span>
            <button
              type="button"
              className="pt-signout"
              onClick={() => void signOut({ callbackUrl: "/" })}
            >
              Sign out
            </button>
            <div className="pt-avatar" aria-hidden="true">
              {initialFromName(profileName)}
            </div>
          </div>
        </div>
      </header>

      <main className="pt-main">
        <div className="pt-hello">
          <div>
            <h1>
              Hello, <em>{displayFirst}</em>
            </h1>
            <p>Here are your appointments with Dr. Mahnoor.</p>
          </div>
          <Link href="/booking" className="pt-btn">
            + Book new appointment
          </Link>
        </div>

        {notice ? <div className="pt-notice ok">{notice}</div> : null}
        {error ? <div className="pt-notice err">{error}</div> : null}

        {loading ? (
          <div className="pt-loading">Loading your appointments...</div>
        ) : totalBookings === 0 ? (
          <div className="pt-empty">
            <h2>Welcome — your dashboard is ready</h2>
            <p>
              Once you book your first appointment, it will appear here. Guest
              bookings on the same phone number will also show up automatically.
            </p>
            <Link href="/booking" className="pt-btn">
              Book your first appointment
            </Link>
          </div>
        ) : (
          <>
            <h2 className="pt-section-title">Upcoming</h2>

            {data?.upcoming.length ? (
              data.upcoming.map((booking) => (
                <UpcomingCard
                  key={booking.id}
                  booking={booking}
                  busyId={busyBookingId}
                  onCancel={cancelBooking}
                  onCancelAndRebook={(bookingId) =>
                    void cancelBooking(bookingId, true)
                  }
                />
              ))
            ) : (
              <div className="pt-empty">
                <h2>Nothing upcoming right now</h2>
                <p>
                  When you&apos;re ready, book a new appointment and it will
                  appear here immediately.
                </p>
                <Link href="/booking" className="pt-btn">
                  + Book new appointment
                </Link>
              </div>
            )}

            {(data?.past.length ?? 0) > 0 ? (
              <>
                <h2 className="pt-section-title">Past</h2>
                {data?.past.map((booking) => (
                  <PastCard key={booking.id} booking={booking} />
                ))}
              </>
            ) : null}

            {(data?.cancelled.length ?? 0) > 0 ? (
              <>
                <h2 className="pt-section-title">Cancelled</h2>
                {data?.cancelled.map((booking) => (
                  <PastCard key={booking.id} booking={booking} past />
                ))}
              </>
            ) : null}

            <div className="profile-card">
              <div>
                <div className="pl">Your details</div>
                <strong>{data?.profile?.name ?? "Not available"}</strong>
                <div className="ph">{data?.profile?.phone ?? "Not available"}</div>
              </div>
              <button type="button" className="pt-btn ghost sm">
                Edit
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
