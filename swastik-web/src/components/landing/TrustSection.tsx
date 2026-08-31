"use client";

import React from "react";

const trustPillars = [
  {
    icon: "🛡️",
    title: "Privacy First",
    desc: "Your medical records, prescriptions, and consultation history remain strictly patient-owned with granular consent controls and encrypted storage.",
  },
  {
    icon: "🩺",
    title: "Verified Providers",
    desc: "Every practitioner, hospital, clinic, diagnostic lab, and pharmacy undergoes structured profile and credential verification prior to onboarding.",
  },
  {
    icon: "💡",
    title: "Intelligent Assistance",
    desc: "AI triage and health library tools are built to support clinical decision-making and patient education without replacing qualified medical advice.",
  },
  {
    icon: "🔄",
    title: "Connected Care",
    desc: "Unified interoperability allows vital health summaries to move with you seamlessly while maintaining rigorous access logs and data safeguards.",
  },
];

export default function TrustSection() {
  return (
    <section className="py-20 sm:py-28 bg-vd-cream relative overflow-hidden" id="trust">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full apple-glass shadow-xs mb-4">
            <span className="w-2 h-2 rounded-full bg-vd-forest animate-pulse" />
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-vd-forest/90">
              Security & Integrity
            </span>
          </div>

          <h2 className="font-heading text-3xl sm:text-5xl md:text-6xl text-vd-forest font-semibold mb-5 tracking-tight">
            Built around{" "}
            <em className="text-vd-sage italic font-normal">trust.</em>
          </h2>

          <p className="text-base sm:text-lg text-vd-muted max-w-2xl mx-auto font-light leading-relaxed">
            Healthcare technology requires the highest standard of accountability, confidentiality,
            and clinical integrity at every layer of the platform.
          </p>
        </div>

        {/* 4 Trust Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {trustPillars.map((pillar) => (
            <div
              key={pillar.title}
              className="apple-glass rounded-3xl p-7 relative border border-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.03)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group bg-white/70"
            >
              <div>
                <span className="text-3xl sm:text-4xl mb-5 inline-block group-hover:scale-110 transition-transform">
                  {pillar.icon}
                </span>

                <h3 className="font-heading text-xl font-semibold text-vd-forest mb-3">
                  {pillar.title}
                </h3>

                <p className="text-xs sm:text-sm text-vd-muted font-light leading-relaxed">
                  {pillar.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100/80 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-vd-sage" />
                <span className="text-[10px] uppercase font-bold tracking-wider text-vd-forest/80">
                  Standard Practice
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
