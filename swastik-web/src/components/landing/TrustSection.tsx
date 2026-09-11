"use client";

import React from "react";
import { ShieldCheck, Lock, Video, CalendarCheck, Shield } from "lucide-react";

export default function TrustSection() {
  const points = [
    {
      title: "Verified Healthcare Providers",
      desc: "Every doctor, clinic, and medical institution is credential-checked and verified.",
      icon: ShieldCheck,
    },
    {
      title: "Secure Health Information",
      desc: "Compliant encrypted records and confidential consultation privacy.",
      icon: Lock,
    },
    {
      title: "Online & In-Person Care",
      desc: "Choose seamlessly between remote video consultations and physical clinic visits.",
      icon: Video,
    },
    {
      title: "Transparent Appointment Booking",
      desc: "Real-time calendar slots, upfront consultation fees, and zero hidden charges.",
      icon: CalendarCheck,
    },
  ];

  return (
    <section className="py-12 sm:py-14 bg-white border-b border-stone-200/80" id="trust-security">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200/60">
            <Shield className="w-3.5 h-3.5" />
            <span>Trust & Security</span>
          </div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-vd-forest tracking-tight">
            Built on trust, safety, and privacy
          </h2>
          <p className="text-xs sm:text-sm text-stone-600 mt-1.5 font-light">
            Providing a reliable, encrypted healthcare ecosystem for patients and medical providers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {points.map((p) => {
            const Icon = p.icon;
            return (
              <div
                key={p.title}
                className="p-5 rounded-2xl bg-stone-50/70 border border-stone-200/80 shadow-2xs flex flex-col justify-between hover:bg-white hover:border-vd-forest/40 transition-all duration-200"
              >
                <div>
                  <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100 text-vd-forest flex items-center justify-center mb-3">
                    <Icon className="w-4.5 h-4.5" />
                  </div>
                  <h3 className="font-heading text-sm font-bold text-stone-900 mb-1 leading-snug">
                    {p.title}
                  </h3>
                  <p className="text-xs text-stone-500 font-light leading-relaxed">
                    {p.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
