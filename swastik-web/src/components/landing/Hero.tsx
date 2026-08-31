/* eslint-disable @next/next/no-img-element */
/* eslint-disable jsx-a11y/alt-text */
"use client";

import React, { useState } from "react";
import VaidideaLogo from "@/components/shared/VaidideaLogo";

export default function Hero() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerType, setScannerType] = useState<"Patient" | "Driver" | null>(null);

  const openScanner = (type: "Patient" | "Driver") => {
    if (typeof window !== "undefined") {
      const isMobile =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        ) || window.innerWidth < 768;
      if (isMobile) {
        const playstoreLink =
          type === "Patient"
            ? "https://play.google.com/store/apps/details?id=com.vaididea.patient"
            : "https://play.google.com/store/apps/details?id=com.vaididea.ambulance";
        window.open(playstoreLink, "_blank");
        return;
      }
    }
    setScannerType(type);
    setScannerOpen(true);
  };

  const handleScrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <section
      className="relative min-h-[85vh] lg:min-h-[88vh] flex items-center justify-center overflow-hidden bg-vd-cream pt-32 pb-20 sm:pt-36 sm:pb-24 lg:pt-44 lg:pb-32"
      id="hero"
    >
      {/* Soft, Subtle Ambient Background Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-vd-cream/90" />
        <div className="siri-orb-1 w-[45vw] h-[45vw] top-[-20%] left-[-10%] opacity-35" />
        <div className="siri-orb-2 w-[40vw] h-[40vw] bottom-[-20%] right-[-10%] opacity-30" />
        <div className="siri-orb-3 w-[50vw] h-[50vw] top-[20%] left-[25%] opacity-20" />

        {/* Subtle texture */}
        <div
          className="absolute inset-0 opacity-[0.015] mix-blend-overlay"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")',
          }}
        />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 text-center flex flex-col items-center">
        {/* Category Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full apple-glass shadow-xs mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <VaidideaLogo className="w-4 h-4 text-vd-forest shrink-0" />
          <span className="w-1.5 h-1.5 rounded-full bg-vd-forest animate-pulse" />
          <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-vd-forest/90">
            Connected Healthcare Ecosystem
          </span>
        </div>

        {/* Primary Headline */}
        <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl lg:text-[5.25rem] text-vd-forest font-semibold mb-8 leading-[1.08] tracking-tight max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-900 delay-150">
          Healthcare,{" "}
          <span className="relative inline-block">
            <em className="text-vd-sage italic font-normal">finally connected.</em>
            <svg
              className="absolute w-full h-3.5 -bottom-1.5 left-0 text-vd-sage/35 pointer-events-none"
              viewBox="0 0 100 10"
              preserveAspectRatio="none"
            >
              <path
                d="M0 5 Q 50 10 100 5"
                stroke="currentColor"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>

        {/* Supporting Subtext */}
        <p className="text-base sm:text-lg md:text-xl text-vd-muted max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed font-light tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-900 delay-300">
          One intelligent ecosystem connecting patients, doctors, hospitals,
          clinics, pharmacies, diagnostic centers and emergency services.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 sm:mb-20 w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-900 delay-450">
          <button
            onClick={() => openScanner("Patient")}
            className="w-full sm:w-auto group relative px-8 py-4 bg-vd-forest text-white rounded-full text-[15px] font-semibold tracking-wide hover:bg-vd-forest-deep transition-all duration-300 shadow-[0_8px_30px_-6px_rgba(15,95,80,0.4)] hover:shadow-[0_14px_35px_-6px_rgba(15,95,80,0.5)] hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/15 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out" />
            <span className="relative z-10">Explore Vaididea</span>
            <svg
              className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
          <button
            onClick={() => handleScrollTo("providers")}
            className="w-full sm:w-auto px-8 py-4 apple-glass hover:bg-white/80 text-vd-forest rounded-full text-[15px] font-semibold tracking-wide transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>I&apos;m a Provider</span>
            <svg
              className="w-4 h-4 text-vd-sage group-hover:translate-y-0.5 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Minimal Subtle Ecosystem Feature Bar */}
        <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-10 text-xs sm:text-sm text-vd-muted font-light pt-8 border-t border-gray-200/60 max-w-2xl mx-auto animate-in fade-in duration-1000 delay-600">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-gray-700 font-medium">Unified Health ID</span>
          </div>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-teal-500" />
            <span className="text-gray-700 font-medium">Verified Care Network</span>
          </div>
          <span className="text-gray-300 hidden sm:inline">•</span>
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="text-gray-700 font-medium">Emergency Response</span>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal (Preserved) */}
      {scannerOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setScannerOpen(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-md" />
          <div
            className="apple-glass-card bg-white/90 p-8 sm:p-10 rounded-[2.5rem] max-w-sm w-full mx-auto shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)] relative animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-5 right-5 p-2 bg-gray-500/5 hover:bg-gray-500/15 rounded-full text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              onClick={() => setScannerOpen(false)}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-2xl font-heading font-bold text-center text-vd-forest mb-2">
              Get {scannerType || "Patient"} App
            </h3>
            <p className="text-xs sm:text-sm text-center text-vd-muted mb-6 font-normal">
              Scan this QR code to download the application directly to your device.
            </p>
            <div className="bg-white p-4 rounded-2xl flex justify-center mb-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] border border-gray-100">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=0F5F50&data=https://vaididea.com/download/${scannerType?.toLowerCase()}`}
                alt="QR Code"
                className="w-44 h-44 rounded-xl"
              />
            </div>
            <button
              className="w-full py-3.5 bg-vd-forest text-white rounded-xl font-semibold tracking-wide hover:bg-vd-forest-deep transition-all shadow-[0_8px_20px_-6px_rgba(15,95,80,0.4)] cursor-pointer"
              onClick={() => setScannerOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </section>
  );
}



