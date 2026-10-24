import { siteConfig } from "@/lib/site-config";

export const APPOINTMENT_DURATION_MINUTES = 30;

/** Asia/Karachi has no DST, so this offset is constant year-round. */
const CLINIC_UTC_OFFSET_MINUTES = 5 * 60;

export type CalendarEventInput = {
  patientName: string;
  sessionType: "in_person" | "online";
  date: Date;
  timeSlot: Date;
  zoomJoinUrl?: string | null;
};

export type CalendarEvent = {
  start: Date;
  end: Date;
  title: string;
  location: string;
  description: string;
};

/**
 * date/timeSlot store the Lahore wall-clock time encoded in UTC fields (see
 * lib/booking-window.ts). Calendar invites and Zoom need a real UTC instant,
 * so subtract the clinic's UTC offset to convert.
 */
export function toEventStart(date: Date, timeSlot: Date): Date {
  const wallClockUtcMillis = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    timeSlot.getUTCHours(),
    timeSlot.getUTCMinutes(),
    0,
  );
  return new Date(wallClockUtcMillis - CLINIC_UTC_OFFSET_MINUTES * 60_000);
}

function formatICSDate(value: Date): string {
  return value.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export function buildCalendarEvent(input: CalendarEventInput): CalendarEvent {
  const start = toEventStart(input.date, input.timeSlot);
  const end = new Date(start.getTime() + APPOINTMENT_DURATION_MINUTES * 60_000);
  const location =
    input.sessionType === "online" ? "Online video session" : siteConfig.clinic;
  const description =
    input.sessionType === "online"
      ? `Online psychiatry consultation with ${siteConfig.doctorName}.${
          input.zoomJoinUrl ? `\nJoin Zoom: ${input.zoomJoinUrl}` : ""
        }`
      : `In-person visit with ${siteConfig.doctorName} at ${siteConfig.clinic}.`;

  return {
    start,
    end,
    title: `Appointment: ${input.patientName} — ${siteConfig.doctorName}`,
    location,
    description,
  };
}

export function googleCalendarUrl(event: CalendarEvent): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatICSDate(event.start)}/${formatICSDate(event.end)}`,
    details: event.description,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeICSText(text: string): string {
  return text.replace(/[\\,;]/g, (match) => `\\${match}`).replace(/\n/g, "\\n");
}

export function buildICS(event: CalendarEvent, uid: string): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${siteConfig.doctorName}//Booking//EN`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatICSDate(new Date())}`,
    `DTSTART:${formatICSDate(event.start)}`,
    `DTEND:${formatICSDate(event.end)}`,
    `SUMMARY:${escapeICSText(event.title)}`,
    `DESCRIPTION:${escapeICSText(event.description)}`,
    `LOCATION:${escapeICSText(event.location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}
