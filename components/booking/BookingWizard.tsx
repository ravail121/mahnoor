"use client";

import { useState } from "react";
import { BookingProgress } from "@/components/booking/BookingProgress";
import { ConfirmationStep } from "@/components/booking/steps/ConfirmationStep";
import { DateTimeStep } from "@/components/booking/steps/DateTimeStep";
import { DetailsStep } from "@/components/booking/steps/DetailsStep";
import { PaymentStep } from "@/components/booking/steps/PaymentStep";
import { SessionTypeStep } from "@/components/booking/steps/SessionTypeStep";
import {
  INITIAL_BOOKING,
  type BookingData,
  type BookingStatus,
  type PaymentMethod,
  type SessionType,
} from "@/lib/booking";
import { siteConfig } from "@/lib/site-config";

export function BookingWizard() {
  const [step, setStep] = useState(1);
  const [data, setData] = useState<BookingData>(INITIAL_BOOKING);

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
                  // Online always pays now; in-person chooses on payment step
                  bookingStatus: type === "online" ? "confirmed" : null,
                  paymentMethod: null,
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
              onSelectMethod={(method: PaymentMethod) =>
                patch({ paymentMethod: method })
              }
              onSetStatus={(status: BookingStatus) => {
                if (status === "tentative") {
                  patch({
                    bookingStatus: status,
                    paymentMethod: null,
                    payNow: 0,
                  });
                } else {
                  patch({
                    bookingStatus: status,
                    paymentMethod: null,
                    payNow:
                      data.sessionType === "in-person"
                        ? siteConfig.inPersonReserveFee
                        : siteConfig.onlineFullFee,
                  });
                }
              }}
              onBack={() => go(3)}
              onConfirm={({ bookingId, bookingStatus, amountPaid }) => {
                patch({ bookingId, bookingStatus, amountPaid });
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
