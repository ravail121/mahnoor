"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { siteConfig } from "@/lib/site-config";

type ResponseShape = { success: boolean; error?: string };

function whatsappSendHref(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export function AdminZoomLink({
  bookingId,
  patientName,
  patientPhone,
  dateLabel,
  timeLabel,
  initialZoomJoinUrl,
}: {
  bookingId: number;
  patientName: string;
  patientPhone: string;
  dateLabel: string;
  timeLabel: string;
  initialZoomJoinUrl: string | null;
}) {
  const router = useRouter();
  const [input, setInput] = useState(initialZoomJoinUrl ?? "");
  const [savedUrl, setSavedUrl] = useState(initialZoomJoinUrl);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<"patient" | "doctor" | null>(null);

  async function save() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Paste a Zoom link first");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zoom_join_url: trimmed }),
      });
      const payload = (await response.json()) as ResponseShape;
      if (!payload.success) {
        throw new Error(payload.error ?? "Could not save link");
      }
      setSavedUrl(trimmed);
      router.refresh();
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Could not save link",
      );
    } finally {
      setSaving(false);
    }
  }

  const patientMessage = savedUrl
    ? `Hi ${patientName}, your online appointment with ${siteConfig.doctorName} is confirmed for ${dateLabel} at ${timeLabel}. Join here: ${savedUrl}`
    : "";
  const doctorMessage = savedUrl
    ? `Online appointment: ${patientName} — ${dateLabel} at ${timeLabel}. Zoom link: ${savedUrl}`
    : "";

  async function copy(which: "patient" | "doctor") {
    try {
      await navigator.clipboard.writeText(
        which === "patient" ? patientMessage : doctorMessage,
      );
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      setError("Could not copy — select and copy the text manually.");
    }
  }

  return (
    <div className="card">
      <h3>Zoom link</h3>
      <div className="reschedule-form" style={{ marginTop: 0, paddingTop: 0, borderTop: "none" }}>
        <div>
          <label htmlFor="zoom-link-input">Zoom join link</label>
          <input
            id="zoom-link-input"
            type="url"
            placeholder="https://zoom.us/j/..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
          />
        </div>
        <button
          type="button"
          className="btn sm"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? "Saving..." : savedUrl ? "Update link" : "Save link"}
        </button>
      </div>

      {error ? <p className="notice-err">{error}</p> : null}

      {savedUrl ? (
        <>
          <div className="note-box">
            <div className="nl">Message for patient</div>
            {patientMessage}
          </div>
          <div className="pay-verify-actions" style={{ marginTop: 10 }}>
            <button type="button" className="btn sm" onClick={() => void copy("patient")}>
              {copied === "patient" ? "Copied!" : "Copy"}
            </button>
            <a
              href={whatsappSendHref(patientPhone, patientMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn sm ghost"
            >
              Send on WhatsApp
            </a>
          </div>

          <div className="note-box" style={{ marginTop: 16 }}>
            <div className="nl">Message for doctor</div>
            {doctorMessage}
          </div>
          <div className="pay-verify-actions" style={{ marginTop: 10 }}>
            <button type="button" className="btn sm" onClick={() => void copy("doctor")}>
              {copied === "doctor" ? "Copied!" : "Copy"}
            </button>
            <a
              href={whatsappSendHref(siteConfig.doctorWhatsapp, doctorMessage)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn sm ghost"
            >
              Send on WhatsApp
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}
