"use client";

import React from "react";
import Link from "next/link";
import {
  Home,
  UserCheck,
  HeartHandshake,
  Activity,
  ShieldCheck,
  ArrowRight,
  Clock,
  CheckCircle2
} from "lucide-react";

export default function HomeHealthcareSection() {
  const homeServices = [
    {
      title: "Doctor Home Visit",
      desc: "Experienced general physicians and specialists visit your home for thorough clinical assessment and acute care.",
      badge: "In-Person Doctor",
      icon: UserCheck,
      accent: "bg-emerald-50 text-emerald-700",
    },
    {
      title: "Nursing Care",
      desc: "Post-operative dressing, IV administration, catheter maintenance, and critical palliative nursing by certified professionals.",
      badge: "Certified Nurses",
      icon: HeartHandshake,
      accent: "bg-blue-50 text-blue-700",
    },
    {
      title: "Physiotherapy",
      desc: "Tailored rehabilitation for orthopedic recovery, stroke recovery, neurological mobility, and sports injuries.",
      badge: "Targeted Rehab",
      icon: Activity,
      accent: "bg-purple-50 text-purple-700",
    },
    {
      title: "Elderly Caregiver",
      desc: "Compassionate bedside assistance, vital tracking, medication reminders, and mobility support for senior family members.",
      badge: "Compassionate Care",
      icon: Home,
      accent: "bg-rose-50 text-rose-700",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-vd-cream/50 relative overflow-hidden" id="home-healthcare">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200/60 mb-3">
              <Home className="w-3.5 h-3.5 text-rose-700" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-rose-800">
                Home Health & Nursing
              </span>
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-vd-forest tracking-tight">
              Healthcare at your doorstep
            </h2>
            <p className="text-sm sm:text-base text-stone-600 font-normal mt-2 max-w-2xl">
              Professional, certified medical and nursing care delivered with warmth in the safety of your home.
            </p>
          </div>

          <Link
            href="/patient/doctors?mode=in_person"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vd-forest text-white text-xs sm:text-sm font-semibold hover:bg-vd-forest-deep transition-all shadow-xs mt-4 md:mt-0 w-fit shrink-0"
          >
            <span>Book Home Visit</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4 Service Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {homeServices.map((svc) => {
            const Icon = svc.icon;
            return (
              <div
                key={svc.title}
                className="p-6 rounded-2xl bg-white border border-stone-200/80 hover:border-vd-forest/40 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${svc.accent} group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                      {svc.badge}
                    </span>
                  </div>

                  <h3 className="font-heading text-xl font-bold text-stone-900 group-hover:text-vd-forest transition-colors mb-2">
                    {svc.title}
                  </h3>
                  <p className="text-xs text-stone-500 font-light leading-relaxed mb-4">
                    {svc.desc}
                  </p>
                </div>

                <Link
                  href="/patient/doctors?mode=in_person"
                  className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-vd-forest group-hover:text-vd-forest-deep"
                >
                  <span>Request Caregiver</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
