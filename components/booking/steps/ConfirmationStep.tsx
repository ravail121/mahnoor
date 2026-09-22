import Link from "next/link";
import { useSession } from "next-auth/react";
import type { BookingData } from "@/lib/booking";
import { formatMoney } from "@/lib/booking";
import { formatDisplayDate } from "@/lib/booking-api";
import { siteConfig } from "@/lib/site-config";
import { BankDetails } from "@/components/ui/BankDetails";

type Props = {
  data: BookingData;
};

export function ConfirmationStep({ data }: Props) {
  const { data: session } = useSession();
  const amountPaid = data.amountPaid || 0;
  const remain = siteConfig.consultationFee - amountPaid;
  const displayDate = data.date ? formatDisplayDate(data.date) : "—";
  const displayTime = data.timeLabel || data.time || "—";
  const signupHref = `/signup?name=${encodeURIComponent(data.fullName)}&phone=${encodeURIComponent(data.phone)}`;

  return (
    <div className="confirm-done animate-fade-up">
      <div className="check-ring" style={{ background: "#FFF4DC" }}>
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B98A00" strokeWidth="2.2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 7v5l3 2" />
        </svg>
      </div>

      <h2>Almost there — send your bank transfer</h2>
      <p>
        Your slot is held. Send{" "}
        <strong>{formatMoney(amountPaid, siteConfig.currency)}</strong>{" "}
        using the bank details below, then send your screenshot on WhatsApp —
        we&apos;ll verify it and confirm your booking, usually within a few
        hours.
      </p>

      <div className="summary" style={{ textAlign: "left", marginTop: 22 }}>
        {data.bookingId != null && (
          <SummaryRow label="Booking #" value={`#${data.bookingId}`} />
        )}
        <SummaryRow label="Session" value={data.sessionLabel || "—"} />
        <SummaryRow label="Date" value={displayDate} />
        <SummaryRow label="Time" value={displayTime} />
        <SummaryRow label="Name" value={data.fullName || "—"} />
        <SummaryRow label="Status" value="Pending verification" />
        <SummaryRow
          label="To send by bank transfer"
          value={formatMoney(amountPaid, siteConfig.currency)}
        />
        {amountPaid < siteConfig.consultationFee && (
          <SummaryRow
            label="Pay at clinic"
            value={formatMoney(remain, siteConfig.currency)}
            last
          />
        )}
      </div>

      <div style={{ marginBottom: 22 }}>
        <BankDetails amount={amountPaid} reference={data.bookingId ?? undefined} />
      </div>

      {!session?.user && (
        <div
          className="rounded-2xl bg-cream-deep p-5 text-center"
          style={{ marginTop: 22 }}
        >
          <p className="text-sm font-semibold text-forest">
            Want to manage this booking online?
          </p>
          <p className="mt-1 text-sm text-muted">
            Create a free account to check your payment status, reschedule,
            or cancel anytime — no need to message us for changes.
          </p>
          <Link
            href={signupHref}
            className="mt-3 inline-flex items-center justify-center rounded-full border border-sage-deep/20 px-5 py-2.5 text-sm font-semibold text-forest transition hover:bg-sage-soft"
          >
            Create an account →
          </Link>
        </div>
      )}
    </div>
  );
}

function SummaryRow({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <div className="summary-row" style={last ? { borderBottom: "none" } : undefined}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
