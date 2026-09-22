"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  apiTimeToHHMM,
  fetchAvailability,
  formatApiTime,
  formatDisplayDate,
} from "@/lib/booking-api";

type BookingStatus = "tentative" | "confirmed" | "cancelled" | "completed";
type SessionType = "in_person" | "online";

type ResponseShape = {
  success: boolean;
  error?: string;
  data?: {
    bumped?: unknown[];
  };
};

export function AdminBookingActions({
  bookingId,
  status,
  doctorId,
  initialDate,
  initialTime,
  initialSessionType,
}: {
  bookingId: number;
  status: BookingStatus;
  doctorId: number;
  /** YYYY-MM-DD */
  initialDate: string;
  /** HH:MM (24h) */
  initialTime: string;
  initialSessionType: SessionType;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<BookingStatus | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const [rescheduling, setRescheduling] = useState(false);
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [sessionType, setSessionType] = useState<SessionType>(initialSessionType);
  const [slots, setSlots] = useState<{ hhmm: string; label: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!rescheduling || !date) return;
    let cancelled = false;
    setLoadingSlots(true);
    fetchAvailability(date, { doctorId, excludeBookingId: bookingId })
      .then((data) => {
        if (cancelled) return;
        const next = data.map((slot) => ({
          hhmm: apiTimeToHHMM(slot.time_slot),
          label: formatApiTime(slot.time_slot),
        }));
        setSlots(next);
        setTime((current) => {
          if (next.some((slot) => slot.hhmm === current)) return current;
          if (date === initialDate && next.some((slot) => slot.hhmm === initialTime)) {
            return initialTime;
          }
          return next[0]?.hhmm ?? current;
        });
      })
      .catch((loadError: Error) => {
        if (!cancelled) setError(loadError.message);
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });
    return () => {
      cancelled = true;
    };
  }, [rescheduling, date, doctorId, bookingId, initialDate, initialTime]);

  async function updateStatus(nextStatus: BookingStatus) {
    setLoading(nextStatus);
    setNotice("");
    setError("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = (await response.json()) as ResponseShape;
      if (!payload.success) {
        throw new Error(payload.error ?? "Could not update booking");
      }

      const bumpedCount = payload.data?.bumped?.length ?? 0;
      setNotice(
        nextStatus === "confirmed" && bumpedCount > 0
          ? `Booking confirmed. ${bumpedCount} tentative booking(s) on the same slot were cancelled.`
          : `Booking marked as ${nextStatus}.`,
      );
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update booking",
      );
    } finally {
      setLoading(null);
    }
  }

  async function saveReschedule() {
    setSaving(true);
    setNotice("");
    setError("");

    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          time_slot: time,
          session_type: sessionType,
        }),
      });
      const payload = (await response.json()) as ResponseShape;
      if (!payload.success) {
        throw new Error(payload.error ?? "Could not reschedule booking");
      }
      setNotice("Booking rescheduled.");
      setRescheduling(false);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not reschedule booking",
      );
    } finally {
      setSaving(false);
    }
  }

  const canReschedule = status !== "cancelled" && status !== "completed";

  return (
    <>
      <h3>Manage booking</h3>
      <div className="action-btn-col">
        {status !== "confirmed" && status !== "cancelled" ? (
          <button
            type="button"
            className="btn"
            disabled={loading !== null}
            onClick={() => void updateStatus("confirmed")}
          >
            {loading === "confirmed" ? "Confirming..." : "Confirm booking"}
          </button>
        ) : null}

        {status !== "completed" && status !== "cancelled" ? (
          <button
            type="button"
            className="btn ghost"
            disabled={loading !== null}
            onClick={() => void updateStatus("completed")}
          >
            {loading === "completed" ? "Saving..." : "Mark as completed"}
          </button>
        ) : null}

        {canReschedule ? (
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              setRescheduling((open) => !open);
              setNotice("");
              setError("");
              setDate(initialDate);
              setTime(initialTime);
              setSessionType(initialSessionType);
            }}
          >
            {rescheduling ? "Close" : "Reschedule"}
          </button>
        ) : null}

        {status !== "cancelled" ? (
          <button
            type="button"
            className="btn danger"
            disabled={loading !== null}
            onClick={() => void updateStatus("cancelled")}
          >
            {loading === "cancelled" ? "Cancelling..." : "Cancel booking"}
          </button>
        ) : null}
      </div>

      {rescheduling && (
        <div className="reschedule-form">
          <div>
            <label htmlFor="resched-date">Date</label>
            <input
              id="resched-date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </div>

          <div>
            <label htmlFor="resched-time">Time</label>
            <select
              id="resched-time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              disabled={loadingSlots || slots.length === 0}
            >
              {loadingSlots ? (
                <option>Loading slots...</option>
              ) : slots.length === 0 ? (
                <option value={time}>
                  No open slots on {formatDisplayDate(date)}
                </option>
              ) : (
                slots.map((slot) => (
                  <option key={slot.hhmm} value={slot.hhmm}>
                    {slot.label}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label htmlFor="resched-session">Session</label>
            <select
              id="resched-session"
              value={sessionType}
              onChange={(event) => setSessionType(event.target.value as SessionType)}
            >
              <option value="in_person">In-person</option>
              <option value="online">Online</option>
            </select>
          </div>

          <button
            type="button"
            className="btn sm"
            disabled={saving || !time}
            onClick={() => void saveReschedule()}
          >
            {saving ? "Saving..." : "Save new date & time"}
          </button>
        </div>
      )}

      {notice ? <p className="notice-ok">{notice}</p> : null}
      {error ? <p className="notice-err">{error}</p> : null}
    </>
  );
}
