import React from "react";
import type { Metadata } from "next";
import { buildJsonLdString } from '@/lib/sanitize';
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ImpactSection from "@/components/landing/ImpactSection";
import HowItWorksSection from "@/components/landing/HowItWorksSection";
import AboutCareSection from "@/components/landing/AboutCareSection";
import WhyChooseSection from "@/components/landing/WhyChooseSection";
import PopularSpecialtiesSection from "@/components/landing/PopularSpecialtiesSection";
import FeaturedDoctorsSection from "@/components/landing/FeaturedDoctorsSection";
import HealthLibrarySection from "@/components/landing/HealthLibrarySection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import NewsletterSection from "@/components/landing/NewsletterSection";
import AppPromotionSection from "@/components/landing/AppPromotionSection";
import Footer from "@/components/landing/Footer";

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
    <main className="bg-white min-h-screen selection:bg-vd-forest selection:text-white">
      <script type="application/ld+json">{buildJsonLdString(homeJsonLd)}</script>

      {/* 01. Navbar — Medica peach top bar */}
      <Navbar />

      {/* 02. Hero — Olive leaf overlay + arch doctor photo + search */}
      <Hero />

      {/* 03. Impact Statistics — Off-white, animated counters */}
      <ImpactSection />

      {/* 04. How It Works — Sage green, 4-step cards */}
      <HowItWorksSection />

      {/* 05. About / Care Section — NEW: sage bg, arch photo + floating badge */}
      <AboutCareSection />

      {/* 06. Services Grid — Ice blue, 4 arch-card services with AI images */}
      <WhyChooseSection />

      {/* 07. Popular Specialties */}
      <PopularSpecialtiesSection />

      {/* 08. Featured Doctors */}
      <FeaturedDoctorsSection />

      {/* 09. Health Library */}
      <HealthLibrarySection />

      {/* 10. Testimonials */}
      <TestimonialsSection />

      {/* 11. Newsletter — NEW: Stay Informed subscribe block */}
      <NewsletterSection />

      {/* 12. App Promotion / Download */}
      <AppPromotionSection />

      {/* 13. Footer — Olive green Medica style */}
      <Footer />
    </main>
  );
}
