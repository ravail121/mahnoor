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

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.doctorName} — ${siteConfig.title}, ${siteConfig.city}`,
    template: `%s — ${siteConfig.doctorName}`,
  },
  description: `Compassionate psychiatric care with ${siteConfig.doctorName} in ${siteConfig.city}. Book in-person or online appointments.`,
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
        <AuthSessionProvider session={session}>
          <SiteChrome>{children}</SiteChrome>
        </AuthSessionProvider>
      </body>
    </html>
  );
}
