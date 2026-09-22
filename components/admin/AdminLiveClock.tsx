"use client";

import { useEffect, useState } from "react";

function formatDate(now: Date) {
  return now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatTime(now: Date) {
  return now.toLocaleTimeString("en-PK", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}

export function AdminLiveClock() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const hours = now?.getHours() ?? 0;
  const minutes = now?.getMinutes() ?? 0;
  const seconds = now?.getSeconds() ?? 0;
  const hourDeg = ((hours % 12) + minutes / 60) * 30;
  const minuteDeg = (minutes + seconds / 60) * 6;
  const secondDeg = seconds * 6;

  return (
    <div className="live-clock" aria-live="polite">
      <div className="live-clock-face" aria-hidden="true">
        {Array.from({ length: 12 }, (_, index) => (
          <span
            key={index}
            className={`live-clock-tick${index % 3 === 0 ? " major" : ""}`}
            style={{ transform: `rotate(${index * 30}deg)` }}
          />
        ))}
        <span
          className="live-clock-hand hour"
          style={{ transform: `rotate(${hourDeg}deg)` }}
        />
        <span
          className="live-clock-hand minute"
          style={{ transform: `rotate(${minuteDeg}deg)` }}
        />
        <span
          className="live-clock-hand second"
          style={{ transform: `rotate(${secondDeg}deg)` }}
        />
        <span className="live-clock-cap" />
      </div>
      <div className="live-clock-copy">
        <div className="live-clock-label">Today</div>
        <div className="live-clock-date">
          {now ? formatDate(now) : "Loading date"}
        </div>
        <div className="live-clock-time">
          {now ? formatTime(now) : "--:--:--"}
        </div>
      </div>
    </div>
  );
}
