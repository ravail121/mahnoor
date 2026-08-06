import type { Metadata } from "next";
import { CtaBand } from "@/components/sections/CtaBand";
import { AboutPhoto } from "@/components/sections/Portrait";
import { SiteIcon } from "@/components/ui/Icons";
import { approachItems, qualifications } from "@/lib/content";

export const metadata: Metadata = {
  title: "About",
};

export default function AboutPage() {
  return (
    <>
      <header className="inner-hero">
        <div className="wrap">
          <div className="eyebrow">About Dr. Mahnoor</div>
          <h1>Care that begins with truly listening.</h1>
        </div>
      </header>

      <section className="about-intro">
        <div className="wrap about-grid">
          <AboutPhoto />
          <div className="about-text">
            <p className="lead">
              Dr. Mahnoor Irshad is a Consultant Psychiatrist based in Lahore,
              dedicated to making mental health care feel approachable,
              respectful, and free of judgment.
            </p>
            <p>
              She completed her MBBS and later her FCPS in Psychiatry from
              Services Institute of Medical Sciences (Services Medical College),
              Lahore — one of Pakistan&apos;s most respected medical
              institutions. Today she serves as a Consultant Psychiatrist at
              Continental Medical College and Farooq Hospital, DHA Lahore.
            </p>
            <p>
              Her practice covers a wide range of concerns — from anxiety and
              depression to sleep difficulties, stress, and more — for adults,
              young people, and families. Whether you&apos;re taking the first
              step or continuing a journey, her focus stays the same: helping
              you feel understood and supported.
            </p>
          </div>
        </div>
      </section>

      <section className="quals-sec">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">Qualifications &amp; Roles</div>
            <h2>A foundation built on trust</h2>
          </div>
          <div className="timeline">
            {qualifications.map((item) => (
              <div className="tl-item" key={`${item.title}-${item.place}`}>
                <div className="tl-dot" />
                <div className="tl-body">
                  <h3>{item.title}</h3>
                  <p>{item.place}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="approach-sec">
        <div className="wrap">
          <div className="sec-head">
            <div className="eyebrow">My Approach</div>
            <h2>You set the pace. I&apos;ll walk with you.</h2>
          </div>
          <div className="approach-grid">
            {approachItems.map((item) => (
              <div className="approach-card" key={item.title}>
                <div className="ac-icon">
                  <SiteIcon name={item.icon} size={22} />
                </div>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-sec">
        <div className="wrap">
          <CtaBand
            title="Ready when you are."
            description="Book a confidential appointment with Dr. Mahnoor — in person or online."
            buttonLabel="Book Your Appointment"
          />
        </div>
      </section>
    </>
  );
}
