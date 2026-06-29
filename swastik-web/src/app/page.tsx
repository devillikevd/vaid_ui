import React from "react";
import Navbar from "@/components/landing/Navbar";
import LocationSplashScreen from "@/components/landing/LocationSplashScreen";
import Hero from "@/components/landing/Hero";
import EcosystemFeatures from "@/components/landing/EcosystemFeatures";
import GuardianEmergency from "@/components/landing/GuardianEmergency";
import DailyHealthAI from "@/components/landing/DailyHealthAI";
import Footer from "@/components/landing/Footer";
import FloatingIcons from "@/components/landing/FloatingIcons";

export default function HomePage() {
  return (
    <main className="bg-[#EFF6FF] min-h-screen">
      <LocationSplashScreen />
      <Navbar />
      <Hero />
      <EcosystemFeatures />
      <GuardianEmergency />
      <DailyHealthAI />
      <Footer />
    </main>
  );
}
