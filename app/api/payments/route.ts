import { prisma } from "@/lib/prisma";
import {
  created,
  fail,
  requireNumber,
  requireString,
  serverError,
} from "@/lib/api";

const METHODS = ["card", "jazzcash", "easypaisa", "bank"] as const;

/**
 * POST /api/payments
 * Body: { booking_id, amount, method, gateway_ref? }
 *
 * Public — called from the booking flow when a patient claims to have sent a
 * bank transfer. Always created as "pending"; the client cannot set any other
 * status here. Only an admin (PATCH /api/payments/[id]) can mark a payment
 * verified after checking the WhatsApp proof of transfer.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const bookingId = requireNumber(body.booking_id, "booking_id");
    const amount = requireNumber(body.amount, "amount");
    const method = requireString(body.method, "method");
    const gatewayRef =
      body.gateway_ref == null || body.gateway_ref === ""
        ? null
        : String(body.gateway_ref);

    if (!bookingId || amount === null || !method) {
      return fail("Required: booking_id, amount, method");
    }
    if (amount < 0) return fail("amount must be non-negative");
    if (!METHODS.includes(method as (typeof METHODS)[number])) {
      return fail("method must be card, jazzcash, easypaisa, or bank");
    }

    const booking = await prisma.bookings.findUnique({
      where: { id: bookingId },
    });
    if (!booking) return fail("Booking not found", 404);

    const payment = await prisma.payments.create({
      data: {
        booking_id: bookingId,
        amount,
        method: method as (typeof METHODS)[number],
        gateway_ref: gatewayRef,
        status: "pending",
      },
    });

    return created({ payment, booking, bumped: [] });
  } catch (err) {
    return serverError(err);
  }
}
