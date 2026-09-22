"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };

function parsePayload<T>(payload: ApiSuccess<T> | ApiFailure) {
  if (!payload.success) {
    throw new Error(payload.error);
  }
  return payload.data;
}

export function PatientBookingActions({
  bookingId,
  canEdit,
}: {
  bookingId: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function cancelBooking(rebook: boolean) {
    if (!window.confirm("Cancel this appointment?")) return;

    setBusy(true);
    setError("");

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

      if (rebook) {
        router.push("/booking");
        return;
      }

      router.refresh();
      router.push("/dashboard");
    } catch (cancelError) {
      setError(
        cancelError instanceof Error
          ? cancelError.message
          : "Could not cancel this appointment",
      );
    } finally {
      setBusy(false);
    }
  }

  if (!canEdit) {
    return null;
  }

  return (
    <div className="rounded-[24px] border border-[rgba(61,92,72,0.1)] bg-white p-5 shadow-[0_14px_44px_-34px_rgba(44,70,54,0.35)]">
      <h2 className="font-serif text-2xl text-forest">Cancel this booking</h2>
      <p className="mt-3 text-sm text-muted">
        Cancellation is available until 3 hours before your visit.
      </p>
      <div className="mt-5 flex flex-wrap gap-3">
        <Button variant="light" disabled={busy} onClick={() => void cancelBooking(false)}>
          {busy ? "Cancelling..." : "Cancel appointment"}
        </Button>
        <Button
          variant="ghost"
          disabled={busy}
          onClick={() => void cancelBooking(true)}
        >
          Cancel &amp; rebook
        </Button>
      </div>
      {error ? <p className="mt-4 text-sm text-[#8C4646]">{error}</p> : null}
    </div>
  );
}
