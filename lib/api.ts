import { NextResponse } from "next/server";
import { normalizeTimeToHHMM } from "@/lib/schedule";

export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: string };

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data } satisfies ApiSuccess<T>, {
    status,
  });
}

export function created<T>(data: T) {
  return ok(data, 201);
}

export function fail(error: string, status = 400) {
  return NextResponse.json({ success: false, error } satisfies ApiError, {
    status,
  });
}

export function serverError(err: unknown) {
  console.error(err);
  const message =
    err instanceof Error ? err.message : "Internal server error";
  return fail(message, 500);
}

export function parseId(value: string): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export function requireString(value: unknown, field: string): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

export function requireNumber(value: unknown, field: string): number | null {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Parse YYYY-MM-DD into a UTC Date. Also accepts ISO datetimes. */
export function parseDateOnly(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()),
    );
  }
  if (typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const date = new Date(Date.UTC(y, mo - 1, d));
  if (
    date.getUTCFullYear() !== y ||
    date.getUTCMonth() !== mo - 1 ||
    date.getUTCDate() !== d
  ) {
    return null;
  }
  return date;
}

/**
 * Parse a time value into a Date for TIME columns.
 * Accepts "17:00", "17:00:00", "5:00 PM", ISO datetimes, or Date.
 */
export function parseTimeSlot(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(
      Date.UTC(1970, 0, 1, value.getUTCHours(), value.getUTCMinutes(), 0),
    );
  }
  const hhmm = normalizeTimeToHHMM(value);
  if (!hhmm) return null;
  const [h, min] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(1970, 0, 1, h, min, 0));
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatTimeSlot(date: Date): string {
  return date.toISOString().slice(11, 19); // HH:MM:SS UTC
}
