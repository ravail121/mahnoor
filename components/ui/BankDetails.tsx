"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/booking";
import { siteConfig } from "@/lib/site-config";

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-sage-deep/10 bg-white px-4 py-3">
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{label}</p>
        <p className="mt-1 font-mono text-sm text-forest">{value}</p>
      </div>
      <button
        type="button"
        onClick={() => void handleCopy()}
        className="shrink-0 rounded-full border border-sage-deep/20 px-3 py-1.5 text-xs font-semibold text-forest transition hover:bg-sage-soft"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

export function BankDetails({
  amount,
  reference,
  className = "",
}: {
  /** Claimed amount, used to prefill the WhatsApp message and show a "transfer this much" line. */
  amount?: number;
  /** Booking ID — shown so the patient can quote it, so we can match the screenshot to their booking. */
  reference?: number | string;
  className?: string;
}) {
  const { bankTransfer, currency } = siteConfig;
  const digits = bankTransfer.whatsappProofNumber.replace(/\D/g, "");
  const refLine = reference != null ? ` for Booking #${reference}` : "";
  const message = amount
    ? `Hi, I've sent a bank transfer of ${formatMoney(amount, currency)}${refLine}. Sending my payment screenshot now.`
    : `Hi, sending my payment screenshot${refLine}.`;
  const whatsappHref = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;

  return (
    <div className={`rounded-2xl bg-cream-deep p-5 ${className}`}>
      <p className="text-sm font-semibold text-forest">Bank transfer details</p>
      {amount ? (
        <p className="mt-1 text-sm text-muted">
          Transfer{" "}
          <strong className="text-forest">{formatMoney(amount, currency)}</strong>{" "}
          to the account below.
        </p>
      ) : null}

      {reference != null && (
        <div className="mt-3 rounded-xl border border-dashed border-sage-deep/25 bg-white px-4 py-3">
          <p className="text-[11px] uppercase tracking-[0.14em] text-muted">
            Mention this reference
          </p>
          <p className="mt-1 font-mono text-sm font-semibold text-forest">
            Booking #{reference}
          </p>
          <p className="mt-1 text-xs text-muted">
            Include this when you send your screenshot so we can match it to
            your booking.
          </p>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <CopyField label="Bank" value={bankTransfer.bankName} />
        <CopyField label="Account title" value={bankTransfer.accountTitle} />
        <CopyField label="Account number" value={bankTransfer.accountNumber} />
        <CopyField label="IBAN" value={bankTransfer.iban} />
      </div>

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1eb857]"
      >
        Send payment screenshot on WhatsApp →
      </a>
      <p className="mt-2 text-center text-xs text-muted">
        After transferring, send a screenshot to{" "}
        <strong className="text-forest">{bankTransfer.whatsappProofNumber}</strong> so
        we can verify your payment.
      </p>
    </div>
  );
}
