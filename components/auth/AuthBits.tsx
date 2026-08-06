import type { ReactNode } from "react";

export function AuthLockLine({ children }: { children: ReactNode }) {
  return (
    <div className="auth-privacy-mini">
      <svg
        width="13"
        height="13"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#6A7169"
        strokeWidth="2"
        aria-hidden
      >
        <rect x="4" y="10" width="16" height="10" rx="2" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      </svg>
      {children}
    </div>
  );
}

export function AuthSuccessIcon({ children }: { children: ReactNode }) {
  return <div className="auth-success-icon">{children}</div>;
}
