"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { AuthLockLine } from "@/components/auth/AuthBits";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState(searchParams.get("name") ?? "");
  const [phone, setPhone] = useState(searchParams.get("phone") ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, email, password }),
    });
    const payload = (await response.json()) as
      | { success: true; data: { identifier: string } }
      | { success: false; error: string };

    if (!response.ok || !payload.success) {
      setLoading(false);
      setError(payload.success ? "Could not create your account." : payload.error);
      return;
    }

    const result = await signIn("credentials", {
      identifier: payload.data.identifier,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setLoading(false);
      setError("Account created, but sign-in failed. Please sign in manually.");
      router.push("/login");
      return;
    }

    router.push("/dashboard");
  }

  return (
    <AuthShell>
      <div className="auth-form-head">
        <h1>Create your account</h1>
        <p>Track your appointments and journey, privately.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="signup-name">Full name</label>
          <input
            id="signup-name"
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="signup-phone">Phone number</label>
          <input
            id="signup-phone"
            type="tel"
            placeholder="03xx-xxxxxxx"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            autoComplete="tel"
          />
        </div>

        <div className="auth-field">
          <label htmlFor="signup-email">
            Email{" "}
            <span style={{ fontWeight: 400, color: "var(--muted)" }}>
              (optional)
            </span>
          </label>
          <input
            id="signup-email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
        </div>

        <PasswordField
          id="signup-pw"
          label="Password"
          value={password}
          onChange={setPassword}
          placeholder="Create a password"
          hint="At least 8 characters."
          autoComplete="new-password"
        />

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </button>
        {error ? <p className="auth-alert">{error}</p> : null}
      </form>

      <div className="auth-switch-line">
        Already have an account?{" "}
        <Link href="/login" className="auth-link">
          Sign in
        </Link>
      </div>

      <AuthLockLine>We never share your information</AuthLockLine>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={null}>
      <SignupForm />
    </Suspense>
  );
}
