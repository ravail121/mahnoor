"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { AuthSuccessIcon } from "@/components/auth/AuthBits";
import { AuthShell } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [identifier, setIdentifier] = useState("");
  const [sent, setSent] = useState(false);
  const [sentTo, setSentTo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier }),
    });
    const payload = (await response.json()) as
      | { success: true; data: { sentTo: string } }
      | { success: false; error: string };

    if (!response.ok || !payload.success) {
      setLoading(false);
      setError(payload.success ? "Could not send reset link." : payload.error);
      return;
    }

    setSentTo(payload.data.sentTo);
    setSent(true);
    setLoading(false);
  }

  if (sent) {
    return (
      <AuthShell backHref="/login" backLabel="← Back to sign in">
        <div className="auth-center">
          <AuthSuccessIcon>
            <svg
              width="34"
              height="34"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3D5C48"
              strokeWidth="2"
              aria-hidden
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m3 7 9 6 9-6" />
            </svg>
          </AuthSuccessIcon>
          <h1>Check your inbox</h1>
          <p>We&apos;ve sent a password reset link to</p>
          <span className="auth-email-chip">{sentTo}</span>
          <p style={{ marginBottom: 24 }}>
            If an account exists, a reset link has been prepared. For now, the
            link is printed in the dev server console instead of being emailed.
          </p>
          <div className="auth-switch-line">
            Didn&apos;t get it?{" "}
            <button
              type="button"
              className="auth-link"
              style={{ background: "none", border: "none", padding: 0 }}
              onClick={() => setSent(false)}
            >
              Try again
            </button>
          </div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell backHref="/login" backLabel="← Back to sign in">
      <div className="auth-form-head">
        <h1>Reset your password</h1>
        <p>Enter your email or phone and we&apos;ll send you a reset link.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="forgot-id">Email or phone</label>
          <input
            id="forgot-id"
            type="text"
            placeholder="you@example.com or 03xx-xxxxxxx"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />
        </div>
        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Sending..." : "Send Reset Link"}
        </button>
        {error ? <p className="auth-alert">{error}</p> : null}
      </form>

      <div className="auth-switch-line">
        <Link href="/login" className="auth-link">
          ← Back to sign in
        </Link>
      </div>
    </AuthShell>
  );
}
