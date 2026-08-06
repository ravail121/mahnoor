"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type BookingStatus = "tentative" | "confirmed" | "cancelled" | "completed";

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
}: {
  bookingId: number;
  status: BookingStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<BookingStatus | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

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

      {notice ? <p className="notice-ok">{notice}</p> : null}
      {error ? <p className="notice-err">{error}</p> : null}
    </>
  );
}
