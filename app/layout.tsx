import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import { auth } from "@/auth";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { AuthSessionProvider } from "@/components/providers/AuthSessionProvider";
import { siteConfig } from "@/lib/site-config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600"],
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["400", "500", "600"],
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  weight: ["500"],
  display: "swap",
});

const defaultTitle = `${siteConfig.doctorName} — Best Psychiatrist in ${siteConfig.city}, ${siteConfig.country}`;
const defaultDescription = `${siteConfig.doctorName} (MBBS, FCPS Psychiatry) is a Consultant Psychiatrist at ${siteConfig.clinic}, ${siteConfig.city}. Confidential in-person and online appointments for anxiety, depression, OCD, sleep issues and more.`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.siteUrl),
  title: {
    default: defaultTitle,
    template: `%s — ${siteConfig.doctorName}`,
  },
  description: defaultDescription,
  keywords: [
    "best psychiatrist in Lahore",
    "psychiatrist in Lahore",
    "psychiatrist in Pakistan",
    "online psychiatrist Pakistan",
    "female psychiatrist Lahore",
    "depression treatment Lahore",
    "anxiety treatment Lahore",
    "Dr. Mahnoor Irshad",
  ],
  authors: [{ name: siteConfig.doctorName }],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_PK",
    url: siteConfig.siteUrl,
    siteName: siteConfig.doctorName,
    title: defaultTitle,
    description: defaultDescription,
    images: [{ url: "/dr-mahnoor.jpg", width: 600, height: 720 }],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: ["/dr-mahnoor.jpg"],
  },
};

const physicianJsonLd = {
  "@context": "https://schema.org",
  "@type": "Physician",
  name: siteConfig.doctorName,
  image: `${siteConfig.siteUrl}/dr-mahnoor.jpg`,
  url: siteConfig.siteUrl,
  telephone: siteConfig.doctorWhatsapp,
  medicalSpecialty: "Psychiatric",
  description: defaultDescription,
  address: {
    "@type": "PostalAddress",
    streetAddress: siteConfig.clinic,
    addressLocality: siteConfig.city,
    addressCountry: siteConfig.country,
  },
  geo: {
    "@type": "GeoCoordinates",
    latitude: siteConfig.geo.latitude,
    longitude: siteConfig.geo.longitude,
  },
  hasMap: siteConfig.mapsUrl,
  priceRange: `${siteConfig.currency} ${siteConfig.consultationFee}`,
  availableService: [
    { "@type": "MedicalProcedure", name: "In-person psychiatric consultation" },
    { "@type": "MedicalProcedure", name: "Online video psychiatric consultation" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrainsMono.variable} h-full`}
    >
      <body className="flex min-h-full flex-col font-sans antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(physicianJsonLd) }}
        />
        <AuthSessionProvider session={session}>
          <SiteChrome>{children}</SiteChrome>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
