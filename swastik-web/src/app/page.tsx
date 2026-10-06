import React from "react";
import type { Metadata } from "next";
import { buildJsonLdString } from '@/lib/sanitize';
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import CanvaAppShowcaseSection from "@/components/landing/CanvaAppShowcaseSection";
import CanvaServicesSection from "@/components/landing/CanvaServicesSection";
import CanvaDoctorSection from "@/components/landing/CanvaDoctorSection";
import CanvaTestimonials from "@/components/landing/CanvaTestimonials";
import CanvaPortalsSection from "@/components/landing/CanvaPortalsSection";
import VaidIdeaAISection from "@/components/landing/VaidIdeaAISection";
import CanvaFooter from "@/components/landing/CanvaFooter";

export const metadata: Metadata = {
  title: "Vaididea — Find Trusted Doctors & Healthcare Services",
  description:
    "Discover verified doctors, compare consultation fees, find hospitals, book lab tests and clinic visits on Vaididea.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Vaididea — Find Trusted Doctors & Healthcare Services",
    description:
      "Discover verified doctors, compare consultation fees, find hospitals, book lab tests and clinic visits on Vaididea.",
    url: "https://www.vaididea.in",
    siteName: "Vaididea",
    locale: "en_IN",
    type: "website",
  },
};

const homeJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.vaididea.in/#website",
  "url": "https://www.vaididea.in",
  "name": "Vaididea",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://www.vaididea.in/doctors?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
  },
};

export default function HomePage() {
  return (
    <main className="bg-[#F5F8F7] min-h-screen selection:bg-[#2B6A60] selection:text-white">
      <script type="application/ld+json">{buildJsonLdString(homeJsonLd)}</script>

      <Navbar />
      <Hero />
      <CanvaAppShowcaseSection />
      <CanvaServicesSection />
      <CanvaDoctorSection />
      <CanvaTestimonials />
      
      {/* From Page 2 of Canva Design (Provider Login stuff they wanted on Landing Page) */}
      <CanvaPortalsSection />
      <VaidIdeaAISection />
      
      <CanvaFooter />
    </main>
  );
}
