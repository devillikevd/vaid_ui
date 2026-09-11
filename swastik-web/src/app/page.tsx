import React from "react";
import type { Metadata } from "next";
import { buildJsonLdString } from '@/lib/sanitize';
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import WhyChooseSection from "@/components/landing/WhyChooseSection";
import PopularSpecialtiesSection from "@/components/landing/PopularSpecialtiesSection";
import FeaturedDoctorsSection from "@/components/landing/FeaturedDoctorsSection";
import AppPromotionSection from "@/components/landing/AppPromotionSection";
import HealthLibrarySection from "@/components/landing/HealthLibrarySection";
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
      {/* 01. Navbar */}
      <Navbar />

      {/* 02. Hero / Doctor Search */}
      <Hero />

      {/* 03. Healthcare Services (Find Hospitals, Book Lab Tests, Book Clinic Visit) */}
      <WhyChooseSection />

      {/* 04. Popular Specialties */}
      <PopularSpecialtiesSection />

      {/* 05. Featured Doctors */}
      <FeaturedDoctorsSection />

      {/* 06. Health Library */}
      <HealthLibrarySection />

      {/* 07. Vaididea Patient App / Download App */}
      <AppPromotionSection />

      {/* 08. Footer */}
      <Footer />
    </main>
  );
}
