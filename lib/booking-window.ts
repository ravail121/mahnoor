const CLINIC_TIMEZONE = "Asia/Karachi";
export const BOOKING_LEAD_MS = 3 * 60 * 60 * 1000;

/** In-person visits are closed these two weekdays; online stays open. getUTCDay(): 5 = Friday, 6 = Saturday. */
const IN_PERSON_CLOSED_WEEKDAYS = new Set([5, 6]);

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

/** date is stored as a UTC-encoded calendar date (see getAppointmentInstant below). */
export function isSessionTypeAllowedOnDate(
  sessionType: "in_person" | "online",
  date: Date | string,
) {
  if (sessionType !== "in_person") return true;
  return !IN_PERSON_CLOSED_WEEKDAYS.has(asDate(date).getUTCDay());
}

export type SessionTypeAvailability = {
  online_enabled: boolean;
  in_person_enabled: boolean;
};

/**
 * Combines the admin's global online/in-person on-off switch with the
 * Friday/Saturday in-person rule. Returns null when the session type is
 * bookable on that date, or a user-facing reason why it isn't.
 */
export function getSessionTypeBlockReason(
  sessionType: "in_person" | "online",
  date: Date | string,
  doctor: SessionTypeAvailability,
): string | null {
  const globallyEnabled =
    sessionType === "online" ? doctor.online_enabled : doctor.in_person_enabled;
  if (!globallyEnabled) {
    return sessionType === "online"
      ? "Online bookings are currently closed."
      : "In-person bookings are currently closed.";
  }
  if (!isSessionTypeAllowedOnDate(sessionType, date)) {
    return "In-person visits aren't available on Fridays or Saturdays — please choose an online session or a different day.";
  }
  return null;
}

function partNumber(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
) {
  return Number(parts.find((part) => part.type === type)?.value);
}

/** Current Lahore clock time, encoded the same way slots are stored (UTC wall-clock). */
export function nowClinicWallClock(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CLINIC_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  return new Date(
    Date.UTC(
      partNumber(parts, "year"),
      partNumber(parts, "month") - 1,
      partNumber(parts, "day"),
      partNumber(parts, "hour"),
      partNumber(parts, "minute"),
      partNumber(parts, "second"),
    ),
  );
}

export function getAppointmentInstant(
  date: Date | string,
  timeSlot: Date | string,
) {
  const day = asDate(date);
  const time = asDate(timeSlot);
  return new Date(
    Date.UTC(
      day.getUTCFullYear(),
      day.getUTCMonth(),
      day.getUTCDate(),
      time.getUTCHours(),
      time.getUTCMinutes(),
      0,
    ),
  );
}

export function earliestBookableInstant(now = new Date()) {
  return new Date(nowClinicWallClock(now).getTime() + BOOKING_LEAD_MS);
}

export function isSlotSelectable(
  date: Date | string,
  timeSlot: Date | string,
  now = new Date(),
) {
  return (
    getAppointmentInstant(date, timeSlot).getTime() >=
    earliestBookableInstant(now).getTime()
  );
}

export function getEditLockInstant(booking: {
  date: Date | string;
  time_slot: Date | string;
}) {
  const startsAt = getAppointmentInstant(booking.date, booking.time_slot);
  return new Date(startsAt.getTime() - BOOKING_LEAD_MS);
}

export function isBookingEditable(booking: {
  date: Date | string;
  time_slot: Date | string;
  status: string;
}) {
  if (booking.status === "cancelled" || booking.status === "completed") {
    return false;
  }

  return nowClinicWallClock().getTime() < getEditLockInstant(booking).getTime();
}
