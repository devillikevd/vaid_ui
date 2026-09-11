"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  ArrowRight,
  Smartphone,
  ShieldCheck
} from "lucide-react";
import SearchLocationPicker, { SelectedLocation } from "@/components/shared/SearchLocationPicker";
import AppDownloadModal from "@/components/shared/AppDownloadModal";

export default function Hero() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);
  const [appModalOpen, setAppModalOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    const params = new URLSearchParams();
    if (query) params.append("q", query);

    if (selectedLocation) {
      if (selectedLocation.latitude && selectedLocation.longitude) {
        params.append("lat", String(selectedLocation.latitude));
        params.append("lng", String(selectedLocation.longitude));
      }
      if (selectedLocation.city && selectedLocation.city !== "Current Location") {
        params.append("city", selectedLocation.city);
      }
      if (selectedLocation.pincode) {
        params.append("pincode", selectedLocation.pincode);
      }
      if (selectedLocation.displayName) {
        params.append("location", selectedLocation.displayName);
      }
    }

    router.push(`/doctors?${params.toString()}`);
  };

  const popularSpecialties = [
    { label: "General Physician", href: "/doctors?specialty=General%20Physician" },
    { label: "Dermatologist", href: "/doctors?specialty=Dermatology" },
    { label: "Gynecologist", href: "/doctors?specialty=Gynecology" },
    { label: "Cardiologist", href: "/doctors?specialty=Cardiology" },
    { label: "Pediatrician", href: "/doctors?specialty=Pediatrics" },
    { label: "Orthopedics", href: "/doctors?specialty=Orthopedics" },
  ];

  return (
    <>
      <section className="relative pt-8 pb-5 sm:pt-12 sm:pb-8 bg-white" id="hero">

        {/* ── Healthcare-Themed Background Illustrations: Left & Right Margins Only ── */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden select-none">

          {/* NOTE: No central white overlay here — the SVG linear-gradient masks handle the fade
              so the centre is protected without blanket-overriding visibility of all decorations. */}

          {/* ══════════════════════════════════════════════════════════════════
              LEFT FLANK: Stethoscope, Medical Cross, Diagnostic Rings, Grid
              Mask: full at left edge → fades to 0 at ~60% across the div
              ══════════════════════════════════════════════════════════════════ */}
          <div className="absolute top-0 bottom-0 left-0 w-[220px] sm:w-[300px] md:w-[360px] lg:w-[420px] overflow-hidden hidden sm:block">
            <svg
              className="w-full h-full"
              viewBox="0 0 420 560"
              fill="none"
              preserveAspectRatio="xMinYMid slice"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Mask: left edge is fully visible, fades to 0 at the inner boundary */}
                <linearGradient id="hlMaskGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"  stopColor="#fff" stopOpacity="1" />
                  <stop offset="35%" stopColor="#fff" stopOpacity="0.95" />
                  <stop offset="65%" stopColor="#fff" stopOpacity="0.45" />
                  <stop offset="90%" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <mask id="hlMask">
                  <rect width="420" height="560" fill="url(#hlMaskGrad)" />
                </mask>

                <linearGradient id="stethGrad" x1="0%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%"   stopColor="#0F5F50" stopOpacity="0.22" />
                  <stop offset="60%"  stopColor="#2A9D8F" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#0F5F50" stopOpacity="0.18" />
                </linearGradient>
              </defs>

              <g mask="url(#hlMask)">

                {/* ── Diagnostic Circular Ring Composition (top-left) ── */}
                <circle cx="55"  cy="90"  r="52"  stroke="#0F5F50" strokeWidth="0.9" strokeOpacity="0.14" fill="none" />
                <circle cx="55"  cy="90"  r="38"  stroke="#2A9D8F" strokeWidth="0.7" strokeOpacity="0.11" fill="none" strokeDasharray="3 4" />
                <circle cx="55"  cy="90"  r="22"  stroke="#0F5F50" strokeWidth="0.6" strokeOpacity="0.16" fill="none" />
                <circle cx="55"  cy="90"  r="5"   fill="#0F5F50"   fillOpacity="0.18" />

                {/* Radial tick marks around the outer ring */}
                <line x1="55" y1="38"  x2="55" y2="30"  stroke="#0F5F50" strokeWidth="0.8" strokeOpacity="0.14" />
                <line x1="107" y1="90" x2="115" y2="90" stroke="#0F5F50" strokeWidth="0.8" strokeOpacity="0.14" />
                <line x1="3"   y1="90" x2="-5"  y2="90" stroke="#0F5F50" strokeWidth="0.8" strokeOpacity="0.14" />
                <line x1="55" y1="142" x2="55" y2="150" stroke="#0F5F50" strokeWidth="0.8" strokeOpacity="0.14" />

                {/* ── Telemetry dot-matrix grid ── */}
                <g fill="#0F5F50" opacity="0.18">
                  {[30,60,90,120].map(cx =>
                    [180,210,240,270,300].map(cy => (
                      <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="1.3" />
                    ))
                  )}
                </g>

                {/* ── Medical Cross (+ badge) at mid-left ── */}
                <g transform="translate(130, 165)">
                  <path
                    d="M10 0H18V10H28V18H18V28H10V18H0V10H10Z"
                    fill="#0F5F50" fillOpacity="0.10"
                    stroke="#0F5F50" strokeWidth="0.9" strokeOpacity="0.22"
                    strokeLinejoin="round"
                  />
                  <circle cx="14" cy="14" r="22" stroke="#2A9D8F" strokeWidth="0.8" strokeDasharray="2.5 3.5" strokeOpacity="0.18" fill="none" />
                  <circle cx="14" cy="14" r="30" stroke="#0F5F50" strokeWidth="0.5" strokeOpacity="0.10" fill="none" />
                </g>

                {/* ── Stethoscope Line Art ── */}
                <g>
                  <circle cx="40" cy="30" r="3"   fill="#0F5F50" fillOpacity="0.22" />
                  <circle cx="78" cy="30" r="3"   fill="#0F5F50" fillOpacity="0.22" />
                  <path d="M40 30 C50 42 60 54 59 74" stroke="url(#stethGrad)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                  <path d="M78 30 C68 42 62 54 59 74" stroke="url(#stethGrad)" strokeWidth="1.6" strokeLinecap="round" fill="none" />
                  <circle cx="59" cy="74" r="3.5" fill="#2A9D8F" fillOpacity="0.28" />
                  {/* Tubing loop */}
                  <path
                    d="M59 78 C56 120 22 138 26 195 C30 252 95 260 86 318 C77 374 42 392 54 440"
                    stroke="url(#stethGrad)"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    fill="none"
                  />
                  {/* Diaphragm chestpiece */}
                  <circle cx="54" cy="462" r="18" stroke="#0F5F50" strokeWidth="1.3" strokeOpacity="0.22" fill="#0F5F50" fillOpacity="0.04" />
                  <circle cx="54" cy="462" r="11" stroke="#2A9D8F" strokeWidth="1.0" strokeOpacity="0.24" fill="none" />
                  <circle cx="54" cy="462" r="4"  fill="#2A9D8F" fillOpacity="0.28" />
                </g>

                {/* ── Network nodes & curved care-path arcs ── */}
                <circle cx="190" cy="310" r="4"   fill="#0F5F50"  fillOpacity="0.18" />
                <circle cx="190" cy="310" r="8"   stroke="#0F5F50" strokeWidth="0.7" strokeOpacity="0.14" fill="none" />
                <circle cx="250" cy="370" r="3.2" fill="#2A9D8F"  fillOpacity="0.20" />
                <path d="M195 315 C215 338 232 356 247 367" stroke="#0F5F50" strokeWidth="1.0" strokeDasharray="2.5 3.5" strokeOpacity="0.18" fill="none" />

                {/* Floating micro-dots */}
                <circle cx="80"  cy="310" r="1.8" fill="#0F5F50" fillOpacity="0.18" />
                <circle cx="130" cy="260" r="1.5" fill="#2A9D8F" fillOpacity="0.20" />
                <circle cx="170" cy="415" r="1.6" fill="#0F5F50" fillOpacity="0.16" />
                <circle cx="100" cy="390" r="1.4" fill="#2A9D8F" fillOpacity="0.18" />
              </g>
            </svg>
          </div>

          {/* Mobile: left-only tiny corner decoration */}
          <div className="absolute top-0 left-0 w-[120px] h-[160px] overflow-hidden sm:hidden">
            <svg viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <defs>
                <radialGradient id="mobileLeftGrad" cx="0%" cy="0%" r="100%">
                  <stop offset="0%"   stopColor="#fff" stopOpacity="1" />
                  <stop offset="70%"  stopColor="#fff" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
                <mask id="mobileLeftMask">
                  <rect width="120" height="160" fill="url(#mobileLeftGrad)" />
                </mask>
              </defs>
              <g mask="url(#mobileLeftMask)">
                <circle cx="20" cy="40" r="32" stroke="#0F5F50" strokeWidth="0.9" strokeOpacity="0.20" fill="none" />
                <circle cx="20" cy="40" r="20" stroke="#2A9D8F" strokeWidth="0.7" strokeDasharray="2.5 3.5" strokeOpacity="0.18" fill="none" />
                <path d="M10 0 H16 V10 H26 V16 H16 V26 H10 V16 H0 V10 H10Z" transform="translate(40,80)" fill="#0F5F50" fillOpacity="0.09" stroke="#0F5F50" strokeWidth="0.8" strokeOpacity="0.18" />
              </g>
            </svg>
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              RIGHT FLANK: ECG Waveform, Shield, Telemetry Card, Helix
              Mask: full at right edge → fades to 0 at ~60% across the div
              ══════════════════════════════════════════════════════════════════ */}
          <div className="absolute top-0 bottom-0 right-0 w-[220px] sm:w-[300px] md:w-[360px] lg:w-[420px] overflow-hidden hidden sm:block">
            <svg
              className="w-full h-full"
              viewBox="0 0 420 560"
              fill="none"
              preserveAspectRatio="xMaxYMid slice"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Mask: right edge is fully visible, fades to 0 at the inner boundary */}
                <linearGradient id="hrMaskGrad" x1="100%" y1="0%" x2="0%" y2="0%">
                  <stop offset="0%"  stopColor="#fff" stopOpacity="1" />
                  <stop offset="35%" stopColor="#fff" stopOpacity="0.95" />
                  <stop offset="65%" stopColor="#fff" stopOpacity="0.45" />
                  <stop offset="90%" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <mask id="hrMask">
                  <rect width="420" height="560" fill="url(#hrMaskGrad)" />
                </mask>

                {/* ECG wave gradient: fades in from left, peaks in middle, fades toward right edge mask */}
                <linearGradient id="ecgGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%"   stopColor="#0F5F50" stopOpacity="0" />
                  <stop offset="15%"  stopColor="#0F5F50" stopOpacity="0.26" />
                  <stop offset="55%"  stopColor="#2A9D8F" stopOpacity="0.30" />
                  <stop offset="88%"  stopColor="#0F5F50" stopOpacity="0.26" />
                  <stop offset="100%" stopColor="#0F5F50" stopOpacity="0.06" />
                </linearGradient>
              </defs>

              <g mask="url(#hrMask)">

                {/* ── Verification Shield (top-right corner) ── */}
                <g transform="translate(320, 48)">
                  <path
                    d="M22 0C34 0 44 -6 44 -6C44 16 40 38 22 50C4 38 0 16 0 -6C0 -6 10 0 22 0Z"
                    stroke="#0F5F50" strokeWidth="1.2" strokeOpacity="0.22"
                    fill="#0F5F50" fillOpacity="0.05"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M14 22L20 28L31 16"
                    stroke="#2A9D8F" strokeWidth="1.5" strokeOpacity="0.28"
                    strokeLinecap="round" strokeLinejoin="round" fill="none"
                  />
                  <circle cx="22" cy="22" r="30" stroke="#2A9D8F" strokeWidth="0.7" strokeDasharray="3 4" strokeOpacity="0.16" fill="none" />
                </g>

                {/* ── ECG Sinus Rhythm — the most visible element ── */}
                <g>
                  {/* Very subtle grid baselines */}
                  <line x1="30"  y1="160" x2="410" y2="160" stroke="#0F5F50" strokeWidth="0.6" strokeOpacity="0.10" />
                  <line x1="30"  y1="190" x2="410" y2="190" stroke="#0F5F50" strokeWidth="0.6" strokeOpacity="0.10" />
                  <line x1="30"  y1="220" x2="410" y2="220" stroke="#0F5F50" strokeWidth="0.6" strokeOpacity="0.10" />

                  {/* Main sinus waveform — slightly bolder */}
                  <path
                    d="M 40 190 L 110 190 L 120 183 L 127 200 L 134 148 L 142 230 L 150 190 L 168 190 L 177 183 L 185 198 L 191 190 L 260 190 L 270 183 L 277 200 L 284 150 L 292 232 L 300 190 L 400 190"
                    stroke="url(#ecgGrad)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />

                  {/* R-wave peak marker dots */}
                  <circle cx="134" cy="148" r="3"   fill="#2A9D8F" fillOpacity="0.32" />
                  <circle cx="134" cy="148" r="7"   stroke="#2A9D8F" strokeWidth="0.8" strokeOpacity="0.22" fill="none" />
                  <circle cx="284" cy="150" r="2.5" fill="#0F5F50"  fillOpacity="0.28" />
                </g>

                {/* ── Diagnostics Circular Ring (bottom-right corner area) ── */}
                <circle cx="380" cy="440" r="50"  stroke="#0F5F50" strokeWidth="0.9" strokeOpacity="0.16" fill="none" />
                <circle cx="380" cy="440" r="35"  stroke="#2A9D8F" strokeWidth="0.7" strokeDasharray="3 4.5" strokeOpacity="0.14" fill="none" />
                <circle cx="380" cy="440" r="18"  stroke="#0F5F50" strokeWidth="0.6" strokeOpacity="0.18" fill="none" />
                <circle cx="380" cy="440" r="5"   fill="#2A9D8F"  fillOpacity="0.22" />

                {/* ── Telemetry Card Outline ── */}
                <g transform="translate(220, 272)">
                  <rect x="0" y="0" width="155" height="90" rx="10"
                    fill="#fff" fillOpacity="0.5"
                    stroke="#0F5F50" strokeWidth="0.9" strokeOpacity="0.16"
                  />
                  <text x="14" y="20" fontFamily="monospace" fontSize="8" fontWeight="700"
                    letterSpacing="0.08em" fill="#0F5F50" fillOpacity="0.28">
                    VITAL METRICS
                  </text>
                  <circle cx="136" cy="17" r="2.5" fill="#2A9D8F" fillOpacity="0.36" />
                  <line x1="14" y1="27" x2="141" y2="27" stroke="#0F5F50" strokeWidth="0.6" strokeOpacity="0.12" />
                  <rect x="14" y="38" width="65"  height="3.5" rx="1.5" fill="#0F5F50" fillOpacity="0.16" />
                  <rect x="14" y="48" width="105" height="3.5" rx="1.5" fill="#2A9D8F" fillOpacity="0.14" />
                  <rect x="14" y="58" width="50"  height="3.5" rx="1.5" fill="#0F5F50" fillOpacity="0.12" />
                  <text x="14" y="78" fontFamily="monospace" fontSize="7" fill="#0F5F50" fillOpacity="0.26">
                    SYNCHRONIZED · 2026
                  </text>
                </g>

                {/* ── DNA / Helix Fragment (lower-right) ── */}
                <g transform="translate(290, 390)">
                  <path d="M18 0C40 18 46 40 32 65C18 90 40 118 64 135" stroke="#0F5F50" strokeWidth="1.1" strokeOpacity="0.16" strokeDasharray="2.5 3.5" fill="none" />
                  <path d="M46 0C24 18 18 40 32 65C46 90 24 118 0 135"  stroke="#2A9D8F" strokeWidth="1.1" strokeOpacity="0.18" fill="none" />
                  <line x1="24" y1="16" x2="40" y2="16" stroke="#0F5F50" strokeWidth="0.8" strokeOpacity="0.14" />
                  <line x1="20" y1="65" x2="44" y2="65" stroke="#2A9D8F" strokeWidth="0.8" strokeOpacity="0.14" />
                  <line x1="24" y1="108" x2="40" y2="108" stroke="#0F5F50" strokeWidth="0.8" strokeOpacity="0.12" />
                </g>

                {/* Floating micro-dots */}
                <circle cx="200" cy="108" r="1.8" fill="#0F5F50" fillOpacity="0.18" />
                <circle cx="265" cy="245" r="1.6" fill="#2A9D8F" fillOpacity="0.20" />
                <circle cx="385" cy="360" r="1.8" fill="#0F5F50" fillOpacity="0.16" />
                <circle cx="248" cy="410" r="1.5" fill="#2A9D8F" fillOpacity="0.18" />
              </g>
            </svg>
          </div>

          {/* Mobile: right-only tiny corner decoration */}
          <div className="absolute top-0 right-0 w-[120px] h-[160px] overflow-hidden sm:hidden">
            <svg viewBox="0 0 120 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
              <defs>
                <radialGradient id="mobileRightGrad" cx="100%" cy="0%" r="100%">
                  <stop offset="0%"   stopColor="#fff" stopOpacity="1" />
                  <stop offset="70%"  stopColor="#fff" stopOpacity="0.6" />
                  <stop offset="100%" stopColor="#fff" stopOpacity="0" />
                </radialGradient>
                <mask id="mobileRightMask">
                  <rect width="120" height="160" fill="url(#mobileRightGrad)" />
                </mask>
              </defs>
              <g mask="url(#mobileRightMask)">
                {/* Mini ECG snippet */}
                <path
                  d="M10 60L40 60L46 52L52 68L58 32L64 78L70 60L110 60"
                  stroke="#0F5F50" strokeWidth="1.4" strokeOpacity="0.22"
                  strokeLinecap="round" strokeLinejoin="round" fill="none"
                />
                <circle cx="58" cy="32" r="2.5" fill="#2A9D8F" fillOpacity="0.28" />
                <circle cx="100" cy="30" r="22" stroke="#0F5F50" strokeWidth="0.8" strokeOpacity="0.16" fill="none" />
                <circle cx="100" cy="30" r="13" stroke="#2A9D8F" strokeWidth="0.6" strokeDasharray="2 3" strokeOpacity="0.14" fill="none" />
              </g>
            </svg>
          </div>

        </div>
        {/* ── End background decorations ── */}

        {/* ── End background decorations ── */}



        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Eyebrow */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50/90 border border-emerald-200/70 mb-4 shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-vd-forest" />
            <span className="text-[10px] sm:text-[11px] font-bold tracking-wider uppercase text-vd-forest">
              Verified Healthcare Discovery
            </span>
          </div>

          {/* Main Headline */}
          <h1 className="text-display font-bold text-vd-forest tracking-tight mb-6 sm:mb-8">
            Find Trusted Doctors <br className="hidden sm:inline" />
            <span className="text-vd-sage font-medium">Near You</span>
          </h1>

          {/* Search Component */}
          <div className="max-w-2xl mx-auto mb-5">
            <form
              onSubmit={handleSearchSubmit}
              className="bg-white p-2 rounded-2xl sm:rounded-full shadow-[0_4px_25px_rgba(0,0,0,0.06)] border border-stone-200 hover:border-vd-forest/40 focus-within:border-vd-forest focus-within:ring-2 focus-within:ring-emerald-500/10 transition-all flex flex-col sm:flex-row items-stretch gap-1.5 relative"
            >
              {/* Doctor / Specialty Input */}
              <div className="flex-1 flex items-center gap-2 px-3.5 py-1.5">
                <Search className="w-4 h-4 text-stone-400 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search doctors, specialties, or clinics..."
                  aria-label="Search doctors, specialties, or clinics"
                  className="w-full text-xs sm:text-sm font-normal text-stone-800 placeholder:text-stone-400 focus:outline-none bg-transparent"
                />
              </div>

              {/* Location Picker */}
              <div className="flex items-center px-3 py-1.5 bg-stone-50 sm:bg-transparent rounded-xl sm:rounded-none sm:border-l sm:border-stone-200 sm:w-[220px] shrink-0">
                <SearchLocationPicker
                  value={selectedLocation}
                  onChange={setSelectedLocation}
                  placeholder="City / Pincode"
                  className="w-full"
                  align="center"
                />
              </div>

              {/* Search Button */}
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl sm:rounded-full bg-vd-forest text-white font-bold text-xs sm:text-sm hover:bg-vd-forest-deep transition-all flex items-center justify-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
              >
                <span>Find Doctors</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Secondary Action: Download App CTA */}
          <div className="flex items-center justify-center gap-3 mb-5">
            <button
              onClick={() => setAppModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold text-vd-forest bg-emerald-50/70 hover:bg-emerald-100 border border-emerald-200/60 transition-colors cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Download Vaididea Patient App →</span>
            </button>
          </div>

          {/* Popular Specialty Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-xl mx-auto text-xs">
            <span className="font-medium text-stone-400 mr-0.5">Popular:</span>
            {popularSpecialties.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="px-2.5 py-1 rounded-full bg-white hover:bg-emerald-50 text-stone-600 hover:text-vd-forest text-[11px] sm:text-xs font-medium border border-stone-200/80 shadow-2xs transition-colors"
              >
                {item.label}
              </Link>
            ))}
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
