"use client";

import { useMemo, useState } from "react";
import {
  addMonths,
  buildMonthGrid,
  formatDateInput,
  getMonthTitle,
  isSameDate,
  startOfMonth,
} from "@/lib/schedule";

/** Visual weekday open / weekend blocked pattern matching the design mockup. */
function dayTone(date: Date, inMonth: boolean) {
  if (!inMonth) return "dim";
  const day = date.getDay(); // 0 Sun … 6 Sat
  if (day === 0) return "dim"; // blocked Sundays
  if (day >= 1 && day <= 5) return "open";
  return "plain"; // Saturday — no open dot in mockup style
}

export function AdminDashboardMiniCal({
  bookedDates = [],
}: {
  bookedDates?: string[];
}) {
  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => startOfMonth(today));
  const booked = useMemo(() => new Set(bookedDates), [bookedDates]);
  const cells = buildMonthGrid(month);

  return (
    <div className="card">
      <div className="mini-cal-head">
        <button
          type="button"
          className="mini-nav"
          aria-label="Previous month"
          onClick={() => setMonth((current) => addMonths(current, -1))}
        >
          ‹
        </button>
        <strong>{getMonthTitle(month)}</strong>
        <button
          type="button"
          className="mini-nav"
          aria-label="Next month"
          onClick={() => setMonth((current) => addMonths(current, 1))}
        >
          ›
        </button>
      </div>

      <div className="mini-grid" aria-label={getMonthTitle(month)}>
        {["M", "T", "W", "T", "F", "S", "S"].map((label, index) => (
          <div key={`${label}-${index}`} className="d">
            {label}
          </div>
        ))}
        {cells.map((date) => {
          const key = formatDateInput(date);
          const inMonth = date.getMonth() === month.getMonth();
          const isToday = isSameDate(date, today);
          const tone = dayTone(date, inMonth);
          const hasBooked = booked.has(key);
          const classes = [
            "mini-day",
            tone === "dim" ? "dim" : "",
            isToday ? "today" : "",
            tone === "open" ? "has-open" : "",
            hasBooked ? "has-booked" : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <div
              key={key}
              className={classes}
              aria-current={isToday ? "date" : undefined}
            >
              {date.getDate()}
            </div>
          );
        })}
      </div>

      <div className="legend">
        <span>
          <span className="dot" style={{ background: "var(--sage)" }} />
          Open slots
        </span>
        <span>
          <span className="dot" style={{ background: "var(--sage-deep)" }} />
          Today
        </span>
        <span>
          <span className="dot" style={{ background: "#c8ccc6" }} />
          Blocked
        </span>
      </div>
    </div>
  );
}
