"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type PatientListItem = {
  id: number;
  name: string;
  phone: string;
  age: number | null;
  booking_count: number;
  last_visit: string | null;
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

function formatShortDate(value: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function visitLabel(count: number) {
  return count === 1 ? "1 visit" : `${count} visits`;
}

export function AdminPatientsPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [rows, setRows] = useState<PatientListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formAge, setFormAge] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    void loadPatients(debouncedQuery);
  }, [debouncedQuery]);

  async function loadPatients(search: string) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      const response = await fetch(`/api/patients?${params.toString()}`);
      const payload = (await response.json()) as
        | ApiSuccess<PatientListItem[]>
        | ApiFailure;
      setRows(parsePayload(payload));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load patients",
      );
    } finally {
      setLoading(false);
    }
  }

  async function createPatient() {
    setSaving(true);
    setFormError("");
    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName,
          phone: formPhone,
          age: formAge === "" ? null : Number(formAge),
        }),
      });
      const payload = (await response.json()) as
        | ApiSuccess<PatientListItem>
        | ApiFailure;
      const created = parsePayload(payload);
      setAdding(false);
      setFormName("");
      setFormPhone("");
      setFormAge("");
      router.push(`/admin/patients/${created.id}`);
    } catch (createError) {
      setFormError(
        createError instanceof Error
          ? createError.message
          : "Could not create patient",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Manage</div>
        <h1>Patients</h1>
      </div>

      <div className="toolbar">
        <div className="search">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or phone…"
            aria-label="Search patients"
          />
        </div>
        <button
          type="button"
          className="btn ghost sm"
          onClick={() => {
            setAdding((open) => !open);
            setFormError("");
          }}
        >
          {adding ? "Cancel" : "+ Add patient"}
        </button>
      </div>

      {adding ? (
        <div className="card patient-add-card">
          <div className="patient-add-grid">
            <input
              type="text"
              placeholder="Full name"
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
            />
            <input
              type="tel"
              placeholder="Phone"
              value={formPhone}
              onChange={(event) => setFormPhone(event.target.value)}
            />
            <input
              type="number"
              placeholder="Age"
              min={0}
              max={120}
              value={formAge}
              onChange={(event) => setFormAge(event.target.value)}
            />
            <button
              type="button"
              className="btn sm"
              disabled={saving}
              onClick={() => void createPatient()}
            >
              {saving ? "Saving..." : "Save patient"}
            </button>
          </div>
          {formError ? <p className="notice-err">{formError}</p> : null}
        </div>
      ) : null}

      <div className="table-card">
        {loading ? (
          <p className="table-empty">Loading patients...</p>
        ) : error ? (
          <p className="table-empty is-error">{error}</p>
        ) : rows.length === 0 ? (
          <p className="table-empty">No patients match your search.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Patient</th>
                <th>Phone</th>
                <th>Age</th>
                <th>Bookings</th>
                <th>Last visit</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  tabIndex={0}
                  role="link"
                  aria-label={`Open ${row.name}`}
                  onClick={() => router.push(`/admin/patients/${row.id}`)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      router.push(`/admin/patients/${row.id}`);
                    }
                  }}
                >
                  <td>
                    <div className="pt-cell">
                      <div className="pt-av">{initialOf(row.name)}</div>
                      <strong>{row.name}</strong>
                    </div>
                  </td>
                  <td className="mono">{row.phone}</td>
                  <td>{row.age ?? "—"}</td>
                  <td>
                    <span className="count-pill">
                      {visitLabel(row.booking_count)}
                    </span>
                  </td>
                  <td className="mono">{formatShortDate(row.last_visit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
