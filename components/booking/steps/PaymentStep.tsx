"use client";

import { useState } from "react";
import type { BookingData, BookingStatus, PaymentMethod } from "@/lib/booking";
import { formatMoney } from "@/lib/booking";
import {
  ApiError,
  createBooking,
  createPayment,
  fetchBooking,
} from "@/lib/booking-api";
import { siteConfig } from "@/lib/site-config";

type Props = {
  data: BookingData;
  onSelectMethod: (method: PaymentMethod) => void;
  onSetStatus: (status: BookingStatus) => void;
  onBack: () => void;
  onConfirm: (result: {
    bookingId: number;
    bookingStatus: BookingStatus;
    amountPaid: number;
  }) => void;
  onSlotTaken: () => void;
};

const onlineMethods: {
  id: PaymentMethod;
  title: string;
  subtitle: string;
  badge: string;
  color: string;
}[] = [
  { id: "Card", title: "Debit / Credit Card", subtitle: "Visa, MasterCard — instant", badge: "💳", color: "#2C4636" },
  { id: "JazzCash", title: "JazzCash", subtitle: "Mobile wallet", badge: "Jazz\nCash", color: "#D81E27" },
  { id: "EasyPaisa", title: "Easypaisa", subtitle: "Mobile wallet", badge: "Easy\npaisa", color: "#3AA935" },
  { id: "Bank", title: "Bank / Raast", subtitle: "Instant transfer", badge: "🏦", color: "#4A6FA5" },
];

export function PaymentStep({
  data,
  onSelectMethod,
  onSetStatus,
  onBack,
  onConfirm,
  onSlotTaken,
}: Props) {
  const [processing, setProcessing] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);

  const isInPerson = data.sessionType === "in-person";
  const isOnline = data.sessionType === "online";
  const isPayOnArrival = data.bookingStatus === "tentative";
  const wantsPayNow = isOnline || data.bookingStatus === "confirmed";
  const remain = siteConfig.consultationFee - data.payNow;

  async function handlePay() {
    if (!data.date || !data.time || !data.sessionType) return;
    if (wantsPayNow && !data.paymentMethod) return;
    if (isInPerson && !data.bookingStatus) return;

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

      if (isPayOnArrival) {
        onConfirm({
          bookingId: booking.id,
          bookingStatus: "tentative",
          amountPaid: 0,
        });
        return;
      }

      // Path A — pay now (simulate gateway success)
      const amount =
        data.sessionType === "online"
          ? siteConfig.onlineFullFee
          : siteConfig.inPersonReserveFee;

      await createPayment({
        bookingId: booking.id,
        amount,
        method: data.paymentMethod!,
      });

      const confirmed = await fetchBooking(booking.id);
      onConfirm({
        bookingId: confirmed.id,
        bookingStatus: "confirmed",
        amountPaid: Number(confirmed.amount_paid),
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
        <h2>
          {isPayOnArrival
            ? "Registering your booking…"
            : "Confirming your payment…"}
        </h2>
        <p className="sub">Please wait a moment. Do not close this window.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {isInPerson && (
        <div className="payment-mode-chooser">
          <h2>How would you like to secure your slot?</h2>
          <p className="sub">
            Choose whether to reserve online now or pay when you arrive.
          </p>

          <div className="type-grid" style={{ marginBottom: 24 }}>
            <button
              type="button"
              className={`type-opt${data.bookingStatus === "confirmed" ? " selected" : ""}`}
              onClick={() => onSetStatus("confirmed")}
            >
              <div className="type-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D5C48" strokeWidth="2">
                  <rect x="4" y="10" width="16" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              </div>
              <h3>Reserve online</h3>
              <p>
                Pay {formatMoney(siteConfig.inPersonReserveFee, siteConfig.currency)}{" "}
                now to guarantee your slot
              </p>
              <div className="type-fee">Adjusted in total fee at clinic</div>
            </button>

            <button
              type="button"
              className={`type-opt${data.bookingStatus === "tentative" ? " selected" : ""}`}
              onClick={() => onSetStatus("tentative")}
            >
              <div className="type-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#3D5C48" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <h3>Pay on arrival</h3>
              <p>No payment now — pay full fee at the clinic</p>
              <div className="type-fee" style={{ color: "var(--muted)" }}>
                Tentative booking
              </div>
            </button>
          </div>

          {isPayOnArrival && (
            <div className="bump-warning">
              <div className="bump-warning-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
              <div>
                <strong>Your slot is booked but not fully secured.</strong>
                <p>
                  If another patient reserves this time by paying online, your
                  booking may be replaced. To guarantee your slot, reserve now
                  with{" "}
                  <strong>
                    {formatMoney(siteConfig.inPersonReserveFee, siteConfig.currency)}
                  </strong>{" "}
                  (adjusted in your total fee).
                </p>
                <button
                  type="button"
                  className="btn"
                  style={{ marginTop: 12 }}
                  onClick={() => onSetStatus("confirmed")}
                >
                  Reserve online instead →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {wantsPayNow && (
        <>
          <span className="reserve-tag">
            {isOnline ? "FULL PAYMENT" : "RESERVE YOUR SLOT"}
          </span>
          <h2 style={{ marginTop: 8 }}>Confirm &amp; reserve</h2>
          <p className="sub">
            Your slot is held for 15 minutes while you complete payment.
          </p>

          <div className="fee-box">
            <div className="fee-line">
              <span>Consultation fee</span>
              <span>
                {formatMoney(siteConfig.consultationFee, siteConfig.currency)}
              </span>
            </div>
            {!isOnline && (
              <div className="fee-line">
                <span>Pay at clinic</span>
                <span>{formatMoney(remain, siteConfig.currency)}</span>
              </div>
            )}
            <div className="fee-line total">
              <span>Pay now to reserve</span>
              <strong>{formatMoney(data.payNow, siteConfig.currency)}</strong>
            </div>
          </div>

          <div className="pay-methods-label">Choose payment method</div>
          <div className="pay-methods">
            {onlineMethods.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`pay-opt${data.paymentMethod === m.id ? " selected" : ""}`}
                onClick={() => onSelectMethod(m.id)}
              >
                <div className="pay-logo" style={{ background: m.color }}>
                  {m.badge}
                </div>
                <div>
                  <h4>{m.title}</h4>
                  <p>{m.subtitle}</p>
                </div>
              </button>
            ))}
          </div>

          <div className="secure-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6A7169" strokeWidth="2">
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 0 1 8 0v3" />
            </svg>
            Secure payment · Demo mode (no real charge)
          </div>

          <div className="cancel-policy">
            <strong style={{ color: "var(--forest)" }}>Flexible &amp; fair:</strong>{" "}
            Reschedule free up to 24 hours before your appointment — your
            payment carries over to the new date. This amount is adjusted in
            your total consultation fee.
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

        {isPayOnArrival ? (
          <button type="button" className="btn" onClick={handlePay}>
            Confirm tentative booking →
          </button>
        ) : (
          <button
            type="button"
            className="btn"
            disabled={
              (isInPerson && !data.bookingStatus) ||
              (wantsPayNow && !data.paymentMethod)
            }
            onClick={handlePay}
          >
            Pay &amp; Reserve →
          </button>
        )}
      </div>
    </div>
  );
}
