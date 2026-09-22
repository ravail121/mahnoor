import Link from "next/link";
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/ContactForm";
import { SiteIcon } from "@/components/ui/Icons";
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
                  <br />
                  <a
                    href={siteConfig.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ci-link"
                  >
                    Get directions →
                  </a>
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
                  <a
                    href={siteConfig.whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ci-link"
                  >
                    Message us on WhatsApp →
                  </a>
                  <br />
                  <span style={{ fontSize: "12.5px", color: "var(--muted)" }}>
                    For appointments and general questions — not for
                    emergencies or urgent clinical concerns.
                  </span>
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
            <ContactForm />

            <div className="map-embed">
              <iframe
                title={`${siteConfig.clinic} on Google Maps`}
                src={siteConfig.mapsEmbedUrl}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
              <a
                href={siteConfig.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="map-open-link"
              >
                Open in Google Maps
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
