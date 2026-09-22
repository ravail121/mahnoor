"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatTimeDisplay } from "@/lib/schedule";

type PatientBooking = {
  id: number;
  date: string;
  time_slot: string;
  session_type: "in_person" | "online";
  status: "tentative" | "confirmed" | "cancelled" | "completed";
};

type PatientDetail = {
  id: number;
  name: string;
  phone: string;
  age: number | null;
  total_visits: number;
  first_seen: string;
  last_visit: string | null;
  bookings: PatientBooking[];
};

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };

function parsePayload<T>(payload: ApiSuccess<T> | ApiFailure) {
  if (!payload.success) throw new Error(payload.error);
  return payload.data;
}

function initialOf(name: string) {
  return (name.trim().charAt(0) || "?").toUpperCase();
}

function formatMonthYear(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDayMonth(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

function formatShortDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function statusLabel(status: PatientBooking["status"]) {
  if (status === "tentative") return "Awaiting verification";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

export function AdminPatientDetail({
  initialPatient,
}: {
  initialPatient: PatientDetail;
}) {
  const router = useRouter();
  const [patient, setPatient] = useState(initialPatient);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [name, setName] = useState(initialPatient.name);
  const [phone, setPhone] = useState(initialPatient.phone);
  const [age, setAge] = useState(
    initialPatient.age == null ? "" : String(initialPatient.age),
  );

  async function saveDetails() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/patients/${patient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          phone,
          age: age === "" ? null : Number(age),
        }),
      });
      const payload = (await response.json()) as
        | ApiSuccess<{
            id: number;
            name: string;
            phone: string;
            age: number | null;
          }>
        | ApiFailure;
      const updated = parsePayload(payload);
      setPatient((current) => ({
        ...current,
        name: updated.name,
        phone: updated.phone,
        age: updated.age,
      }));
      setEditing(false);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Could not update patient",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="patient-detail">
      <Link href="/admin/patients" className="back">
        ← Back to patients
      </Link>

      <div className="patients-detail-grid">
        <div className="card pt-profile">
          <div className="big-av">{initialOf(patient.name)}</div>
          <h2>{patient.name}</h2>
          <div className="ph">{patient.phone}</div>

          <div className="pt-meta-row">
            <span className="lab">Age</span>
            <span className="val">
              {patient.age != null ? `${patient.age} years` : "—"}
            </span>
          </div>
          <div className="pt-meta-row">
            <span className="lab">Total visits</span>
            <span className="val">{patient.total_visits}</span>
          </div>
          <div className="pt-meta-row">
            <span className="lab">First seen</span>
            <span className="val">{formatMonthYear(patient.first_seen)}</span>
          </div>
          <div className="pt-meta-row">
            <span className="lab">Last visit</span>
            <span className="val">{formatShortDate(patient.last_visit)}</span>
          </div>

          <div className="edit-btn-wrap">
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => {
                setEditing((open) => !open);
                setError("");
                setName(patient.name);
                setPhone(patient.phone);
                setAge(patient.age == null ? "" : String(patient.age));
              }}
            >
              {editing ? "Close" : "Edit details"}
            </button>
          </div>

          {editing ? (
            <div className="patient-edit-form">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Name"
              />
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Phone"
              />
              <input
                type="number"
                min={0}
                max={120}
                value={age}
                onChange={(event) => setAge(event.target.value)}
                placeholder="Age"
              />
              <button
                type="button"
                className="btn sm"
                disabled={saving}
                onClick={() => void saveDetails()}
              >
                {saving ? "Saving..." : "Save changes"}
              </button>
              {error ? <p className="notice-err">{error}</p> : null}
            </div>
          ) : null}
        </div>

        <div className="card">
          <div className="history-head">
            <h3>Booking history</h3>
          </div>

          {patient.bookings.length === 0 ? (
            <p className="table-empty" style={{ padding: "8px 0" }}>
              No bookings yet for this patient.
            </p>
          ) : (
            patient.bookings.map((booking) => {
              const online = booking.session_type === "online";
              return (
                <Link
                  key={booking.id}
                  href={`/admin/bookings/${booking.id}`}
                  className="hist-item"
                >
                  <div className="hist-date">
                    {formatDayMonth(booking.date)}
                    <br />
                    {formatTimeDisplay(new Date(booking.time_slot))}
                  </div>
                  <div className="hist-body">
                    <div className="t">
                      {online ? "Online video session" : "In-person visit"}
                    </div>
                    <span className={`type-pill ${online ? "online" : "inperson"}`}>
                      {online ? "▶ Online" : "◈ In-person"}
                    </span>
                  </div>
                  <span className={`status ${booking.status}`}>
                    {statusLabel(booking.status)}
                  </span>
                </Link>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
