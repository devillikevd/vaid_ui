import React from "react";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import ChoosePath from "@/components/landing/ChoosePath";
import PatientApp from "@/components/landing/PatientApp";
import ProviderEcosystem from "@/components/landing/ProviderEcosystem";
import VisionSection from "@/components/landing/VisionSection";
import HealthLibrarySection from "@/components/landing/HealthLibrarySection";
import Footer from "@/components/landing/Footer";

export default function HomePage() {
  return (
    <main className="bg-vd-cream min-h-screen">
      <Navbar />
      <Hero />
      <ChoosePath />
      <PatientApp />
      <ProviderEcosystem />
      <HealthLibrarySection />
      <VisionSection />
      <Footer />
    </main>
  );
}
