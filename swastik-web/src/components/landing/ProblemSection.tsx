"use client";

import React from "react";

const fragments = [
  {
    icon: "👨‍⚕️",
    title: "Consultations in silos",
    desc: "Doctor appointments and notes trapped in disconnected clinic software.",
    badge: "Fragmented",
  },
  {
    icon: "📑",
    title: "Scattered reports",
    desc: "Lab results, MRI scans, and blood tests stored across physical paper and PDFs.",
    badge: "Disconnected",
  },
  {
    icon: "💊",
    title: "Manual prescriptions",
    desc: "Visiting pharmacies with handwritten notes, uncertain stock, and manual tracking.",
    badge: "Friction",
  },
  {
    icon: "🚨",
    title: "Delayed emergency aid",
    desc: "Searching for emergency contacts during critical seconds without live dispatch.",
    badge: "High Risk",
  },
];

export default function ProblemSection() {
  return (
    <section className="py-20 sm:py-28 bg-vd-cream relative overflow-hidden" id="problem">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10">
        {/* Section Pill */}
        <div className="text-center mb-12 sm:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full apple-glass shadow-xs mb-4">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-vd-forest/90">
              The Reality of Healthcare
            </span>
          </div>

          <h2 className="font-heading text-3xl sm:text-5xl md:text-6xl text-vd-forest font-semibold mb-6 tracking-tight">
            Healthcare shouldn&apos;t feel{" "}
            <span className="text-vd-forest-deep italic font-normal">fragmented.</span>
          </h2>
          <p className="text-base sm:text-lg text-vd-muted max-w-2xl mx-auto font-light leading-relaxed">
            When every provider, lab, pharmacy, and ambulance operates in isolation,
            patients carry the burden of connecting the dots during stressful moments.
          </p>
        </div>

        {/* Fragmented Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-14">
          {fragments.map((frag, idx) => (
            <div
              key={frag.title}
              className="apple-glass rounded-3xl p-6 sm:p-7 relative border border-white/80 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:-translate-y-1 transition-all duration-300 group"
              style={{ animationDelay: `${idx * 150}ms` }}
            >
              <div className="flex justify-between items-start mb-5">
                <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform">
                  {frag.icon}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200/60">
                  {frag.badge}
                </span>
              </div>
              <h3 className="font-heading text-lg font-semibold text-vd-forest mb-2">
                {frag.title}
              </h3>
              <p className="text-xs sm:text-sm text-vd-muted font-light leading-relaxed">
                {frag.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Transition Bridge Card */}
        <div className="max-w-3xl mx-auto text-center p-6 sm:p-8 rounded-3xl bg-white/70 backdrop-blur-xl border border-white shadow-[0_12px_40px_rgba(15,95,80,0.06)]">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-vd-sage mb-2">
            The Transformation
          </p>
          <h3 className="font-heading text-2xl sm:text-3xl text-vd-forest font-semibold">
            Vaididea brings it together.
          </h3>
          <p className="text-sm text-vd-muted max-w-lg mx-auto font-light mt-2 leading-relaxed">
            Replacing disconnected islands with one fluid, synchronized health network that
            keeps everyone informed in real-time.
          </p>
        </div>
      </div>
    </section>
  );
}
