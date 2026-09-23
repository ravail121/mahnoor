"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { siteConfig } from "@/lib/site-config";

type PaymentRow = {
  id: number;
  amount: string;
  method: string;
  status: "pending" | "success" | "failed" | "refunded";
  created_at: string;
  /** Server-signed link to the booking's "Add to Calendar" page. */
  inviteUrl: string;
  /** Included when this list mixes payments from multiple bookings (e.g. the admin home page). */
  booking?: {
    id: number;
    patientName: string;
    patientPhone: string;
    dateLabel: string;
    timeLabel: string;
    sessionType: "in_person" | "online";
    /** Set once a Zoom meeting has been created for this online booking. */
    zoomJoinUrl: string | null;
    zoomStartUrl: string | null;
  };
};

type ResponseShape = {
  success: boolean;
  error?: string;
  data?: {
    booking?: {
      zoom_join_url: string | null;
      zoom_start_url: string | null;
    };
  };
};

const STATUS_LABEL: Record<PaymentRow["status"], string> = {
  pending: "Pending review",
  success: "Verified",
  failed: "Rejected",
  refunded: "Refunded",
};

function formatMoney(value: string) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Rs 0";
  return `Rs ${amount.toLocaleString("en-PK")}`;
}

function formatWhen(value: string) {
  return new Date(value).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

function whatsappSendHref(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function InviteSend({ payment }: { payment: PaymentRow }) {
  if (!payment.booking) return null;
  const {
    patientName,
    patientPhone,
    dateLabel,
    timeLabel,
    sessionType,
    zoomJoinUrl,
    zoomStartUrl,
  } = payment.booking;
  const isOnline = sessionType === "online";

  const patientMessage =
    isOnline && zoomJoinUrl
      ? `Hi ${patientName}, your online appointment with ${siteConfig.doctorName} on ${dateLabel} at ${timeLabel} is confirmed! Join here: ${zoomJoinUrl}\nAdd it to your calendar: ${payment.inviteUrl}`
      : `Hi ${patientName}, your appointment with ${siteConfig.doctorName} on ${dateLabel} at ${timeLabel} is confirmed! Add it to your calendar: ${payment.inviteUrl}`;

  const doctorMessage =
    isOnline && zoomStartUrl
      ? `Booking confirmed: ${patientName} — ${dateLabel} at ${timeLabel}. Start Zoom: ${zoomStartUrl}\nAdd to calendar: ${payment.inviteUrl}`
      : `Booking confirmed: ${patientName} — ${dateLabel} at ${timeLabel}. Add to calendar: ${payment.inviteUrl}`;

  return (
    <div className="pay-verify-invite">
      <span className="pay-verify-invite-label">Send calendar invite</span>
      <div className="pay-verify-actions">
        <a
          href={whatsappSendHref(patientPhone, patientMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn sm"
        >
          Send to patient
        </a>
        <a
          href={whatsappSendHref(siteConfig.doctorWhatsapp, doctorMessage)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn sm ghost"
        >
          Send to doctor
        </a>
      </div>
      {isOnline && !zoomJoinUrl && (
        <p className="notice-err">
          Zoom link not created — check ZOOM_* env vars, or add a link manually.
        </p>
      )}
    </div>
  );
}

export function AdminPaymentVerify({
  payments: initialPayments,
  title = "Payments",
  emptyMessage = "No bank transfer submitted for this booking yet.",
  showIcon = false,
}: {
  payments: PaymentRow[];
  title?: string;
  emptyMessage?: string;
  /** Show the amber warning icon in the header — used on the home page's attention-grabbing section. */
  showIcon?: boolean;
}) {
  const router = useRouter();
  const [payments, setPayments] = useState(initialPayments);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function updatePayment(id: number, status: "success" | "failed") {
    setLoadingId(id);
    setError("");

    try {
      const response = await fetch(`/api/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const payload = (await response.json()) as ResponseShape;
      if (!payload.success) {
        throw new Error(payload.error ?? "Could not update payment");
      }
      // Keep the row (with its new status) visible locally — e.g. on the home
      // page, a refresh would otherwise drop it since that list only queries
      // pending payments, and we still want to offer the invite-send buttons.
      // The Zoom links are only known once this response comes back (they're
      // created server-side during verification), so merge them in here too.
      const zoom = payload.data?.booking;
      setPayments((prev) =>
        prev.map((payment) => {
          if (payment.id !== id) return payment;
          return {
            ...payment,
            status,
            booking:
              payment.booking && zoom
                ? {
                    ...payment.booking,
                    zoomJoinUrl: zoom.zoom_join_url,
                    zoomStartUrl: zoom.zoom_start_url,
                  }
                : payment.booking,
          };
        }),
      );
      router.refresh();
    } catch (updateError) {
      setError(
        updateError instanceof Error
          ? updateError.message
          : "Could not update payment",
      );
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className={`card${showIcon ? " pay-verify-card" : ""}`}>
      <div className="pay-verify-head">
        {showIcon && (
          <div className="icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#B5843A" strokeWidth="2">
              <path d="M12 9v4M12 17h.01" />
              <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
            </svg>
          </div>
        )}
        <h3>{title}</h3>
      </div>

      {payments.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>{emptyMessage}</p>
      ) : (
        <div>
          {payments.map((payment) => (
            <div key={payment.id} className="pay-verify-row">
              <div className="pay-verify-who">
                {payment.booking ? (
                  <Link
                    href={`/admin/bookings/${payment.booking.id}`}
                    className="pv-link"
                  >
                    <div className="pv-name">{payment.booking.patientName}</div>
                    <div className="pay-verify-meta">
                      {payment.booking.dateLabel} · {payment.booking.timeLabel} ·{" "}
                      Bank transfer{" "}
                      <span className="mono">#{payment.id}</span> ·{" "}
                      {formatWhen(payment.created_at)}
                    </div>
                  </Link>
                ) : (
                  <div className="pay-verify-meta">
                    Bank transfer <span className="mono">#{payment.id}</span> ·{" "}
                    {formatWhen(payment.created_at)}
                  </div>
                )}
              </div>

              <div className="pay-verify-amount">{formatMoney(payment.amount)}</div>

              <span className={`pay-verify-badge ${payment.status}`}>
                {STATUS_LABEL[payment.status]}
              </span>

              {payment.status === "pending" && (
                <div className="pay-verify-actions">
                  <button
                    type="button"
                    className="btn sm"
                    disabled={loadingId !== null}
                    onClick={() => void updatePayment(payment.id, "success")}
                  >
                    {loadingId === payment.id ? "Saving..." : "Verify"}
                  </button>
                  <button
                    type="button"
                    className="btn sm danger"
                    disabled={loadingId !== null}
                    onClick={() => void updatePayment(payment.id, "failed")}
                  >
                    Reject
                  </button>
                </div>
              )}

              {payment.status === "success" && <InviteSend payment={payment} />}
            </div>
          ))}
        </div>
      )}

      {error ? <p className="notice-err">{error}</p> : null}
    </div>
  );
}
