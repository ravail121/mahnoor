"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  apiTimeToHHMM,
  fetchAvailability,
  formatApiTime,
  formatDisplayDate,
} from "@/lib/booking-api";

type SessionType = "in_person" | "online";

type Props = {
  bookingId: number;
  canEdit: boolean;
  initialDate: string;
  initialTime: string;
  initialSessionType: SessionType;
  initialNotes: string;
  doctorId: number;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };

function parsePayload<T>(payload: ApiSuccess<T> | ApiFailure) {
  if (!payload.success) throw new Error(payload.error);
  return payload.data;
}

export function PatientBookingEditor({
  bookingId,
  canEdit,
  initialDate,
  initialTime,
  initialSessionType,
  initialNotes,
  doctorId,
}: Props) {
  const router = useRouter();
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState(initialTime);
  const [sessionType, setSessionType] = useState(initialSessionType);
  const [notes, setNotes] = useState(initialNotes);
  const [slots, setSlots] = useState<{ hhmm: string; label: string }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!canEdit || !date) return;
    let cancelled = false;
    setLoadingSlots(true);
    fetchAvailability(date, {
      doctorId,
      excludeBookingId: bookingId,
    })
      .then((data) => {
        if (cancelled) return;
        const next = data.map((slot) => ({
          hhmm: apiTimeToHHMM(slot.time_slot),
          label: formatApiTime(slot.time_slot),
        }));
        setSlots(next);
        setTime((current) => {
          if (next.some((slot) => slot.hhmm === current)) return current;
          if (
            date === initialDate &&
            next.some((slot) => slot.hhmm === initialTime)
          ) {
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
  }, [bookingId, canEdit, date, doctorId, initialDate, initialTime]);

  async function save(event: FormEvent) {
    event.preventDefault();
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
          notes,
        }),
      });
      const payload = (await response.json()) as
        | ApiSuccess<unknown>
        | ApiFailure;
      parsePayload(payload);
      setNotice("Your appointment was updated.");
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update this appointment",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="rounded-[24px] border border-[rgba(61,92,72,0.1)] bg-white p-5 shadow-[0_14px_44px_-34px_rgba(44,70,54,0.35)]">
        <h2 className="font-serif text-2xl text-forest">Changes locked</h2>
        <p className="mt-3 text-sm text-muted">
          Appointments cannot be edited within 3 hours of the visit. Contact the
          clinic if you need help.
        </p>
      </div>
    );
  }

  return (
    <form
      className="pt-form rounded-[24px] border border-[rgba(61,92,72,0.1)] bg-white p-5 shadow-[0_14px_44px_-34px_rgba(44,70,54,0.35)]"
      onSubmit={(event) => void save(event)}
    >
      <h2 className="font-serif text-2xl text-forest">Edit appointment</h2>
      <p className="text-sm font-normal text-muted">
        You can change date, time, session type, or notes until 3 hours before
        your visit. New times must also be at least 3 hours from now.
      </p>
      {notice ? <div className="pt-notice ok">{notice}</div> : null}
      {error ? <div className="pt-notice err">{error}</div> : null}

      <label>
        Date
        <input
          type="date"
          min={new Date().toISOString().slice(0, 10)}
          value={date}
          onChange={(event) => setDate(event.target.value)}
        />
      </label>

      <label>
        Time
        <select
          value={time}
          onChange={(event) => setTime(event.target.value)}
          disabled={loadingSlots || slots.length === 0}
        >
          {loadingSlots ? (
            <option>Loading slots...</option>
          ) : slots.length === 0 ? (
            <option value={time}>
              No times at least 3 hours from now on {formatDisplayDate(date)}
            </option>
          ) : (
            slots.map((slot) => (
              <option key={slot.hhmm} value={slot.hhmm}>
                {slot.label}
              </option>
            ))
          )}
        </select>
      </label>

      <label>
        Session
        <select
          value={sessionType}
          onChange={(event) =>
            setSessionType(event.target.value as SessionType)
          }
        >
          <option value="in_person">In-person</option>
          <option value="online">Online</option>
        </select>
      </label>

      <label>
        Visit notes
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
        />
      </label>

      <button type="submit" className="pt-btn" disabled={saving || !time}>
        {saving ? "Saving..." : "Save changes"}
      </button>
    </form>
  );
}
