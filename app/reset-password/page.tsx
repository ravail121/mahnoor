"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AuthSuccessIcon } from "@/components/auth/AuthBits";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const token = searchParams.get("token") ?? "";

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        password,
        confirmPassword: confirm,
      }),
    });
    const payload = (await response.json()) as
      | { success: true; data: { reset: boolean } }
      | { success: false; error: string };

    if (!response.ok || !payload.success) {
      setLoading(false);
      setError(
        payload.success
          ? "Could not reset your password."
          : payload.error,
      );
      return;
    }

    setDone(true);
    setLoading(false);
  }

  if (done) {
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
              strokeWidth="2.4"
              aria-hidden
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </AuthSuccessIcon>
          <h1>Password updated</h1>
          <p style={{ marginBottom: 24 }}>
            Your password has been changed successfully. You can now sign in
            with your new password.
          </p>
          <Link href="/login" className="auth-btn">
            Back to Sign In
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell backHref="/login" backLabel="← Back to sign in">
      <div className="auth-form-head">
        <h1>Set a new password</h1>
        <p>Choose a strong password you&apos;ll remember.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {!token ? (
          <p className="auth-alert">
            Open the password reset link from the email or console log first.
          </p>
        ) : null}
        <PasswordField
          id="reset-pw"
          label="New password"
          value={password}
          onChange={setPassword}
          placeholder="New password"
          hint="At least 8 characters."
          autoComplete="new-password"
        />

        <div className="auth-field">
          <label htmlFor="reset-confirm">Confirm new password</label>
          <input
            id="reset-confirm"
            type="password"
            placeholder="Re-enter password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Updating..." : "Update Password"}
        </button>
        {error ? <p className="auth-alert">{error}</p> : null}
      </form>
    </AuthShell>
  );
}
