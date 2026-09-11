import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ToastProvider } from "@/components/ui/Toast";
import '@/lib/env'; // Validates env vars on server startup

import { GlobalSocketToastsDynamic } from '@/components/shared/GlobalSocketToastsDynamic';
import { PublicThemeGuard } from '@/components/shared/PublicThemeGuard';
import { PresentationModeBadge } from '@/components/shared/PresentationModeBadge';

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--vd-font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://www.vaididea.in"),
  title: {
    default: "Vaididea — Find Trusted Doctors & Healthcare Services",
    template: "%s | Vaididea",
  },
  description:
    "Discover verified doctors, compare consultation fees, find hospitals, book lab tests and clinic visits on Vaididea.",
  keywords: [
    "doctors",
    "find doctors",
    "healthcare services",
    "hospitals",
    "clinics",
    "lab tests",
    "online consultation",
    "healthcare providers",
    "telemedicine",
    "Vaididea",
  ],
  manifest: "/manifest.json",
  verification: {
    google: "iwvaIpdhxt1FHnnyRxgAwOXG5sNYpN7OfhHwscsFSd4",
  },
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Vaididea — Find Trusted Doctors & Healthcare Services",
    description:
      "Discover verified doctors, compare consultation fees, find hospitals, book lab tests and clinic visits on Vaididea.",
    url: "https://www.vaididea.in",
    siteName: "Vaididea",
    locale: "en_IN",
    type: "website",
    images: [
      {
        url: "/logo.png",
        width: 512,
        height: 512,
        alt: "Vaididea Healthcare Platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vaididea — Find Trusted Doctors & Healthcare Services",
    description:
      "Discover verified doctors, compare consultation fees, find hospitals, book lab tests and clinic visits on Vaididea.",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0F5F50",
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "MedicalOrganization",
      "@id": "https://www.vaididea.in/#organization",
      "name": "Vaididea",
      "url": "https://www.vaididea.in",
      "logo": "https://www.vaididea.in/logo.png",
      "description": "Connected healthcare ecosystem integrating telemedicine, clinical workflows, hospital operations, pharmacies, and emergency response.",
      "sameAs": [
        "https://www.instagram.com/vaididea/",
        "https://www.youtube.com/@vaididea",
        "https://www.linkedin.com/company/vaididea-healthcare/"
      ],
    },
    {
      "@type": "WebSite",
      "@id": "https://www.vaididea.in/#website",
      "url": "https://www.vaididea.in",
      "name": "Vaididea",
      "publisher": {
        "@id": "https://www.vaididea.in/#organization",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable}`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <style>{`
          :root {
            --font-sans: var(--vd-font-inter);
            --font-inter: var(--vd-font-inter);
            --font-heading: var(--vd-font-inter);
            --font-serif: var(--vd-font-inter);
            --font-outfit: var(--vd-font-inter);
            --font-cursive: var(--vd-font-inter);
          }
        `}</style>
      </head>
      <body className="font-sans antialiased">
        <PublicThemeGuard />
        <ToastProvider>
          {children}
          <GlobalSocketToastsDynamic />
          <PresentationModeBadge />
        </ToastProvider>
      </body>
    </html>
  );
}
