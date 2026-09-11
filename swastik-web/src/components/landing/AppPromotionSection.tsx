"use client";

import React, { useState } from "react";
import Image from "next/image";
import {
  Smartphone,
  Calendar,
  Video,
  Pill,
  Activity,
  CreditCard,
  QrCode,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";
import AppDownloadModal from "@/components/shared/AppDownloadModal";

export default function AppPromotionSection() {
  const [appModalOpen, setAppModalOpen] = useState(false);

  const featureChips = [
    { label: "Appointment Management", icon: Calendar },
    { label: "Video Consultation", icon: Video },
    { label: "Medicine Ordering", icon: Pill },
    { label: "Diagnostic Lab Tests", icon: Activity },
    { label: "Digital Health Card (ABHA)", icon: CreditCard },
  ];

  return (
    <>
      <section
        className="py-10 sm:py-16 bg-gradient-to-br from-emerald-50/60 via-[#FAF8F4] to-teal-50/40 border-b border-stone-200/80 relative overflow-hidden"
        id="app"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 xl:gap-14 items-center">

            {/* ── LEFT: Text Content ── */}
            <div className="lg:col-span-6 xl:col-span-5 space-y-4 sm:space-y-5">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100/80 border border-emerald-200/80 text-vd-forest text-xs font-bold uppercase tracking-wider">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Vaididea Patient App</span>
              </div>

              <h2 className="text-h2 text-vd-forest">
                Your healthcare,{" "}
                <span className="text-emerald-700 font-semibold">
                  all in one app.
                </span>
              </h2>

              <p className="text-xs sm:text-sm md:text-[15px] text-stone-600 max-w-xl font-light leading-relaxed">
                Consult verified doctors, book clinic visits, order medicines,
                track diagnostic tests, and manage your family health records
                anywhere, anytime.
              </p>

              {/* Feature Chips */}
              <div className="flex flex-wrap gap-2 pt-1 pb-2">
                {featureChips.map((f) => {
                  const Icon = f.icon;
                  return (
                    <div
                      key={f.label}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-stone-200/80 text-xs font-medium text-stone-700 shadow-2xs hover:border-vd-forest/30 transition-colors"
                    >
                      <Icon className="w-3.5 h-3.5 text-vd-forest shrink-0" />
                      <span>{f.label}</span>
                    </div>
                  );
                })}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAppModalOpen(true)}
                  className="flex-1 sm:flex-none px-6 py-3 rounded-full bg-vd-forest hover:bg-vd-forest-deep text-white font-bold text-xs sm:text-sm transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer active:scale-95 min-w-0"
                >
                  <Smartphone className="w-4 h-4 shrink-0" />
                  <span>Download Vaididea App</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAppModalOpen(true)}
                  className="flex-1 sm:flex-none px-5 py-3 rounded-full bg-white hover:bg-stone-50 border border-stone-300/80 text-stone-800 font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-2xs active:scale-95 min-w-0"
                >
                  <QrCode className="w-4 h-4 text-vd-forest shrink-0" />
                  <span>Scan QR to Install</span>
                </button>
              </div>

              {/* Trust Indicators */}
              <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-stone-500 font-medium">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Android 8.0+ Supported</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>ABHA &amp; NDHM Ready</span>
                </div>
              </div>
            </div>

            {/* ── RIGHT: Dual Phone App Showcase ── */}
            <div className="lg:col-span-6 xl:col-span-7 flex items-center justify-center relative py-2 lg:py-0">
              {/* Soft Ambient Radial Glow */}
              <div
                aria-hidden="true"
                className="absolute inset-0 flex items-center justify-center pointer-events-none -z-0"
              >
                <div className="w-48 h-48 sm:w-72 sm:h-72 md:w-96 md:h-96 rounded-full bg-gradient-to-br from-emerald-200/40 via-teal-100/30 to-transparent blur-3xl" />
              </div>

              {/* Phones Wrapper — two phones overlapping
                  minHeight uses clamp so it scales with viewport:
                  320px vw → 70vw = 224px (but min is 280, so 280px kicks in)
                  768px vw → 70vw = 538px (capped at 480px)              */}
              <div
                className="relative flex items-end justify-center select-none w-full"
                style={{ minHeight: "clamp(280px, 70vw, 480px)" }}
              >
                {/* PHONE 1: Home Screen (Front / Primary / Larger) */}
                <div
                  className="relative z-20 transition-transform duration-300 hover:-translate-y-2"
                  style={{ width: "clamp(130px, 38vw, 250px)" }}
                >
                  <div className="rounded-[28px] sm:rounded-[36px] md:rounded-[40px] p-[8px] sm:p-[11px] bg-gradient-to-b from-[#2a2a2a] via-[#1a1a1a] to-[#111111] border border-[#3a3a3a]/80 shadow-[0_24px_48px_-12px_rgba(15,95,80,0.22),0_12px_24px_-8px_rgba(0,0,0,0.30)]">
                    {/* Dynamic Island */}
                    <div className="w-[46%] h-[9px] sm:h-[10px] bg-black rounded-full mx-auto mb-1.5 sm:mb-2" />

                    {/* Screen */}
                    <div
                      className="relative overflow-hidden rounded-[20px] sm:rounded-[27px] md:rounded-[30px] bg-white shadow-inner"
                      style={{ aspectRatio: "9 / 19.5" }}
                    >
                      <Image
                        src="/images/patient/patient_app_home.jpg"
                        alt="Vaididea Patient App Home Screen"
                        fill
                        sizes="(max-width: 640px) 38vw, (max-width: 1024px) 210px, 250px"
                        priority
                        className="object-cover"
                      />
                    </div>

                    {/* Home bar */}
                    <div className="flex justify-center mt-1.5 sm:mt-2">
                      <div className="w-[38%] h-[2px] sm:h-[3px] rounded-full bg-[#3a3a3a]" />
                    </div>
                  </div>
                </div>

                {/* PHONE 2: Specialities Screen (Back / Secondary / Smaller) */}
                <div
                  className="relative z-10 transition-transform duration-300"
                  style={{
                    width: "clamp(112px, 32vw, 220px)",
                    marginLeft: "clamp(-38px, -10vw, -76px)",
                    marginBottom: "-20px",
                  }}
                >
                  <div className="rounded-[24px] sm:rounded-[32px] md:rounded-[36px] p-[7px] sm:p-[10px] bg-gradient-to-b from-[#2a2a2a] via-[#1a1a1a] to-[#111111] border border-[#3a3a3a]/80 shadow-[0_16px_32px_-8px_rgba(0,0,0,0.28),0_6px_12px_-4px_rgba(0,0,0,0.18)]">
                    {/* Dynamic Island */}
                    <div className="w-[46%] h-[8px] sm:h-[9px] bg-black rounded-full mx-auto mb-1.5" />

                    {/* Screen */}
                    <div
                      className="relative overflow-hidden rounded-[17px] sm:rounded-[24px] md:rounded-[27px] bg-white shadow-inner"
                      style={{ aspectRatio: "9 / 19.5" }}
                    >
                      <Image
                        src="/images/patient/patient_app_specialities.jpg"
                        alt="Vaididea Patient App Specialities Screen"
                        fill
                        sizes="(max-width: 640px) 32vw, (max-width: 1024px) 185px, 220px"
                        className="object-cover"
                      />
                    </div>

                    {/* Home bar */}
                    <div className="flex justify-center mt-1.5">
                      <div className="w-[38%] h-[2px] sm:h-[3px] rounded-full bg-[#3a3a3a]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* App Download Modal */}
      <AppDownloadModal
        isOpen={appModalOpen}
        onClose={() => setAppModalOpen(false)}
      />
    </>
  );
}
