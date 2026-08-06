import Link from "next/link";
import type { BookingData } from "@/lib/booking";
import { formatMoney } from "@/lib/booking";
import { formatDisplayDate } from "@/lib/booking-api";
import { siteConfig } from "@/lib/site-config";

type Props = {
  data: BookingData;
};

export function ConfirmationStep({ data }: Props) {
  const isTentative = data.bookingStatus === "tentative";
  const amountPaid = data.amountPaid || (isTentative ? 0 : data.payNow);
  const remain = siteConfig.consultationFee - amountPaid;
  const displayDate = data.date ? formatDisplayDate(data.date) : "—";
  const displayTime = data.timeLabel || data.time || "—";

  return (
    <div className="confirm-done animate-fade-up">
      <div className="check-ring" style={isTentative ? { background: "#FFF4DC" } : undefined}>
        {isTentative ? (
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#B98A00" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ) : (
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#3D5C48" strokeWidth="2.4">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        )}
      </div>

      {isTentative ? (
        <>
          <h2>Booking registered — tentative</h2>
          <p>
            Your appointment slot has been noted. However, it is{" "}
            <strong>not fully secured</strong> — another patient can still
            claim this time by paying online.
          </p>
          <div className="tentative-reminder">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <strong>To guarantee your slot</strong>, you can still pay{" "}
              {formatMoney(siteConfig.inPersonReserveFee, siteConfig.currency)} online
              (adjusted in your total fee at the clinic).
              <br />
              If your slot is taken, you will be notified by SMS.
            </div>
          </div>
        </>
      ) : (
        <>
          <h2>Your appointment is confirmed</h2>
          <p>
            Payment received and your slot is guaranteed. A confirmation with
            all details has been sent to your WhatsApp.
          </p>
        </>
      )}

      <div className="summary" style={{ textAlign: "left", marginTop: 22 }}>
        {data.bookingId != null && (
          <SummaryRow label="Booking #" value={`#${data.bookingId}`} />
        )}
        <SummaryRow label="Session" value={data.sessionLabel || "—"} />
        <SummaryRow label="Date" value={displayDate} />
        <SummaryRow label="Time" value={displayTime} />
        <SummaryRow label="Name" value={data.fullName || "—"} />
        <SummaryRow
          label="Status"
          value={isTentative ? "Tentative (pay on arrival)" : "Confirmed"}
        />
        {!isTentative && (
          <>
            <SummaryRow
              label={`Paid now (${data.paymentMethod ?? "—"})`}
              value={formatMoney(amountPaid, siteConfig.currency)}
            />
            {amountPaid < siteConfig.consultationFee && (
              <SummaryRow
                label="Pay at clinic"
                value={formatMoney(remain, siteConfig.currency)}
                last
              />
            )}
          </>
        )}
        {isTentative && (
          <SummaryRow
            label="Pay at clinic"
            value={formatMoney(siteConfig.consultationFee, siteConfig.currency)}
            last
          />
        )}
      </div>

      <div className="btn-row" style={{ justifyContent: "center" }}>
        <Link href={siteConfig.whatsappUrl} className="btn wa">
          Open WhatsApp Confirmation
        </Link>
      </div>
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
