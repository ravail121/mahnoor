"use client";

import { useEffect, useMemo, useState } from "react";
import type { SessionType } from "@/lib/booking";
import {
  apiTimeToHHMM,
  fetchAvailability,
  formatApiTime,
  formatDisplayDate,
  toIsoDate,
} from "@/lib/booking-api";

type Props = {
  sessionType: SessionType | null;
  selectedDate: string | null;
  selectedTime: string | null;
  selectedTimeLabel: string | null;
  onSelectDate: (dateIso: string) => void;
  onSelectTime: (timeHHMM: string, timeLabel: string) => void;
  onBack: () => void;
  onNext: () => void;
};

const DOW = ["MO", "TU", "WE", "TH", "FR", "SA", "SU"] as const;

function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function DateTimeStep({
  selectedDate,
  selectedTime,
  onSelectDate,
  onSelectTime,
  onBack,
  onNext,
}: Props) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [slots, setSlots] = useState<{ hhmm: string; label: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const days = useMemo(() => {
    const firstDow = new Date(viewYear, viewMonth, 1).getDay();
    const offset = (firstDow + 6) % 7;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const cells: {
      day: number | null;
      past: boolean;
      off: boolean;
      isToday: boolean;
      iso: string;
    }[] = [];

    for (let i = 0; i < offset; i++) {
      cells.push({ day: null, past: true, off: true, isToday: false, iso: "" });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(viewYear, viewMonth, d);
      const isSunday = date.getDay() === 0;
      const isPast =
        date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isToday =
        date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate();
      cells.push({
        day: d,
        past: isPast,
        off: isSunday,
        isToday,
        iso: toIsoDate(viewYear, viewMonth, d),
      });
    }
    return cells;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewYear, viewMonth]);

  useEffect(() => {
    if (!selectedDate) {
      setSlots([]);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAvailability(selectedDate)
      .then((data) => {
        if (cancelled) return;
        setSlots(
          data.map((s) => ({
            hhmm: apiTimeToHHMM(s.time_slot),
            label: formatApiTime(s.time_slot),
          })),
        );
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setSlots([]);
        setError(err.message || "Could not load slots. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedDate]);

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  return (
    <div className="animate-fade-up">
      <h2>Pick a date &amp; time</h2>
      <p className="sub">
        Only available slots are shown — booked times disappear automatically.
      </p>

      <div className="cal-head">
        <button
          type="button"
          className="cal-nav"
          aria-label="Previous month"
          onClick={() => shiftMonth(-1)}
        >
          ‹
        </button>
        <strong>{monthLabel(viewYear, viewMonth)}</strong>
        <button
          type="button"
          className="cal-nav"
          aria-label="Next month"
          onClick={() => shiftMonth(1)}
        >
          ›
        </button>
      </div>

      <div className="cal-grid">
        {DOW.map((d) => (
          <div className="dow" key={d}>
            {d}
          </div>
        ))}
        {days.map((cell, i) => {
          if (cell.day === null) return <div key={`empty-${i}`} />;
          const disabled = cell.past || cell.off;
          const classes = [
            "day",
            cell.past ? "past" : "",
            cell.off ? "off" : "",
            cell.isToday ? "today" : "",
            selectedDate === cell.iso ? "selected" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={cell.iso}
              type="button"
              className={classes}
              disabled={disabled}
              onClick={() => onSelectDate(cell.iso)}
            >
              {cell.day}
            </button>
          );
        })}
      </div>

      {selectedDate && (
        <div>
          <div className="slots-label">
            Available times — {formatDisplayDate(selectedDate)}
          </div>

          {loading && (
            <div className="pay-processing" style={{ padding: "20px 0" }}>
              <div className="spinner" />
              <p className="sub" style={{ marginBottom: 0 }}>
                Loading available times…
              </p>
            </div>
          )}

          {!loading && error && (
            <div className="bump-warning" style={{ marginTop: 12 }}>
              <div className="bump-warning-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </div>
              <div>
                <strong>Couldn&apos;t load slots</strong>
                <p>{error}</p>
                <button
                  type="button"
                  className="btn ghost"
                  style={{ marginTop: 10 }}
                  onClick={() => onSelectDate(selectedDate)}
                >
                  Retry
                </button>
              </div>
            </div>
          )}

          {!loading && !error && slots.length === 0 && (
            <p className="sub" style={{ marginTop: 8 }}>
              No slots available for this day — please pick another date.
            </p>
          )}

          {!loading && !error && slots.length > 0 && (
            <div className="slots">
              {slots.map((slot) => {
                const isSelected = selectedTime === slot.hhmm;
                return (
                  <button
                    key={slot.hhmm}
                    type="button"
                    className={`slot${isSelected ? " selected" : ""}`}
                    onClick={() => onSelectTime(slot.hhmm, slot.label)}
                  >
                    {slot.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="btn-row">
        <button type="button" className="btn ghost" onClick={onBack}>
          ← Back
        </button>
        <button
          type="button"
          className="btn"
          disabled={!selectedDate || !selectedTime || loading}
          onClick={onNext}
        >
          Continue →
        </button>
      </div>
    </div>
  );
}
