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
  affiliations: "Continental Medical College & Farooq Hospital, DHA Lahore",
  tagline: "Psychiatry & Mental Wellness · Lahore",
  whatsappUrl: "#", // replace with real WhatsApp link later
  consultationFee: 5000,
  inPersonReserveFee: 1500,
  onlineFullFee: 5000,
  currency: "Rs.",
  navLinks: [
    { href: "/about", label: "About" },
    { href: "/services", label: "Services" },
    { href: "/#how", label: "How it works" },
    { href: "/contact", label: "Contact" },
  ],
} as const;

export type SiteConfig = typeof siteConfig;
