"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, Activity, CheckCircle2 } from "lucide-react";

export default function HealthLibrarySection() {
  return (
    <section className="py-10 sm:py-16 bg-[#F8F9FA] relative overflow-hidden" id="health-library">
      {/* Background blobs for glass effect */}
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-teal-100/40 rounded-full blur-3xl -z-10 mix-blend-multiply" />
      <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-100/40 rounded-full blur-3xl -z-10 mix-blend-multiply" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid md:grid-cols-12 gap-10 lg:gap-14 items-center">
          
          {/* ══════════════════════════════════════════════════════════════════════════
              LEFT SIDE: KEPT EXACTLY AS IT IS
              ══════════════════════════════════════════════════════════════════════════ */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="md:col-span-6 space-y-4"
          >
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-50 text-vd-forest text-[13px] font-bold tracking-wide shadow-sm border border-emerald-100">
              <BookOpen className="w-4 h-4" />
              <span>Health Library</span>
            </div>

            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight leading-tight">
              Empower Yourself with <br className="hidden sm:inline" />
              <span className="text-vd-forest">Medical Knowledge</span>
            </h2>

            <p className="text-xs sm:text-sm text-stone-600 font-normal leading-relaxed max-w-lg">
              Explore trusted information on common health conditions, symptoms, diagnosis and care.
            </p>

            {/* Feature Pills */}
            <div className="flex flex-wrap gap-2 pt-1 pb-2">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                10,000+ Conditions
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                ICD-10 Classified
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                Evidence-Based Guidance
              </span>
            </div>

            <div className="pt-2">
              <Link
                href="/health-library"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-vd-forest text-white text-xs sm:text-sm font-bold hover:bg-emerald-800 transition-all shadow-md shadow-vd-forest/20 hover:-translate-y-0.5 group cursor-pointer"
              >
                <span>Explore Health Library</span>
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </motion.div>

          {/* ══════════════════════════════════════════════════════════════════════════
              RIGHT SIDE: REALISTIC 3D OPEN MEDICAL BOOK / HEALTH HANDBOOK VISUAL
              ══════════════════════════════════════════════════════════════════════════ */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.6, delay: 0.2, type: "spring", bounce: 0.3 }}
            className="md:col-span-6 flex justify-center md:justify-end perspective-[1200px]"
          >
            <Link
              href="/health-library"
              className="group relative w-full max-w-[min(530px,100%)] block transition-all duration-500 hover:-translate-y-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest focus-visible:ring-offset-4 rounded-3xl"
              style={{
                transform: "rotateX(2deg) rotateY(-3.5deg) rotateZ(0.5deg)",
                transformStyle: "preserve-3d",
              }}
              aria-label="Explore Vaididea Health Library and clinical reference compendium"
            >
              {/* Soft ambient green backlight glow */}
              <div
                className="absolute -inset-3 bg-gradient-to-tr from-emerald-200/40 via-teal-100/25 to-transparent rounded-[2.5rem] filter blur-xl opacity-70 group-hover:opacity-95 transition-opacity duration-300 pointer-events-none"
                aria-hidden="true"
              />

              {/* The "Book" container */}
              <div className="relative rounded-[22px] bg-[#0A382F] p-1.5 sm:p-2 shadow-[0_22px_55px_-10px_rgba(15,95,80,0.32)] border border-[#0F5F50]/60">
                
                {/* Book Edge Thickness / Paper Pages Stack (Bottom & Side depth simulation) */}
                <div className="absolute inset-x-3 -bottom-1.5 h-2 bg-[#E3DFC9] rounded-b-md shadow-[0_3px_6px_rgba(0,0,0,0.15)] border-t border-[#D5D0B9]" />
                <div className="absolute inset-x-4 -bottom-2.5 h-1.5 bg-[#D2CCB2] rounded-b-md shadow-[0_2px_4px_rgba(0,0,0,0.2)] opacity-80" />

                {/* Open Book Double-Page Surface */}
                <div className="relative rounded-[16px] bg-[#FAF8F2] overflow-hidden flex flex-col sm:flex-row min-h-[300px] sm:min-h-[330px] border border-stone-200/70 shadow-inner">

                  {/* ─────────────────────────────────────────────────────────────
                      LEFT PAGE: ANATOMICAL / CLINICAL ILLUSTRATION
                      ───────────────────────────────────────────────────────────── */}
                  <div className="relative flex-1 p-4 sm:p-5 bg-gradient-to-r from-[#FAF8F2] via-[#F7F5EE] to-[#EAE6D8]/50 flex flex-col justify-between border-b sm:border-b-0 sm:border-r border-stone-200/80">
                    
                    {/* Top Running Head */}
                    <div className="flex items-center justify-between border-b border-stone-200/80 pb-2 mb-2.5">
                      <div className="flex items-center gap-1.5 text-vd-forest">
                        <Activity className="w-3 h-3 text-emerald-600" />
                        <span className="font-mono text-[9px] font-bold tracking-wider uppercase text-vd-forest">
                          VOL. I &bull; ANATOMY &amp; CARE
                        </span>
                      </div>
                      <span className="text-[9px] font-mono text-stone-400 font-medium">
                        ICD-10 REF
                      </span>
                    </div>

                    {/* Medical Anatomy & Diagram Art */}
                    <div className="my-auto py-1">
                      <div className="relative mx-auto w-full max-w-[200px] bg-white/90 rounded-xl p-3 border border-emerald-950/5 shadow-2xs">
                        {/* Anatomical Heart & ECG Pulse Vector Illustration */}
                        <div className="flex items-center justify-center mb-2">
                          <svg
                            viewBox="0 0 100 70"
                            className="w-24 h-16 text-vd-forest drop-shadow-xs"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                          >
                            {/* Organic heart silhouette */}
                            <path
                              d="M50 62 C26 44 14 30 14 18 C14 8 22 2 32 2 C40 2 46 6 50 12 C54 6 60 2 68 2 C78 2 86 8 86 18 C86 30 74 44 50 62 Z"
                              fill="#0F5F50"
                              fillOpacity="0.08"
                              stroke="#0F5F50"
                              strokeWidth="1.6"
                            />
                            {/* Aorta arch branches */}
                            <path d="M44 8 C44 2 56 2 56 8" stroke="#2A9D8F" strokeWidth="1.4" strokeLinecap="round" />
                            <path d="M48 2 L48 6" stroke="#2A9D8F" strokeWidth="1.2" strokeLinecap="round" />
                            <path d="M52 2 L52 6" stroke="#2A9D8F" strokeWidth="1.2" strokeLinecap="round" />
                            
                            {/* Dynamic ECG Rhythm Wave running across */}
                            <path
                              d="M10 36 L30 36 L34 26 L38 46 L42 16 L46 54 L50 36 L70 36 L74 31 L78 41 L82 36 L92 36"
                              stroke="#0F5F50"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                            {/* Micro node markers */}
                            <circle cx="42" cy="16" r="2" fill="#2A9D8F" />
                            <circle cx="46" cy="54" r="2" fill="#0F5F50" />
                          </svg>
                        </div>

                        {/* Clinical Callout Labels */}
                        <div className="flex items-center justify-between text-[8.5px] font-mono text-stone-500 border-t border-stone-100 pt-1.5">
                          <span className="text-emerald-700 font-semibold">I25.1 Arterial Tree</span>
                          <span className="text-stone-400">Sinus 72 BPM</span>
                        </div>
                      </div>

                      {/* Simulated clinical reference typography lines */}
                      <div className="mt-2.5 space-y-1.5 px-0.5">
                        <div className="h-1.5 w-full bg-stone-300/60 rounded-full" />
                        <div className="h-1.5 w-4/5 bg-stone-300/50 rounded-full" />
                        <div className="h-1.5 w-11/12 bg-stone-300/40 rounded-full" />
                      </div>
                    </div>

                    {/* Left Page Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-[8.5px] text-stone-400 font-mono">
                      <span>Vaididea Clinical Handbook</span>
                      <span>Page 142</span>
                    </div>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      CENTER BOOK CREASE / SPINE SHADOW WITH SILK BOOKMARK RIBBON
                      ───────────────────────────────────────────────────────────── */}
                  <div
                    className="relative hidden sm:block w-3 bg-gradient-to-r from-[#DCD7C7] via-[#BFB9A5] to-[#DCD7C7] shadow-inner shrink-0"
                    aria-hidden="true"
                  >
                    {/* Forest-Green Silk Ribbon Bookmark Dropping Down */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3.5 h-[103%] z-20 flex flex-col items-center pointer-events-none drop-shadow-md">
                      <div className="w-full flex-1 bg-gradient-to-b from-[#0A382F] via-[#0F5F50] to-[#1E7362] shadow-[0_4px_8px_rgba(0,0,0,0.3)] rounded-b-[1px]" />
                      {/* Ribbon V-Cut notch */}
                      <div
                        className="w-3.5 h-2 bg-[#1E7362] shrink-0"
                        style={{ clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 50%, 0 100%)" }}
                      />
                    </div>
                  </div>

                  {/* ─────────────────────────────────────────────────────────────
                      RIGHT PAGE: CLINICAL INDEX & CONDITIONS
                      ───────────────────────────────────────────────────────────── */}
                  <div className="relative flex-1 p-4 sm:p-5 bg-gradient-to-l from-[#FAF8F2] via-[#F7F5EE] to-[#EAE6D8]/50 flex flex-col justify-between">
                    
                    {/* Top Running Head */}
                    <div className="flex items-center justify-between border-b border-stone-200/80 pb-2 mb-2.5">
                      <span className="font-mono text-[9px] font-bold tracking-wider uppercase text-vd-forest">
                        SECTION B &bull; CLINICAL INDEX
                      </span>
                      <span className="text-[9px] font-mono text-stone-400 font-medium">
                        VERIFIED 2026
                      </span>
                    </div>

                    {/* Section Title */}
                    <div>
                      <h4 className="font-heading font-bold text-xs sm:text-[13px] text-stone-900 tracking-tight flex items-center gap-1.5">
                        <span>Clinical Topics &amp; Protocols</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      </h4>
                      <p className="text-[10px] text-stone-500 font-light mt-0.5">
                        Curated medical guidance for primary care.
                      </p>
                    </div>

                    {/* Micro Topic Index List */}
                    <div className="my-auto py-1 space-y-1.5">
                      <div className="p-2 rounded-lg bg-white/90 border border-stone-200/70 shadow-2xs flex items-center justify-between group-hover:border-emerald-500/40 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[8px] font-bold px-1 py-0.2 bg-emerald-50 text-vd-forest rounded">
                              E11.9
                            </span>
                            <span className="text-[11px] font-semibold text-stone-900 leading-none">
                              Type 2 Diabetes
                            </span>
                          </div>
                          <div className="h-1 w-24 bg-stone-200 rounded-full" />
                        </div>
                        <span className="text-[9px] text-vd-forest font-semibold">Protocol &rarr;</span>
                      </div>

                      <div className="p-2 rounded-lg bg-white/90 border border-stone-200/70 shadow-2xs flex items-center justify-between group-hover:border-emerald-500/40 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[8px] font-bold px-1 py-0.2 bg-emerald-50 text-vd-forest rounded">
                              I10
                            </span>
                            <span className="text-[11px] font-semibold text-stone-900 leading-none">
                              Essential Hypertension
                            </span>
                          </div>
                          <div className="h-1 w-20 bg-stone-200 rounded-full" />
                        </div>
                        <span className="text-[9px] text-vd-forest font-semibold">Protocol &rarr;</span>
                      </div>

                      <div className="p-2 rounded-lg bg-white/90 border border-stone-200/70 shadow-2xs flex items-center justify-between group-hover:border-emerald-500/40 transition-colors">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[8px] font-bold px-1 py-0.2 bg-emerald-50 text-vd-forest rounded">
                              J45.9
                            </span>
                            <span className="text-[11px] font-semibold text-stone-900 leading-none">
                              Bronchial Asthma
                            </span>
                          </div>
                          <div className="h-1 w-16 bg-stone-200 rounded-full" />
                        </div>
                        <span className="text-[9px] text-vd-forest font-semibold">Protocol &rarr;</span>
                      </div>
                    </div>

                    {/* Right Page Footer */}
                    <div className="flex items-center justify-between pt-2 border-t border-stone-200/60 text-[8.5px] text-stone-400 font-mono">
                      <span>Evidence-Based Diagnostics</span>
                      <span>Page 143</span>
                    </div>
                  </div>

                </div>
              </div>

              {/* Realistic Bottom Perspective Shadow */}
              <div
                className="mx-auto w-[90%] h-3 bg-gradient-to-b from-stone-400/20 to-transparent rounded-full filter blur-sm mt-1"
                aria-hidden="true"
              />
            </Link>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
