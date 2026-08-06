import type { Metadata } from "next";
import { CtaBand } from "@/components/sections/CtaBand";
import { serviceDetails, servicesSteps } from "@/lib/content";

export const metadata: Metadata = {
  title: "Services",
};

export default function ServicesPage() {
  return (
    <>
      <header className="inner-hero">
        <div className="wrap">
          <div className="eyebrow">Areas of Care</div>
          <h1>
            Whatever you&apos;re carrying, you don&apos;t have to carry it
            alone.
          </h1>
          <p className="hero-sub">
            Dr. Mahnoor helps with a wide range of mental health concerns, for
            adults, young people, and families — in person or online.
          </p>
        </div>
      </header>

      <section className="svc-detail-sec">
        <div className="wrap svc-detail-grid">
          {serviceDetails.map((svc) => (
            <div className="svc-detail" key={svc.title}>
              <div className="svc-dot" />
              <h3>{svc.title}</h3>
              <p className="signs">{svc.signs}</p>
              <p>{svc.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="how-mini">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">Getting Started</div>
            <h2>Simple, private, and at your pace</h2>
          </div>
          <div className="steps">
            {servicesSteps.map((step) => (
              <div className="step" key={step.num}>
                <div className="step-num">{step.num}</div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-sec">
        <div className="wrap">
          <CtaBand
            title="Not sure where to begin?"
            description="That's completely okay. Just book an appointment and we'll figure it out together."
            buttonLabel="Book Your Appointment"
          />
        </div>
      </section>
    </>
  );
}
