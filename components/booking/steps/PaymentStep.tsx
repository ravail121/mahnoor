"use client";

import { useState } from "react";
import type { BookingData } from "@/lib/booking";
import { formatMoney } from "@/lib/booking";
import { ApiError, createBooking, createPayment } from "@/lib/booking-api";
import { siteConfig } from "@/lib/site-config";

type Props = {
  data: BookingData;
  onSelectAmount: (amount: number) => void;
  onBack: () => void;
  onConfirm: (result: { bookingId: number; amountPaid: number }) => void;
  onSlotTaken: () => void;
};

export function PaymentStep({
  data,
  onSelectAmount,
  onBack,
  onConfirm,
  onSlotTaken,
}: Props) {
  const [processing, setProcessing] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);

  const isInPerson = data.sessionType === "in-person";
  const isOnline = data.sessionType === "online";
  const readyToPay = isOnline || data.paymentMethod !== null;
  const remain = siteConfig.consultationFee - data.payNow;
  const isFullPayment = data.payNow >= siteConfig.consultationFee;

  async function handlePay() {
    if (!data.date || !data.time || !data.sessionType) {
      setClaimError("Please go back and choose a date and time.");
      setRetryable(false);
      return;
    }
    if (!data.fullName.trim() || !data.phone.trim()) {
      setClaimError("Please go back and enter your name and phone number.");
      setRetryable(false);
      return;
    }
    if (isInPerson && !data.paymentMethod) {
      setClaimError("Choose how much you'd like to pay now.");
      setRetryable(false);
      return;
    }

    setProcessing(true);
    setClaimError(null);
    setRetryable(false);

    try {
      const booking = await createBooking({
        name: data.fullName,
        phone: data.phone,
        age: data.age,
        bookingFor: data.bookingFor,
        sessionType: data.sessionType,
        date: data.date,
        time: data.time,
        notes: data.note,
      });

      const amount = isOnline ? siteConfig.onlineFullFee : data.payNow;

      await createPayment({
        bookingId: booking.id,
        amount,
      });

      onConfirm({
        bookingId: booking.id,
        amountPaid: amount,
      });
    } catch (err) {
      setProcessing(false);
      const message =
        err instanceof Error ? err.message : "Something went wrong. Please try again.";

      if (
        message.toLowerCase().includes("slot already booked") ||
        (err instanceof ApiError && message === "slot already booked")
      ) {
        setClaimError(
          "Sorry, that slot was just booked by someone else. Please choose another time.",
        );
        setRetryable(false);
        // Brief pause so user can read, then send back to step 2
        window.setTimeout(() => onSlotTaken(), 1800);
        return;
      }

      setClaimError(message);
      setRetryable(true);
    }
  }

  if (processing) {
    return (
      <div className="pay-processing animate-fade-up">
        <div className="spinner" />
        <h2>Saving your booking…</h2>
        <p className="sub">Please wait a moment. Do not close this window.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {isInPerson && (
        <div className="payment-mode-chooser">
          <h2>How much would you like to pay now?</h2>
          <p className="sub">
            A minimum of{" "}
            {formatMoney(siteConfig.inPersonReserveFee, siteConfig.currency)} by
            bank transfer secures your slot — or pay the full fee now so
            nothing is due at the clinic.
          </p>

          <div className="type-grid" style={{ marginBottom: 24 }}>
            <button
              type="button"
              className={`type-opt${
                data.paymentMethod && !isFullPayment ? " selected" : ""
              }`}
              onClick={() => onSelectAmount(siteConfig.inPersonReserveFee)}
            >
              <div className="type-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D5C48" strokeWidth="2">
                  <rect x="4" y="10" width="16" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              </div>
              <h3>Reserve minimum</h3>
              <p>
                Send {formatMoney(siteConfig.inPersonReserveFee, siteConfig.currency)}{" "}
                now, pay the rest at the clinic
              </p>
              <div className="type-fee">Adjusted in total fee at clinic</div>
            </button>

            <button
              type="button"
              className={`type-opt${
                data.paymentMethod && isFullPayment ? " selected" : ""
              }`}
              onClick={() => onSelectAmount(siteConfig.consultationFee)}
            >
              <div className="type-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D5C48" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>
              <h3>Pay in full</h3>
              <p>
                Send the full{" "}
                {formatMoney(siteConfig.consultationFee, siteConfig.currency)} now
              </p>
              <div className="type-fee">Nothing due at the clinic</div>
            </button>
          </div>
        </div>
      )}

      {readyToPay && (
        <>
          <span className="reserve-tag">
            {isOnline || isFullPayment ? "FULL PAYMENT" : "RESERVE YOUR SLOT"}
          </span>
          <h2 style={{ marginTop: 8 }}>Confirm &amp; reserve</h2>
          <p className="sub">
            On the next screen, we&apos;ll show you our bank transfer details
            and a WhatsApp link to send your payment screenshot.
          </p>

          <div className="fee-box">
            <div className="fee-line">
              <span>Consultation fee</span>
              <span>
                {formatMoney(siteConfig.consultationFee, siteConfig.currency)}
              </span>
            </div>
            {!isOnline && !isFullPayment && (
              <div className="fee-line">
                <span>Pay at clinic</span>
                <span>{formatMoney(remain, siteConfig.currency)}</span>
              </div>
            )}
            <div className="fee-line total">
              <span>Transfer now</span>
              <strong>
                {formatMoney(isOnline ? siteConfig.onlineFullFee : data.payNow, siteConfig.currency)}
              </strong>
            </div>
          </div>

          <div className="cancel-policy">
            <strong style={{ color: "var(--forest)" }}>What happens next:</strong>{" "}
            We manually verify each transfer against your WhatsApp screenshot.
            Once verified (usually within a few hours), your slot is fully
            secured and any other pending bookings for the same time are
            released.
          </div>
        </>
      )}

      {claimError && (
        <div className="bump-warning" style={{ marginTop: 16 }}>
          <div className="bump-warning-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="12" y1="18" x2="12.01" y2="18" />
            </svg>
          </div>
          <div>
            <strong>Something went wrong</strong>
            <p>{claimError}</p>
            {retryable && (
              <button
                type="button"
                className="btn"
                style={{ marginTop: 12 }}
                onClick={handlePay}
              >
                Retry →
              </button>
            )}
          </div>
        </div>
      )}

      <div className="btn-row" style={{ marginTop: 28 }}>
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Back
        </button>

        <button
          type="button"
          className="btn"
          disabled={isInPerson && !data.paymentMethod}
          onClick={handlePay}
        >
          Reserve my slot →
        </button>
      </div>
    </div>
  );
}
