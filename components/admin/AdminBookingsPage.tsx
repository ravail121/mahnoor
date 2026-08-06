"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DOCTOR_ID, formatTimeDisplay } from "@/lib/schedule";

type BookingRow = {
  id: number;
  date: string;
  time_slot: string;
  session_type: "in_person" | "online";
  payment_status: "unpaid" | "paid" | "refunded";
  amount_paid: string;
  status: "tentative" | "confirmed" | "cancelled" | "completed";
  patients: {
    name: string;
    phone: string;
  };
};

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "confirmed", label: "Confirmed" },
  { value: "tentative", label: "Pay on arrival" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

function parsePayload<T>(payload: ApiSuccess<T> | ApiFailure) {
  if (!payload.success) throw new Error(payload.error);
  return payload.data;
}

function formatDateLabel(value: string) {
  return new Date(value).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatAmount(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return `Rs ${amount.toLocaleString("en-PK")}`;
}

function statusLabel(status: BookingRow["status"]) {
  if (status === "tentative") return "Pay on arrival";
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function paymentPresentation(row: BookingRow) {
  if (row.status === "cancelled" && row.payment_status === "unpaid") {
    return { className: "unpaid", label: "—", amount: null as string | null };
  }
  if (row.payment_status === "paid") {
    return {
      className: "paid",
      label: "Paid",
      amount: formatAmount(row.amount_paid),
    };
  }
  if (row.payment_status === "refunded") {
    return {
      className: "unpaid",
      label: "Refunded",
      amount: formatAmount(row.amount_paid),
    };
  }
  return {
    className: "unpaid",
    label: row.status === "tentative" ? "Pay on arrival" : "Unpaid",
    amount: null as string | null,
  };
}

export function AdminBookingsPage() {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("all");
  const [sessionType, setSessionType] = useState("all");
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadBookings();
  }, [date, status, sessionType]);

  async function loadBookings() {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        doctor_id: String(DOCTOR_ID),
      });
      if (date) params.set("date", date);
      if (status !== "all") params.set("status", status);
      if (sessionType !== "all") params.set("session_type", sessionType);

      const response = await fetch(`/api/bookings?${params.toString()}`);
      const payload = (await response.json()) as
        | ApiSuccess<BookingRow[]>
        | ApiFailure;
      setRows(parsePayload(payload));
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Could not load bookings",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-head">
        <div className="eyebrow">Manage</div>
        <h1>Bookings</h1>
      </div>

      <div className="filters">
        <div className="filter-tabs" role="tablist" aria-label="Booking status">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              role="tab"
              aria-selected={status === tab.value}
              className={`ftab ${status === tab.value ? "active" : ""}`}
              onClick={() => setStatus(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="filter-right">
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            aria-label="Filter by date"
          />
          <select
            value={sessionType}
            onChange={(event) => setSessionType(event.target.value)}
            aria-label="Filter by session type"
          >
            <option value="all">All types</option>
            <option value="in_person">In-person</option>
            <option value="online">Online</option>
          </select>
        </div>
      </div>

      <div className="table-card">
        {loading ? (
          <p className="table-empty">Loading bookings...</p>
        ) : error ? (
          <p className="table-empty is-error">{error}</p>
        ) : rows.length === 0 ? (
          <p className="table-empty">No bookings match the current filters.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>When</th>
                <th>Patient</th>
                <th>Type</th>
                <th>Payment</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const online = row.session_type === "online";
                const payment = paymentPresentation(row);

                return (
                  <tr
                    key={row.id}
                    onClick={() => router.push(`/admin/bookings/${row.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        router.push(`/admin/bookings/${row.id}`);
                      }
                    }}
                    tabIndex={0}
                    role="link"
                    aria-label={`Open booking for ${row.patients.name}`}
                  >
                    <td className="td-when">
                      {formatTimeDisplay(new Date(row.time_slot))}
                      <small>{formatDateLabel(row.date)}</small>
                    </td>
                    <td className="td-name">
                      <strong>{row.patients.name}</strong>
                      <span>{row.patients.phone}</span>
                    </td>
                    <td>
                      <span className={`type-pill ${online ? "online" : "inperson"}`}>
                        {online ? "▶ Online" : "◈ In-person"}
                      </span>
                    </td>
                    <td>
                      <span className={`pay ${payment.className}`}>
                        {payment.label}
                      </span>
                      {payment.amount ? (
                        <>
                          {" "}
                          <span className="amt">{payment.amount}</span>
                        </>
                      ) : null}
                    </td>
                    <td>
                      <span className={`status ${row.status}`}>
                        {statusLabel(row.status)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
