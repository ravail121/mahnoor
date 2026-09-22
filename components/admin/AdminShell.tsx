"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useId, useState } from "react";

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === href : pathname.startsWith(href);
}

export function AdminShell({
  children,
  bookingCount = 0,
  messageCount = 0,
}: {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string | null;
  bookingCount?: number;
  messageCount?: number;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  const closeMobile = () => setMobileOpen(false);

  return (
    <div className="admin-app">
      <div className="mobile-bar">
        <button
          type="button"
          className="mobile-toggle"
          aria-expanded={mobileOpen}
          aria-controls={panelId}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
          Menu
        </button>
        <span className="mobile-brand">Admin</span>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="side-backdrop"
          aria-label="Close menu"
          onClick={closeMobile}
        />
      ) : null}

      <div className="shell">
        <aside id={panelId} className={`side ${mobileOpen ? "open" : ""}`}>
          <div className="side-brand">
            <div className="side-mark">M</div>
            <div>
              <strong>Dr. Mahnoor</strong>
              <span>ADMIN PANEL</span>
            </div>
          </div>

          <div className="nav-label">Overview</div>
          <Link
            href="/admin"
            className={`nav-item ${isActive(pathname, "/admin") ? "active" : ""}`}
            onClick={closeMobile}
            aria-current={isActive(pathname, "/admin") ? "page" : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
            Dashboard
          </Link>

          <div className="nav-label" style={{ marginTop: 14 }}>
            Manage
          </div>
          <Link
            href="/admin/schedule"
            className={`nav-item ${isActive(pathname, "/admin/schedule") ? "active" : ""}`}
            onClick={closeMobile}
            aria-current={isActive(pathname, "/admin/schedule") ? "page" : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <rect x="3" y="4" width="18" height="17" rx="2.5" />
              <path d="M8 2v4M16 2v4M3 10h18" />
            </svg>
            Schedule
          </Link>
          <Link
            href="/admin/bookings"
            className={`nav-item ${isActive(pathname, "/admin/bookings") ? "active" : ""}`}
            onClick={closeMobile}
            aria-current={isActive(pathname, "/admin/bookings") ? "page" : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
            Bookings
            {bookingCount > 0 ? <span className="count">{bookingCount}</span> : null}
          </Link>
          <Link
            href="/admin/patients"
            className={`nav-item ${isActive(pathname, "/admin/patients") ? "active" : ""}`}
            onClick={closeMobile}
            aria-current={isActive(pathname, "/admin/patients") ? "page" : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
            </svg>
            Patients
          </Link>
          <Link
            href="/admin/messages"
            className={`nav-item ${isActive(pathname, "/admin/messages") ? "active" : ""}`}
            onClick={closeMobile}
            aria-current={isActive(pathname, "/admin/messages") ? "page" : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10Z" />
            </svg>
            Messages
            {messageCount > 0 ? <span className="count">{messageCount}</span> : null}
          </Link>

          <div className="side-foot">
            <div className="side-user">
              <div className="side-avatar">M</div>
              <div>
                <strong>Dr. Mahnoor</strong>
                <span>Consultant Psychiatrist</span>
              </div>
            </div>
            <button
              type="button"
              className="signout"
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              Sign out
            </button>
          </div>
        </aside>

        <main className="main">{children}</main>
      </div>
    </div>
  );
}
