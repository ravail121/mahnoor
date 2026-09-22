"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { isBookingEditable } from "@/lib/booking-window";
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
      return "Awaiting verification";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

function UpcomingCard({ booking }: { booking: DashboardBooking }) {
  const { day, mon } = dateParts(booking.date);
  const meta = sessionMeta(booking.session_type);
  const statusClass =
    booking.status === "confirmed" ? "confirmed" : "tentative";
  const editable = isBookingEditable(booking);

  return (
    <Link href={`/dashboard/bookings/${booking.id}`} className="appt-card">
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
        <span className="appt-hint">
          {editable ? "Edit details" : "View details"}
        </span>
      </div>
    </Link>
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
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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

  const profileName = data?.profile?.name ?? session?.user?.name ?? "there";
  const displayFirst = firstName(profileName);

  return (
    <>
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

      {error ? <div className="pt-notice err">{error}</div> : null}

      {loading ? (
        <div className="pt-loading">Loading your appointments...</div>
      ) : (
        <>
          <h2 className="pt-section-title">Upcoming</h2>

          {data?.upcoming.length ? (
            data.upcoming.map((booking) => (
              <UpcomingCard key={booking.id} booking={booking} />
            ))
          ) : (
            <div className="pt-empty">
              <h2>No appointments yet</h2>
              <p>
                Book a visit when you are ready. Your details stay in the left
                panel so you can update your photo, profile, and payment
                methods anytime.
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
        </>
      )}
    </>
  );
}
