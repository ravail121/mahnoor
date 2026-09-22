"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useId, useState } from "react";
import { siteConfig } from "@/lib/site-config";

export const PATIENT_PROFILE_UPDATED = "patient-profile-updated";

export type PatientProfile = {
  id: number;
  name: string;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  patient_id: number | null;
  age: number | null;
};

type ApiSuccess<T> = { success: true; data: T };
type ApiFailure = { success: false; error: string };

function parsePayload<T>(payload: ApiSuccess<T> | ApiFailure) {
  if (!payload.success) throw new Error(payload.error);
  return payload.data;
}

function isAppointmentsPath(pathname: string) {
  return (
    pathname === "/dashboard" || pathname.startsWith("/dashboard/bookings")
  );
}

function initialFromName(name: string) {
  return (name.trim()[0] ?? "?").toUpperCase();
}

export function PatientShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const panelId = useId();

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/me");
      const payload = (await response.json()) as
        | ApiSuccess<PatientProfile>
        | ApiFailure;
      setProfile(parsePayload(payload));
    } catch {
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    function onUpdated() {
      void loadProfile();
    }
    window.addEventListener(PATIENT_PROFILE_UPDATED, onUpdated);
    return () => window.removeEventListener(PATIENT_PROFILE_UPDATED, onUpdated);
  }, [loadProfile]);

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
  const displayName = profile?.name ?? "Patient";

  return (
    <div className="patient-dash">
      <div className="pt-mobile-bar">
        <button
          type="button"
          className="pt-mobile-toggle"
          aria-expanded={mobileOpen}
          aria-controls={panelId}
          onClick={() => setMobileOpen((open) => !open)}
        >
          Menu
        </button>
        <span className="pt-mobile-brand">My account</span>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="pt-side-backdrop"
          aria-label="Close menu"
          onClick={closeMobile}
        />
      ) : null}

      <div className="pt-shell">
        <aside id={panelId} className={`pt-side ${mobileOpen ? "open" : ""}`}>
          <Link href="/" className="pt-side-brand" onClick={closeMobile}>
            <Image
              src="/icon.png"
              alt=""
              width={38}
              height={38}
              className="pt-side-mark"
            />
            <div>
              <strong>{siteConfig.doctorName}</strong>
              <span>PATIENT PANEL</span>
            </div>
          </Link>

          <div className="pt-side-profile">
            <div className="pt-side-avatar" aria-hidden="true">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" />
              ) : (
                initialFromName(displayName)
              )}
            </div>
            <strong>{displayName}</strong>
            <span>{profile?.phone ?? "Add your phone"}</span>
          </div>

          <div className="pt-nav-label">Account</div>
          <Link
            href="/dashboard"
            className={`pt-nav-item ${isAppointmentsPath(pathname) ? "active" : ""}`}
            onClick={closeMobile}
          >
            Appointments
          </Link>
          <Link
            href="/dashboard/profile"
            className={`pt-nav-item ${pathname.startsWith("/dashboard/profile") ? "active" : ""}`}
            onClick={closeMobile}
          >
            Profile &amp; photo
          </Link>
          <Link
            href="/dashboard/payments"
            className={`pt-nav-item ${pathname.startsWith("/dashboard/payments") ? "active" : ""}`}
            onClick={closeMobile}
          >
            Payment methods
          </Link>

          <div className="pt-nav-label" style={{ marginTop: 14 }}>
            Book
          </div>
          <Link href="/booking" className="pt-nav-item" onClick={closeMobile}>
            New appointment
          </Link>

          <div className="pt-side-foot">
            <button
              type="button"
              className="pt-side-signout"
              onClick={() => void signOut({ callbackUrl: "/" })}
            >
              Sign out
            </button>
          </div>
        </aside>

        <main className="pt-main">{children}</main>
      </div>
    </div>
  );
}
