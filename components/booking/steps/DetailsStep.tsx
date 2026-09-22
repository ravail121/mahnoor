"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import type { BookingData, BookingFor } from "@/lib/booking";
import { LockIcon } from "@/components/ui/Icons";

type Props = {
  data: BookingData;
  onChange: (patch: Partial<BookingData>) => void;
  onBack: () => void;
  onNext: () => void;
};

export function DetailsStep({ data, onChange, onBack, onNext }: Props) {
  const { data: session } = useSession();
  const prefilled = useRef(false);
  const canContinue =
    data.fullName.trim().length > 0 && data.phone.trim().length > 0;

  useEffect(() => {
    if (prefilled.current || !session?.user) return;
    const patch: Partial<BookingData> = {};
    if (!data.fullName.trim() && session.user.name) {
      patch.fullName = session.user.name;
    }
    if (!data.phone.trim() && session.user.phone) {
      patch.phone = session.user.phone;
    }
    if (Object.keys(patch).length === 0) return;
    prefilled.current = true;
    onChange(patch);
  }, [session, data.fullName, data.phone, onChange]);

  return (
    <div className="animate-fade-up">
      <h2>Your details</h2>
      <p className="sub">Just the basics — this stays completely private.</p>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="fName">Full name</label>
          <input
            id="fName"
            type="text"
            placeholder="e.g. Ayesha Khan"
            value={data.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="fPhone">Phone / WhatsApp number</label>
          <input
            id="fPhone"
            type="tel"
            placeholder="03xx-xxxxxxx"
            value={data.phone}
            onChange={(e) => onChange({ phone: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="fAge">Age</label>
          <input
            id="fAge"
            type="number"
            placeholder="e.g. 27"
            value={data.age}
            onChange={(e) => onChange({ age: e.target.value })}
          />
        </div>
        <div className="field">
          <label htmlFor="fFor">Booking for</label>
          <select
            id="fFor"
            value={data.bookingFor}
            onChange={(e) =>
              onChange({ bookingFor: e.target.value as BookingFor })
            }
          >
            <option>Myself</option>
            <option>A family member</option>
          </select>
        </div>
        <div className="field full">
          <label htmlFor="fNote">
            What would you like to talk about? <em>(optional)</em>
          </label>
          <textarea
            id="fNote"
            placeholder="Share only if you're comfortable — it helps the doctor prepare."
            value={data.note}
            onChange={(e) => onChange({ note: e.target.value })}
          />
        </div>
      </div>

      <div className="privacy-note">
        <LockIcon size={14} />
        Your information is never shared with anyone.
      </div>

      <div className="btn-row">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Back
        </button>
        <button
          type="button"
          className="btn"
          disabled={!canContinue}
          onClick={onNext}
        >
          Continue to Payment →
        </button>
      </div>
    </div>
  );
}
