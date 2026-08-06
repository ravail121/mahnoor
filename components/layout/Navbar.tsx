"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { siteConfig } from "@/lib/site-config";

function getUserLabel(user: {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}) {
  return user.name?.trim() || user.email?.trim() || user.phone?.trim() || "Account";
}

function getUserArea(role: "patient" | "admin") {
  return role === "admin"
    ? { href: "/admin", label: "Admin Panel" }
    : { href: "/dashboard", label: "Dashboard" };
}

export function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isBooking = pathname === "/booking";
  const user = session?.user;
  const userLabel = user ? getUserLabel(user) : "";
  const userArea = user ? getUserArea(user.role) : null;
  const userInitial = userLabel.charAt(0).toUpperCase();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function closeMenus() {
    setOpen(false);
    setMenuOpen(false);
  }

  async function handleSignOut() {
    closeMenus();
    await signOut({ callbackUrl: "/" });
  }

  return (
    <nav style={{ position: "relative" }}>
      <div className="nav-inner">
        <Link href="/" className="brand">
          <div className="brand-mark">{siteConfig.brandInitial}</div>
          <div className="brand-text">
            <strong>{siteConfig.doctorName}</strong>
            <span>{siteConfig.title.toUpperCase()}</span>
          </div>
        </Link>

        {isBooking ? (
          <Link href="/" className="back-link">
            ← Back to Home
          </Link>
        ) : (
          <>
            <div className={`nav-links${open ? " open" : ""}`} id="navLinks">
              {siteConfig.navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={closeMenus}>
                  {link.label}
                </Link>
              ))}

              {status === "loading" ? (
                <span className="nav-auth-placeholder nav-desktop-only" aria-hidden />
              ) : user && userArea ? (
                <>
                  <div className="nav-user nav-desktop-only" ref={menuRef}>
                    <button
                      type="button"
                      className="nav-user-toggle"
                      aria-expanded={menuOpen}
                      aria-haspopup="menu"
                      onClick={() => setMenuOpen((value) => !value)}
                    >
                      <span className="nav-avatar">{userInitial}</span>
                      <span className="nav-user-name">{userLabel}</span>
                      <span className="nav-user-caret" aria-hidden>
                        ▾
                      </span>
                    </button>

                    {menuOpen ? (
                      <div className="nav-user-menu" role="menu">
                        <Link
                          href={userArea.href}
                          className="nav-user-link"
                          onClick={closeMenus}
                        >
                          {userArea.label}
                        </Link>
                        <button
                          type="button"
                          className="nav-user-link"
                          onClick={handleSignOut}
                        >
                          Sign out
                        </button>
                      </div>
                    ) : null}
                  </div>

                  <div className="nav-mobile-user nav-mobile-only">
                    <span className="nav-avatar">{userInitial}</span>
                    <span>{userLabel}</span>
                  </div>
                  <Link
                    href={userArea.href}
                    className="nav-mobile-session-link nav-mobile-only"
                    onClick={closeMenus}
                  >
                    {userArea.label}
                  </Link>
                  <button
                    type="button"
                    className="nav-mobile-signout nav-mobile-only"
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className="btn ghost nav-signin"
                  onClick={closeMenus}
                >
                  Sign In
                </Link>
              )}

              <Link href="/booking" className="btn" onClick={closeMenus}>
                Book Appointment
              </Link>
            </div>
            <button
              type="button"
              className="menu-toggle"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? "✕" : "☰"}
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
