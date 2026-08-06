import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer>
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <h4>{siteConfig.doctorName}</h4>
            <p>
              {siteConfig.credentials}
              <br />
              {siteConfig.title}
              <br />
              {siteConfig.affiliations}
            </p>
            <div className="emergency">
              If you or someone you know is in immediate danger, please contact
              your nearest emergency service right away.
            </div>
          </div>
          <div>
            <h4>Quick Links</h4>
            <Link href="/about">About</Link>
            <Link href="/services">Services</Link>
            <Link href="/contact">Contact</Link>
            <Link href="/booking">Book Appointment</Link>
          </div>
          <div>
            <h4>Visit &amp; Contact</h4>
            <p>
              {siteConfig.clinic}
              <br />
              {siteConfig.city}, {siteConfig.country}
            </p>
            <a href={siteConfig.whatsappUrl}>WhatsApp Us</a>
            <p>Timings shared on booking</p>
          </div>
        </div>
        <div className="foot-note">
          <span>
            © {year} {siteConfig.doctorName}. All rights reserved.
          </span>
          <span>Privacy · Confidentiality Policy</span>
        </div>
      </div>
    </footer>
  );
}
