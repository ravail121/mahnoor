export type SessionType = "in-person" | "online";

export type PaymentMethod = "Bank";

export type BookingFor = "Myself" | "A family member";

export interface BookingData {
  sessionType: SessionType | null;
  sessionLabel: string;
  payNow: number;
  /** YYYY-MM-DD */
  date: string | null;
  /** HH:MM (24h) for API */
  time: string | null;
  /** Display time e.g. "5:00 PM" */
  timeLabel: string | null;
  fullName: string;
  phone: string;
  age: string;
  bookingFor: BookingFor;
  note: string;
  /** Set once an amount to pay now has been chosen — null means not chosen yet (in-person only). */
  paymentMethod: PaymentMethod | null;
  /** Set after successful API create */
  bookingId: number | null;
  /** Claimed amount sent by bank transfer, pending admin verification */
  amountPaid: number;
}

export const INITIAL_BOOKING: BookingData = {
  sessionType: null,
  sessionLabel: "",
  payNow: 0,
  date: null,
  time: null,
  timeLabel: null,
  fullName: "",
  phone: "",
  age: "",
  bookingFor: "Myself",
  note: "",
  paymentMethod: null,
  bookingId: null,
  amountPaid: 0,
};

export const BOOKING_STEPS = [
  { id: 1, label: "Session" },
  { id: 2, label: "Date & Time" },
  { id: 3, label: "Details" },
  { id: 4, label: "Payment" },
  { id: 5, label: "Done" },
] as const;

export function formatMoney(amount: number, currency = "Rs."): string {
  return `${currency} ${amount.toLocaleString("en-PK")}`;
}
