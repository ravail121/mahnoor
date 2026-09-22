import { NextResponse } from "next/server";
import { buildCalendarEvent, buildICS } from "@/lib/calendar-invite";
import { verifyBookingInvite } from "@/lib/invite-token";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ id: string }> };

/**
 * GET /api/invite/[id]/ics?sig=
 * Public — serves a downloadable calendar file for a booking, gated by the
 * same HMAC signature used on the invite page (no login required).
 */
export async function GET(request: Request, context: Ctx) {
  const { id } = await context.params;
  const bookingId = Number(id);
  const sig = new URL(request.url).searchParams.get("sig");

  if (!Number.isInteger(bookingId) || bookingId <= 0 || !sig) {
    return NextResponse.json({ success: false, error: "Invalid link" }, { status: 400 });
  }
  if (!verifyBookingInvite(bookingId, sig)) {
    return NextResponse.json({ success: false, error: "Invalid link" }, { status: 403 });
  }

  const booking = await prisma.bookings.findUnique({
    where: { id: bookingId },
    include: { patients: true },
  });
  if (!booking) {
    return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
  }

  const event = buildCalendarEvent({
    patientName: booking.patients.name,
    sessionType: booking.session_type,
    date: booking.date,
    timeSlot: booking.time_slot,
  });
  const ics = buildICS(event, `booking-${bookingId}@clinic`);

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="appointment-${bookingId}.ics"`,
    },
  });
}
