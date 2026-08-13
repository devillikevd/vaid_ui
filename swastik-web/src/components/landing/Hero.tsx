"use client";

import React, { useState } from "react";
import Link from "next/link";
import VaidideaLogo from "@/components/shared/VaidideaLogo";

export default function Hero() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerType, setScannerType] = useState<"Patient" | "Driver" | null>(null);

  const openScanner = (type: "Patient" | "Driver") => {
    if (typeof window !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      if (isMobile) {
        const playstoreLink = type === "Patient"
          ? "https://play.google.com/store/apps/details?id=com.vaididea.patient"
          : "https://play.google.com/store/apps/details?id=com.vaididea.ambulance";
        window.open(playstoreLink, "_blank");
        return;
      }
    }
    setScannerType(type);
    setScannerOpen(true);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-vd-cream" id="hero">
      {/* Apple Intelligence Siri-like Glowing Background Orbs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-vd-cream/80" />
        <div className="siri-orb-1 w-[60vw] h-[60vw] top-[-20%] left-[-10%]" />
        <div className="siri-orb-2 w-[50vw] h-[50vw] bottom-[-10%] right-[-10%]" />
        <div className="siri-orb-3 w-[70vw] h-[70vw] top-[20%] left-[20%] opacity-50" />
        
        {/* Subtle noise texture for premium feel */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-5 sm:px-8 text-center pt-28 pb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out fill-mode-both">
        {/* Logo Mark with subtle hover float */}
        <div className="flex justify-center mb-10 hover:-translate-y-2 transition-transform duration-700 ease-out">
          <div className="relative">
            <div className="absolute inset-0 bg-white/40 blur-2xl rounded-full scale-150" />
            <VaidideaLogo className="w-28 h-28 sm:w-36 sm:h-36 md:w-44 md:h-44 drop-shadow-2xl relative z-10" />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="font-cursive text-7xl sm:text-8xl md:text-9xl text-vd-forest mb-6 leading-none drop-shadow-sm tracking-tight" style={{ letterSpacing: '-0.02em' }}>
          Vaididea
        </h1>

        {/* Premium Badge */}
        <div className="flex items-center justify-center gap-4 mb-10 opacity-90 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300 fill-mode-both">
          <div className="h-px w-12 bg-gradient-to-r from-transparent to-vd-forest/20" />
          <div className="px-5 py-1.5 rounded-full apple-glass shadow-sm">
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.25em] uppercase text-vd-forest/80">
              A Unified Healthcare Network
            </span>
          </div>
          <div className="h-px w-12 bg-gradient-to-l from-transparent to-vd-forest/20" />
        </div>

        {/* Headline */}
        <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-[4rem] text-vd-forest mb-6 leading-[1.1] tracking-tight animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-500 fill-mode-both">
          A refined approach to{" "}
          <br className="hidden sm:block" />
          <em className="text-vd-sage font-medium italic relative inline-block">
            holistic well-being.
            <svg className="absolute w-full h-3 -bottom-1 left-0 text-vd-sage/30 opacity-70" viewBox="0 0 100 10" preserveAspectRatio="none">
              <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
            </svg>
          </em>
        </h2>

        {/* Subtext */}
        <p className="text-lg sm:text-xl text-vd-muted max-w-2xl mx-auto mb-12 leading-relaxed font-light tracking-wide animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-700 fill-mode-both">
          Vaididea seamlessly blends traditional healing wisdom with modern medical
          excellence. Experience a unified, personalized healthcare network designed
          entirely around you.
        </p>

        {/* Apple-like Premium CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-5 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-1000 fill-mode-both">
          <button
            onClick={() => openScanner("Patient")}
            className="group relative px-8 py-4 bg-vd-forest text-white rounded-full text-[15px] font-semibold tracking-wide hover:bg-vd-forest-deep transition-all duration-400 shadow-[0_8px_30px_-6px_rgba(27,77,62,0.5)] hover:shadow-[0_15px_40px_-6px_rgba(27,77,62,0.6)] hover:-translate-y-1 flex items-center gap-2 overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/20 translate-y-[-100%] group-hover:translate-y-[100%] transition-transform duration-700 ease-in-out" />
            <span className="relative z-10">Explore Patient App</span>
            <svg className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </button>
          <a
            href="#providers"
            className="group px-8 py-4 apple-glass hover:bg-white/60 text-vd-forest rounded-full text-[15px] font-semibold tracking-wide transition-all duration-400 hover:shadow-lg hover:-translate-y-1 flex items-center gap-2"
          >
            View Provider Portals
            <svg className="w-4 h-4 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </a>
        </div>
      </div>

      {/* Premium QR Scanner Modal */}
      {scannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300" onClick={() => setScannerOpen(false)}>
          <div className="absolute inset-0 bg-vd-cream/20 backdrop-blur-md" />
          <div className="apple-glass-card p-10 sm:p-12 rounded-[2.5rem] max-w-sm w-full mx-auto shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] relative animate-in zoom-in-95 duration-400" onClick={e => e.stopPropagation()}>
            <button className="absolute top-6 right-6 p-2 bg-gray-500/5 hover:bg-gray-500/10 rounded-full text-gray-400 hover:text-gray-900 transition-colors" onClick={() => setScannerOpen(false)}>
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <h3 className="text-2xl font-heading font-bold text-center text-vd-forest mb-2">Get {scannerType || ''} App</h3>
            <p className="text-sm text-center text-vd-muted mb-8 font-medium">Scan this QR code to download the app instantly to your device.</p>
            <div className="bg-white p-5 rounded-3xl flex justify-center mb-8 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] border border-white">
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=1B4D3E&data=https://vaididea.com/download/${scannerType?.toLowerCase()}`} alt="QR Code" className="w-48 h-48 rounded-2xl" />
            </div>
            <button className="w-full py-4 bg-vd-forest text-white rounded-[1.25rem] font-semibold tracking-wide hover:bg-vd-forest-deep transition-all shadow-[0_8px_20px_-6px_rgba(27,77,62,0.4)] hover:shadow-[0_12px_25px_-6px_rgba(27,77,62,0.5)] hover:-translate-y-0.5" onClick={() => setScannerOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
