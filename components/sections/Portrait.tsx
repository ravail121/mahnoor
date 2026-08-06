import Image from "next/image";
import { siteConfig } from "@/lib/site-config";

export function HeroPortrait() {
  return (
    <div className="portrait-zone">
      <div className="breath-ring" />
      <div className="breath-ring r2" />
      <div className="breath-ring r3" />
      <div className="portrait">
        <Image
          src="/dr-mahnoor.jpg"
          alt={`${siteConfig.doctorName}, ${siteConfig.title}`}
          fill
          className="portrait-img"
          sizes="(max-width: 880px) 250px, 300px"
          priority
        />
      </div>
      <div className="portrait-tag">
        <strong>{siteConfig.doctorName}</strong>
        <span>{siteConfig.credentials}</span>
      </div>
    </div>
  );
}

export function AboutPhoto() {
  return (
    <div className="about-photo">
      <div className="photo-frame">
        <Image
          src="/dr-mahnoor.jpg"
          alt={siteConfig.doctorName}
          fill
          className="photo-frame-img"
          sizes="(max-width: 880px) 320px, 400px"
        />
      </div>
      <div className="photo-badge">
        <strong>MBBS · FCPS</strong>
        <span>Psychiatry</span>
      </div>
    </div>
  );
}
