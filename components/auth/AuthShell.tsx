import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { siteConfig } from "@/lib/site-config";

type Props = {
  children: ReactNode;
  backHref?: string;
  backLabel?: string;
};

export function AuthShell({
  children,
  backHref = "/",
  backLabel = "← Back to website",
}: Props) {
  return (
    <div className="auth-wrap">
      <aside className="auth-brand-panel" aria-hidden={false}>
        <div className="auth-ring auth-r1" />
        <div className="auth-ring auth-r2" />
        <div className="auth-brand-top">
          <Image
            src="/icon.png"
            alt=""
            width={42}
            height={42}
            className="auth-brand-mark"
          />
          <div>
            <strong>{siteConfig.doctorName}</strong>
            <span>{siteConfig.title.toUpperCase()}</span>
          </div>
        </div>
        <div className="auth-brand-mid">
          <h2>A calmer, lighter you starts here.</h2>
          <p>
            Sign in to manage your appointments, or create an account to track
            your journey — all private, all secure.
          </p>
        </div>
        <div className="auth-brand-quote">
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#F6F4EC"
            strokeWidth="2"
            aria-hidden
          >
            <rect x="4" y="10" width="16" height="10" rx="2" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          Your information is always confidential.
        </div>
      </aside>

      <div className="auth-form-panel">
        <div className="auth-form-box">
          <Link href={backHref} className="auth-back-home">
            {backLabel}
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}
