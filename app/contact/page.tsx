import Link from "next/link";
import type { Metadata } from "next";
import { LockIcon, SiteIcon } from "@/components/ui/Icons";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Contact",
};

export default function ContactPage() {
  return (
    <>
      <header className="inner-hero">
        <div className="wrap">
          <div className="eyebrow">Get in Touch</div>
          <h1>We&apos;re here to help you take the first step.</h1>
        </div>
      </header>

      <section className="contact-sec">
        <div className="wrap contact-grid">
          <div className="contact-info">
            <div className="ci-block">
              <div className="ci-icon">
                <SiteIcon name="pin" size={20} />
              </div>
              <div>
                <h3>Clinic Location</h3>
                <p>
                  {siteConfig.clinic}
                  <br />
                  {siteConfig.city}, {siteConfig.country}
                </p>
              </div>
            </div>
            <div className="ci-block">
              <div className="ci-icon">
                <SiteIcon name="chat" size={20} />
              </div>
              <div>
                <h3>WhatsApp</h3>
                <p>
                  Quick questions &amp; booking help
                  <br />
                  <a href={siteConfig.whatsappUrl} className="ci-link">
                    Message us on WhatsApp →
                  </a>
                </p>
              </div>
            </div>
            <div className="ci-block">
              <div className="ci-icon">
                <SiteIcon name="clock" size={20} />
              </div>
              <div>
                <h3>Timings</h3>
                <p>
                  Shared with you at booking confirmation. Both daytime and
                  evening slots available.
                </p>
              </div>
            </div>
            <div className="ci-block book-block">
              <div>
                <h3>Prefer to book directly?</h3>
                <p>
                  Skip the wait — reserve your slot online in under two minutes.
                </p>
                <Link href="/booking" className="btn" style={{ marginTop: 12 }}>
                  Book Appointment
                </Link>
              </div>
            </div>
          </div>

          <div className="contact-right">
            <div className="contact-form card-lite">
              <h3>Send a message</h3>
              <p className="form-sub">
                For general questions. For appointments, please use the booking
                page.
              </p>
              <div className="field">
                <label htmlFor="contact-name">Your name</label>
                <input id="contact-name" type="text" placeholder="Full name" />
              </div>
              <div className="field">
                <label htmlFor="contact-phone">WhatsApp / Phone</label>
                <input
                  id="contact-phone"
                  type="tel"
                  placeholder="03xx-xxxxxxx"
                />
              </div>
              <div className="field">
                <label htmlFor="contact-message">Message</label>
                <textarea
                  id="contact-message"
                  placeholder="How can we help?"
                />
              </div>
              <button
                type="button"
                className="btn"
                style={{ width: "100%", marginTop: 6 }}
              >
                Send Message
              </button>
              <div className="privacy-note">
                <LockIcon size={14} />
                Your message is private and confidential.
              </div>
            </div>

            <div className="map-placeholder">
              <SiteIcon name="pin" size={30} />
              <span>Google Map — Farooq Hospital, DHA Lahore</span>
              <small>(Map embeds here in the live site)</small>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
