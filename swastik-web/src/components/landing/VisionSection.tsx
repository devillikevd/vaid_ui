"use client";

import React from "react";
import Link from "next/link";

const principles = [
  {
    tag: "Accessible",
    quote: "Healthcare should not depend on where you live.",
    desc: "Bridging geographic and physical divides so quality clinical care and rapid emergency response reach every community.",
  },
  {
    tag: "Connected",
    quote: "Your journey shouldn't live across disconnected systems.",
    desc: "Eliminating friction between doctors, labs, pharmacies, and patients through a unified, patient-centric digital record.",
  },
  {
    tag: "Intelligent",
    quote: "Technology should help people make better healthcare decisions.",
    desc: "Augmenting human expertise with intelligent symptom triage, ICD-10 medical reference, and continuous health insights.",
  },
];

export default function VisionSection() {
  return (
    <section className="py-20 sm:py-28 bg-white relative overflow-hidden" id="vision">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-white via-vd-cream/30 to-white pointer-events-none" />
      <div className="absolute top-1/3 -left-1/4 w-[45vw] h-[45vw] bg-vd-sage/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-1/3 -right-1/4 w-[45vw] h-[45vw] bg-vd-forest/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-14 sm:mb-18 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-vd-cream border border-vd-forest/10 mb-4 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-vd-forest animate-pulse" />
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-vd-forest">
              Our Vision
            </span>
          </div>

          <h2 className="text-display text-vd-forest mb-5">
            Reimagining Healthcare for{" "}
            <span className="text-vd-sage font-medium">Every Human Being</span>
          </h2>

          <p className="text-base sm:text-lg text-vd-muted max-w-2xl mx-auto font-light leading-relaxed">
            We are building an intelligent, connected digital health network that puts human
            dignity and continuous wellness at the center of medicine.
          </p>
        </div>

        {/* 3 Concise Principle Cards */}
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8 mb-12">
          {principles.map((p) => (
            <div
              key={p.tag}
              className="apple-glass rounded-3xl p-8 sm:p-9 relative border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group bg-white/80"
            >
              <div>
                <span className="text-xs font-bold uppercase tracking-[0.2em] text-vd-sage mb-4 inline-block">
                  {p.tag}
                </span>

                <h3 className="font-heading text-xl sm:text-2xl font-semibold text-vd-forest mb-3 leading-snug">
                  &ldquo;{p.quote}&rdquo;
                </h3>

                <p className="text-xs sm:text-sm text-vd-muted font-light leading-relaxed">
                  {p.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-vd-forest" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-vd-muted">
                  Core Principle
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Vision Link CTA */}
        <div className="text-center">
          <Link
            href="/vision"
            className="inline-flex items-center gap-2 text-sm font-semibold text-vd-forest hover:text-vd-sage transition-colors group"
          >
            <span>Read Our Full Vision & Philosophy</span>
            <svg
              className="w-4 h-4 group-hover:translate-x-1 transition-transform"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}

