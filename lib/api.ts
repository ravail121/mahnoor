import { NextResponse } from "next/server";

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

/** Parse YYYY-MM-DD into a Date suitable for MySQL DATE columns. */
export function parseDateOnly(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
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
 * Parse a time string into a Date for MySQL TIME columns.
 * Accepts "17:00", "17:00:00", or "5:00 PM".
 */
export function parseTimeSlot(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();

  // 24h: HH:MM or HH:MM:SS
  let m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(raw);
  if (m) {
    const h = Number(m[1]);
    const min = Number(m[2]);
    const sec = Number(m[3] ?? "0");
    if (h > 23 || min > 59 || sec > 59) return null;
    return new Date(Date.UTC(1970, 0, 1, h, min, sec));
  }

  // 12h: H:MM AM/PM
  m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(raw);
  if (m) {
    let h = Number(m[1]);
    const min = Number(m[2]);
    const period = m[3].toUpperCase();
    if (h < 1 || h > 12 || min > 59) return null;
    if (period === "AM") {
      if (h === 12) h = 0;
    } else if (h !== 12) {
      h += 12;
    }
    return new Date(Date.UTC(1970, 0, 1, h, min, 0));
  }

  return null;
}

export function formatDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatTimeSlot(date: Date): string {
  return date.toISOString().slice(11, 19); // HH:MM:SS UTC
}
