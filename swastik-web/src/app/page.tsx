import React from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ProblemSection from "@/components/landing/ProblemSection";
import SolutionSection from "@/components/landing/SolutionSection";
import PatientApp from "@/components/landing/PatientApp";
import EmergencySection from "@/components/landing/EmergencySection";
import ProviderEcosystem from "@/components/landing/ProviderEcosystem";
import HealthLibrarySection from "@/components/landing/HealthLibrarySection";
import TrustSection from "@/components/landing/TrustSection";
import VisionSection from "@/components/landing/VisionSection";
import FinalCtaSection from "@/components/landing/FinalCtaSection";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main className="bg-vd-cream min-h-screen selection:bg-vd-forest selection:text-white">
      {/* Navigation */}
      <Navbar />

      {/* 01. Hero with Connected Ecosystem Visual */}
      <Hero />

      {/* 02. Healthcare Problem (Fragmented Care) */}
      <ProblemSection />

      {/* 03. Vaididea Solution (3 Core Pillars) */}
      <SolutionSection />

      {/* 04. Patient Experience (Interactive App Mockup) */}
      <PatientApp />

      {/* 05. Dedicated Emergency SOS */}
      <EmergencySection />

      {/* 06. Provider Ecosystem (Dark Console Suite — Single Provider Showcase) */}
      <ProviderEcosystem />

      {/* 07. Health Library & Medical Intelligence */}
      <HealthLibrarySection />

      {/* 08. Trust & Security Pillars */}
      <TrustSection />

      {/* 09. Our Vision & Principles */}
      <VisionSection />

      {/* 10. Final Call To Action */}
      <FinalCtaSection />

      {/* 11. Footer */}
      <Footer />
    </main>
  );
}


