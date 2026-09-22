import { createHmac, timingSafeEqual } from "node:crypto";
import { getAppBaseUrl } from "@/lib/auth-utils";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set");
  return secret;
}

/** Short HMAC signature — not a DB lookup, just proves the link wasn't guessed. */
export function signBookingInvite(bookingId: number): string {
  return createHmac("sha256", getSecret())
    .update(`booking-invite:${bookingId}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyBookingInvite(bookingId: number, signature: string): boolean {
  const expected = signBookingInvite(bookingId);
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Direct link to the .ics calendar file — tapping it adds the event straight away, no landing page. */
export function buildInviteUrl(bookingId: number): string {
  const sig = signBookingInvite(bookingId);
  return `${getAppBaseUrl()}/api/invite/${bookingId}/ics?sig=${sig}`;
}
