import type { Metadata } from "next";
import { BookingWizard } from "@/components/booking/BookingWizard";
import { LockIcon } from "@/components/ui/Icons";

export const metadata: Metadata = {
  title: "Book an Appointment",
};

export default function BookingPage() {
  return (
    <>
      <div className="page-head wrap">
        <h1>Book your appointment</h1>
        <p>A few quiet steps and you&apos;re done. No phone calls needed.</p>
        <div className="privacy-pill">
          <LockIcon size={13} />
          100% Private &amp; Confidential
        </div>
      </div>
      <BookingWizard />
    </>
  );
}
