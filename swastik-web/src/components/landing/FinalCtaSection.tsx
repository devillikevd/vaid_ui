"use client";

import React from "react";
import Link from "next/link";
import { Stethoscope, Compass, ArrowRight, Sparkles, CheckCircle2 } from "lucide-react";

export default function FinalCtaSection() {
  return (
    <section className="py-20 sm:py-28 bg-gradient-to-b from-stone-50 via-vd-cream to-stone-100 text-stone-900 relative overflow-hidden border-t border-stone-200/80" id="final-cta">
      {/* Soft Ambient Glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] max-w-3xl h-[280px] bg-emerald-100/50 blur-3xl rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-stone-200/90 shadow-2xs mb-6">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] font-semibold tracking-wider uppercase text-vd-forest">
            Get Started with Vaididea
          </span>
        </div>

        <h2 className="text-display text-vd-forest mb-6">
          Your healthcare journey <span className="text-vd-sage font-semibold">starts here.</span>
        </h2>

        <p className="text-base sm:text-lg text-stone-600 max-w-xl mx-auto mb-10 font-normal leading-relaxed">
          Find the care you need, when you need it. Discover verified doctors, accredited hospitals, diagnostic centers, and doorstep medicines.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
          <Link
            href="/patient/doctors"
            className="w-full sm:w-auto px-8 py-4 bg-vd-forest text-white rounded-full text-sm font-bold tracking-wide hover:bg-vd-forest-deep transition-all shadow-[0_6px_20px_rgba(15,95,80,0.3)] hover:shadow-[0_8px_25px_rgba(15,95,80,0.4)] hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <Stethoscope className="w-4 h-4" />
            <span>Find a Doctor</span>
          </Link>

          <Link
            href="/patient"
            className="w-full sm:w-auto px-8 py-4 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 rounded-full text-sm font-semibold tracking-wide transition-all shadow-2xs hover:-translate-y-0.5 flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4 text-vd-forest" />
            <span>Explore Healthcare</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
