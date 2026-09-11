"use client";

import React from "react";

const benefits = [
  {
    num: "01",
    title: "Connected Care",
    desc: "Instant synchronization between doctors, diagnostic labs, pharmacies, and patients without lost records or repeat paperwork.",
    icon: (
      <svg className="w-6 h-6 text-vd-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
      </svg>
    ),
  },
  {
    num: "02",
    title: "Intelligent Assistance",
    desc: "AI triage, ICD-10 medical intelligence, smart symptom checks, and proactive follow-up recommendations at your fingertips.",
    icon: (
      <svg className="w-6 h-6 text-vd-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
      </svg>
    ),
  },
  {
    num: "03",
    title: "Simplified Healthcare",
    desc: "Single secure health identity, unified medical vaults, transparent pricing, and instant one-tap emergency workflows.",
    icon: (
      <svg className="w-6 h-6 text-vd-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
];

export default function SolutionSection() {
  return (
    <section className="py-20 sm:py-28 bg-white relative overflow-hidden" id="solution">
      {/* Soft ambient background glow */}
      <div className="absolute inset-0 pointer-events-none opacity-40">
        <div className="siri-orb-1 w-[40vw] h-[40vw] top-[10%] left-[-10%]" />
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full apple-glass shadow-xs mb-4">
            <span className="w-2 h-2 rounded-full bg-vd-forest animate-pulse" />
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-vd-forest/90">
              The Vaididea Solution
            </span>
          </div>

          <h2 className="text-display text-vd-forest mb-6 max-w-3xl mx-auto">
            One ecosystem. Every part of your{" "}
            <span className="text-vd-sage font-medium">healthcare journey.</span>
          </h2>

          <p className="text-base sm:text-lg text-vd-muted max-w-2xl mx-auto font-light leading-relaxed">
            Vaididea seamlessly connects patients, practitioners, facilities, pharmacies, and
            emergency response through a single, secure architecture built for human wellness.
          </p>
        </div>

        {/* 3 Core Benefits Grid */}
        <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
          {benefits.map((b) => (
            <div
              key={b.num}
              className="apple-glass rounded-3xl p-8 sm:p-9 relative border border-gray-100 shadow-[0_10px_30px_rgba(0,0,0,0.03)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col group bg-white/70"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100/70 flex items-center justify-center group-hover:scale-110 transition-transform">
                  {b.icon}
                </div>
                <span className="font-heading text-2xl text-vd-forest/20 group-hover:text-vd-sage transition-colors font-light">
                  {b.num}
                </span>
              </div>

              <h3 className="font-heading text-2xl font-semibold text-vd-forest mb-3">
                {b.title}
              </h3>
              <p className="text-sm text-vd-muted font-light leading-relaxed">
                {b.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
