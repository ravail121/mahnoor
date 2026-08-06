"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { getSession, signIn } from "next-auth/react";
import { AuthLockLine } from "@/components/auth/AuthBits";
import { AuthShell } from "@/components/auth/AuthShell";
import { PasswordField } from "@/components/auth/PasswordField";

function getPostLoginRedirect(role: "patient" | "admin") {
  return role === "admin" ? "/admin" : "/dashboard";
}

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      identifier,
      password,
      redirect: false,
    });

    if (!result || result.error) {
      setLoading(false);
      setError("Incorrect email/phone or password.");
      return;
    }

    const session = await getSession();
    const role = session?.user?.role === "admin" ? "admin" : "patient";

    void remember;
    router.push(getPostLoginRedirect(role));
  }

  return (
    <AuthShell>
      <div className="auth-form-head">
        <h1>Welcome back</h1>
        <p>Sign in to your account to continue.</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="login-id">Email or phone</label>
          <input
            id="login-id"
            type="text"
            placeholder="you@example.com or 03xx-xxxxxxx"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />
        </div>

        <PasswordField
          id="login-pw"
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />

        <div className="auth-row-between">
          <label className="auth-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          <Link href="/forgot-password" className="auth-link">
            Forgot password?
          </Link>
        </div>

        <button type="submit" className="auth-btn" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </button>
        {error ? <p className="auth-alert">{error}</p> : null}
      </form>

      <div className="auth-switch-line">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="auth-link">
          Sign up
        </Link>
      </div>

      <AuthLockLine>Secure, encrypted sign-in</AuthLockLine>
    </AuthShell>
  );
}
