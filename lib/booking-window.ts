const CLINIC_TIMEZONE = "Asia/Karachi";
export const BOOKING_LEAD_MS = 3 * 60 * 60 * 1000;

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
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
