import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Great_Vibes, Inter, Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ToastProvider } from "@/components/ui/Toast";
import '@/lib/env'; // Validates env vars on server startup

import { GlobalSocketToastsDynamic } from '@/components/shared/GlobalSocketToastsDynamic';
import { PublicThemeGuard } from '@/components/shared/PublicThemeGuard';
import { PresentationModeBadge } from '@/components/shared/PresentationModeBadge';

// M020: fonts are self-hosted via next/font — no third-party CDN assets are
// loaded (previously Google Fonts was fetched at runtime, outside SRI control).
const inter = Inter({ subsets: ["latin"], variable: "--vd-font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--vd-font-serif", display: "swap" });
const greatVibes = Great_Vibes({ weight: "400", subsets: ["latin"], variable: "--vd-font-cursive", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--vd-font-outfit", display: "swap" });
const cormorant = Cormorant_Garamond({ weight: ["300", "400", "500", "600", "700"], subsets: ["latin"], variable: "--vd-font-heading", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL("https://www.vaididea.in"),
  title: {
    default: "Vaididea — Connected Healthcare Ecosystem",
    template: "%s | Vaididea",
  },
  description: "Connected healthcare ecosystem for patients, doctors, hospitals, clinics, pharmacies, and emergency services.",
  manifest: "/manifest.json",
  verification: {
    google: "iwvaIpdhxt1FHnnyRxgAwOXG5sNYpN7OfhHwscsFSd4",
  },
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Vaididea — Connected Healthcare Ecosystem",
    description: "Connected healthcare ecosystem for patients, doctors, hospitals, clinics, pharmacies, and emergency services.",
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
    title: "Vaididea — Connected Healthcare Ecosystem",
    description: "Connected healthcare ecosystem for patients, doctors, hospitals, clinics, pharmacies, and emergency services.",
    images: ["/logo.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
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
      className={`${inter.variable} ${playfair.variable} ${greatVibes.variable} ${outfit.variable} ${cormorant.variable}`}
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
            --font-serif: var(--vd-font-serif);
            --font-cursive: var(--vd-font-cursive);
            --font-outfit: var(--vd-font-outfit);
            --font-heading: var(--vd-font-heading);
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
