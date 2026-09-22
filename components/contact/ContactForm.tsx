"use client";

import { useState, type FormEvent } from "react";
import { LockIcon } from "@/components/ui/Icons";

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };

export function ContactForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phone, message }),
      });
      const payload = (await response.json()) as
        | ApiSuccess<unknown>
        | ApiFailure;
      if (!payload.success) throw new Error(payload.error);

      setSent(true);
      setName("");
      setPhone("");
      setMessage("");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not send your message. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="contact-form card-lite">
        <h3>Message sent</h3>
        <p className="form-sub">
          Thanks for reaching out — we&apos;ll get back to you soon.
        </p>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setSent(false)}
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form
      className="contact-form card-lite"
      onSubmit={(event) => void handleSubmit(event)}
    >
      <h3>Send a message</h3>
      <p className="form-sub">
        For general questions. For appointments, please use the booking page.
      </p>
      <div className="field">
        <label htmlFor="contact-name">Your name</label>
        <input
          id="contact-name"
          type="text"
          placeholder="Full name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="contact-phone">WhatsApp / Phone</label>
        <input
          id="contact-phone"
          type="tel"
          placeholder="03xx-xxxxxxx"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          placeholder="How can we help?"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
        />
      </div>
      <button
        type="submit"
        className="btn"
        style={{ width: "100%", marginTop: 6 }}
        disabled={sending}
      >
        {sending ? "Sending..." : "Send Message"}
      </button>
      {error ? (
        <p style={{ color: "var(--rose)", fontSize: 13, marginTop: 8 }}>
          {error}
        </p>
      ) : null}
      <div className="privacy-note">
        <LockIcon size={14} />
        Your message is private and confidential.
      </div>
    </form>
  );
}
