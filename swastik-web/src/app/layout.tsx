import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Great_Vibes, Inter, Outfit, Playfair_Display } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import '@/lib/env'; // Validates env vars on server startup

import { GlobalSocketToastsDynamic } from '@/components/shared/GlobalSocketToastsDynamic';

// M020: fonts are self-hosted via next/font — no third-party CDN assets are
// loaded (previously Google Fonts was fetched at runtime, outside SRI control).
const inter = Inter({ subsets: ["latin"], variable: "--vd-font-inter", display: "swap" });
const playfair = Playfair_Display({ subsets: ["latin"], variable: "--vd-font-serif", display: "swap" });
const greatVibes = Great_Vibes({ weight: "400", subsets: ["latin"], variable: "--vd-font-cursive", display: "swap" });
const outfit = Outfit({ subsets: ["latin"], variable: "--vd-font-outfit", display: "swap" });
const cormorant = Cormorant_Garamond({ weight: ["300", "400", "500", "600", "700"], subsets: ["latin"], variable: "--vd-font-heading", display: "swap" });

export const metadata: Metadata = {
  title: "VAIDIDEA Healthcare Platform",
  description: "Multi-role healthcare management platform for doctors, hospitals, clinics, pharmacies, and emergency services.",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0ea5e9",
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
        {/* Inline script to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('swastik-theme');
                  var dark = t === 'dark';
                  document.documentElement.classList.add(dark ? 'dark' : 'light');
                  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider>
          <ToastProvider>
            {children}
            <GlobalSocketToastsDynamic />
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
