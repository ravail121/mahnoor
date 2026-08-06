import type { PaymentMethod, SessionType } from "@/lib/booking";

export const DOCTOR_ID = 1;

export type ApiResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };

export type AvailabilitySlot = {
  id: number;
  doctor_id: number;
  date: string;
  time_slot: string;
  is_active: boolean;
  created_at: string;
};

export type ApiPatient = {
  id: number;
  name: string;
  phone: string;
  age: number | null;
  booking_for: string;
  created_at: string;
};

export type ApiBooking = {
  id: number;
  doctor_id: number;
  patient_id: number;
  session_type: "in_person" | "online";
  date: string;
  time_slot: string;
  status: "tentative" | "confirmed" | "cancelled" | "completed";
  payment_status: "unpaid" | "paid" | "refunded";
  amount_paid: string | number;
  total_fee: string | number;
  notes: string | null;
  created_at: string;
  patients?: ApiPatient;
  payments?: unknown[];
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch {
    throw new ApiError("Network error — please check your connection and try again.", 0);
  }

  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError("Unexpected server response. Please try again.", res.status);
  }

  if (!json.success) {
    throw new ApiError(json.error || "Request failed", res.status);
  }
  return json.data;
}

/** Format API TIME ("1970-01-01T17:00:00.000Z") → "5:00 PM" */
export function formatApiTime(iso: string): string {
  const d = new Date(iso);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const period = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, "0")} ${period}`;
}

/** Format API TIME → "17:00" for POST bodies */
export function apiTimeToHHMM(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

/** Display label for YYYY-MM-DD */
export function formatDisplayDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function toIsoDate(year: number, monthIndex: number, day: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function mapBookingFor(
  value: "Myself" | "A family member",
): "self" | "family_member" {
  return value === "A family member" ? "family_member" : "self";
}

export function mapSessionType(value: SessionType): "in_person" | "online" {
  return value === "online" ? "online" : "in_person";
}

export function mapPaymentMethod(
  method: PaymentMethod,
): "card" | "jazzcash" | "easypaisa" | "bank" {
  switch (method) {
    case "Card":
      return "card";
    case "JazzCash":
      return "jazzcash";
    case "EasyPaisa":
      return "easypaisa";
    case "Bank":
      return "bank";
  }
}

export function fetchAvailability(date: string) {
  const q = new URLSearchParams({
    doctor_id: String(DOCTOR_ID),
    date,
    available_only: "true",
  });
  return request<AvailabilitySlot[]>(`/api/availability?${q}`);
}

export function createBooking(input: {
  name: string;
  phone: string;
  age: string;
  bookingFor: "Myself" | "A family member";
  sessionType: SessionType;
  date: string;
  time: string;
  notes: string;
}) {
  return request<ApiBooking>("/api/bookings", {
    method: "POST",
    body: JSON.stringify({
      doctor_id: DOCTOR_ID,
      name: input.name,
      phone: input.phone,
      age: input.age ? Number(input.age) : null,
      booking_for: mapBookingFor(input.bookingFor),
      session_type: mapSessionType(input.sessionType),
      date: input.date,
      time_slot: input.time,
      notes: input.notes || null,
    }),
  });
}

export function createPayment(input: {
  bookingId: number;
  amount: number;
  method: PaymentMethod;
}) {
  return request<{
    payment: unknown;
    booking: ApiBooking;
    bumped: ApiBooking[];
  }>("/api/payments", {
    method: "POST",
    body: JSON.stringify({
      booking_id: input.bookingId,
      amount: input.amount,
      method: mapPaymentMethod(input.method),
      status: "success",
      gateway_ref: `demo-${Date.now()}`,
    }),
  });
}

export function fetchBooking(id: number) {
  return request<ApiBooking>(`/api/bookings/${id}`);
}
