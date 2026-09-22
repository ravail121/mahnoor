/**
 * Central brand / clinic config.
 * Update this file when rebranding for another doctor.
 */
export const siteConfig = {
  doctorName: "Dr. Mahnoor Irshad",
  brandInitial: "M",
  title: "Consultant Psychiatrist",
  credentials: "MBBS · FCPS (Psychiatry)",
  city: "Lahore",
  country: "Pakistan",
  clinic: "Farooq Hospital, DHA Lahore",
  mapsUrl: "https://maps.app.goo.gl/N6xWue5Zcuem6b2v5",
  mapsEmbedUrl:
    "https://www.google.com/maps?q=31.485168,74.4085726&hl=en&z=17&output=embed",
  affiliations: "Continental Medical College & Farooq Hospital, DHA Lahore",
  tagline: "Psychiatry & Mental Wellness · Lahore",
  whatsappUrl: "https://wa.me/923091113356",
  consultationFee: 5000,
  inPersonReserveFee: 1500,
  onlineFullFee: 5000,
  currency: "Rs.",
  doctorWhatsapp: "+923234741489",
  bankTransfer: {
    bankName: "Standard Chartered Bank",
    accountTitle: "Ravail Irshad",
    accountNumber: "01724996001",
    iban: "PK41SCBL0000001724996001",
    whatsappProofNumber: "+923091113356",
  },
  navLinks: [
    { href: "/about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/#how", label: "How it works" },
    { href: "/contact", label: "Contact" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
