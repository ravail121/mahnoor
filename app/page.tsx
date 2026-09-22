import Link from "next/link";
import { CredentialsStrip } from "@/components/sections/CredentialsStrip";
import { CtaBand } from "@/components/sections/CtaBand";
import { HeroPortrait } from "@/components/sections/Portrait";
import { LockIcon, SiteIcon } from "@/components/ui/Icons";
import {
  faqItems,
  homeServices,
  homeSteps,
  whyItems,
} from "@/lib/content";
import { siteConfig } from "@/lib/site-config";

export default function HomePage() {
  return (
    <>
      <header className="hero">
        <div className="wrap hero-grid">
          <div>
            <div className="eyebrow">{siteConfig.tagline}</div>
            <h1>
              Your mental health matters. <em>Let&apos;s talk.</em>
            </h1>
            <p>
              Compassionate, confidential psychiatric care for anxiety,
              depression, sleep issues and more — in person at Farooq Hospital
              DHA, or online from wherever you feel comfortable.
            </p>
            <div className="hero-cta">
              <Link href="/booking" className="btn">
                Book an Appointment
              </Link>
              <Link href="/contact" className="btn ghost">
                Get in Touch
              </Link>
            </div>
            <div className="privacy-line">
              <LockIcon />
              Every conversation is 100% private and confidential.
            </div>
          </div>
          <HeroPortrait />
        </div>
      </header>

      <CredentialsStrip />

      <section id="how">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">Simple &amp; Private</div>
            <h2>Getting help is easier than you think</h2>
            <p>
              Three quiet steps — no waiting rooms full of questions, no
              complicated process.
            </p>
          </div>
          <div className="steps">
            {homeSteps.map((step) => (
              <div className="step" key={step.title}>
                <div className="step-icon">
                  <SiteIcon name={step.icon} size={22} />
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="services-sec" id="services">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">Areas of Care</div>
            <h2>
              Whatever you&apos;re carrying, you don&apos;t have to carry it
              alone
            </h2>
          </div>
          <div className="svc-grid">
            {homeServices.map((svc) => (
              <div className="svc" key={svc.title}>
                <div className="svc-dot" />
                <h3>{svc.title}</h3>
                <p>{svc.description}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 32 }}>
            <Link href="/services" className="btn ghost">
              View all services →
            </Link>
          </div>
        </div>
      </section>

      <section id="about">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">Why Dr. Mahnoor</div>
            <h2>Care that feels safe, human, and unhurried</h2>
          </div>
          <div className="why-grid">
            {whyItems.map((item) => (
              <div className="why" key={item.title}>
                <div className="why-icon">
                  <SiteIcon name={item.icon} size={20} />
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="faq-sec" id="faq">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">Common Questions</div>
            <h2>It&apos;s okay to have questions</h2>
          </div>
          <div className="faq-list">
            {faqItems.map((item) => (
              <details key={item.question} open={"defaultOpen" in item && item.defaultOpen}>
                <summary>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section id="book">
        <div className="wrap">
          <CtaBand
            title={
              <>
                Taking the first step is the hardest part.
                <br />
                You&apos;ve almost done it.
              </>
            }
            description="Book a confidential appointment with Dr. Mahnoor Irshad — in person or online. A calmer, lighter version of you is worth it."
            buttonLabel="Book Your Appointment"
          />
        </div>
      </section>
    </>
  );
}
