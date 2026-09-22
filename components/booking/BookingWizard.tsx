"use client";

import { useEffect, useState } from "react";
import { BookingProgress } from "@/components/booking/BookingProgress";
import { ConfirmationStep } from "@/components/booking/steps/ConfirmationStep";
import { DateTimeStep } from "@/components/booking/steps/DateTimeStep";
import { DetailsStep } from "@/components/booking/steps/DetailsStep";
import { PaymentStep } from "@/components/booking/steps/PaymentStep";
import { SessionTypeStep } from "@/components/booking/steps/SessionTypeStep";
import { INITIAL_BOOKING, type BookingData, type SessionType } from "@/lib/booking";

const STORAGE_KEY = "clinic-booking-progress";

type StoredState = { step: number; data: BookingData };

function isStoredState(value: unknown): value is StoredState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<StoredState>;
  return (
    typeof candidate.step === "number" &&
    candidate.step >= 1 &&
    candidate.step <= 5 &&
    typeof candidate.data === "object" &&
    candidate.data !== null
  );
}

export function BookingWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingData>(INITIAL_BOOKING);
  const [restored, setRestored] = useState(false);

  // Restore any in-progress booking so refreshing mid-flow doesn't lose it.
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (isStoredState(parsed)) {
          // Syncing initial state in from sessionStorage (an external
          // system), same pattern as this codebase's other fetch-on-mount
          // effects.
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setStep(parsed.step);
          setData(parsed.data);
        }
      }
    } catch {
      // Storage unavailable or corrupted — just start fresh.
    } finally {
      setRestored(true);
    }
  }, []);

  // Persist on every change, but only once the initial restore has run —
  // otherwise this would immediately overwrite saved progress with the
  // blank starting state before it's had a chance to load.
  useEffect(() => {
    if (!restored) return;
    try {
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
    } catch {
      // Storage unavailable (private browsing, quota) — progress just won't persist.
    }
  }, [restored, step, data]);

  function patch(partial: Partial<BookingData>) {
    setData((prev) => ({ ...prev, ...partial }));
  }

  function go(next: number) {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <>
      <BookingProgress currentStep={step} />
      <div className="booking-wrap">
        <div className="booking-card">
          {step === 1 && (
            <SessionTypeStep
              selected={data.sessionType}
              onSelect={(type: SessionType, label: string, payNow: number) =>
                patch({
                  sessionType: type,
                  sessionLabel: label,
                  payNow,
                  // Online always pays now; in-person picks an amount on the payment step
                  paymentMethod: type === "online" ? "Bank" : null,
                  bookingId: null,
                  amountPaid: 0,
                })
              }
              onNext={() => go(2)}
            />
          )}
          {step === 2 && (
            <DateTimeStep
              sessionType={data.sessionType}
              selectedDate={data.date}
              selectedTime={data.time}
              selectedTimeLabel={data.timeLabel}
              onSelectDate={(date) => patch({ date, time: null, timeLabel: null })}
              onSelectTime={(time, timeLabel) => patch({ time, timeLabel })}
              onBack={() => go(1)}
              onNext={() => go(3)}
            />
          )}
          {step === 3 && (
            <DetailsStep
              data={data}
              onChange={patch}
              onBack={() => go(2)}
              onNext={() => go(4)}
            />
          )}
          {step === 4 && (
            <PaymentStep
              data={data}
              onSelectAmount={(amount) =>
                patch({ payNow: amount, paymentMethod: "Bank" })
              }
              onBack={() => go(3)}
              onConfirm={({ bookingId, amountPaid }) => {
                patch({ bookingId, amountPaid });
                go(5);
              }}
              onSlotTaken={() => {
                patch({ time: null, timeLabel: null });
                go(2);
              }}
            />
          )}
          {step === 5 && <ConfirmationStep data={data} />}
        </div>
      </div>
    </>
  );
}
