import type { Metadata, Viewport } from "next";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { ToastProvider } from "@/components/ui/Toast";
import { ThemeProvider } from "@/components/shared/ThemeProvider";
import '@/lib/env'; // Validates env vars on server startup

import { GlobalSocketToastsDynamic } from '@/components/shared/GlobalSocketToastsDynamic';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Inline script to prevent flash of wrong theme */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var t = localStorage.getItem('swastik-theme');
                  var dark = t === 'dark' || (t !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
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
