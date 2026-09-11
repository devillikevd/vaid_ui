"use client";

import React from "react";
import Link from "next/link";
import {
  Activity,
  Microscope,
  HeartPulse,
  Droplet,
  ArrowRight
} from "lucide-react";

export default function DiagnosticsSection() {
  const categories = [
    {
      title: "Full Body Checkup",
      desc: "Vital health assessment and screening panels",
      icon: HeartPulse,
      accent: "bg-purple-50 text-purple-700",
    },
    {
      title: "Blood Tests",
      desc: "CBC, lipid profile, metabolic and routine tests",
      icon: Droplet,
      accent: "bg-rose-50 text-rose-700",
    },
    {
      title: "Diabetes Tests",
      desc: "HbA1c, fasting glucose and blood sugar monitoring",
      icon: Activity,
      accent: "bg-blue-50 text-blue-700",
    },
    {
      title: "Thyroid Tests",
      desc: "T3, T4 and TSH thyroid hormone evaluation",
      icon: Microscope,
      accent: "bg-teal-50 text-teal-700",
    },
  ];

  return (
    <section className="py-12 sm:py-16 bg-vd-cream/30 border-b border-stone-100" id="diagnostics">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-heading text-2xl sm:text-3xl font-bold text-vd-forest tracking-tight">
              Health tests, made easy
            </h2>
            <p className="text-xs sm:text-sm text-stone-500 font-normal mt-1">
              Discover and book essential pathology tests and health packages.
            </p>
          </div>

          <Link
            href="/patient/diagnostics"
            className="text-xs font-bold text-vd-forest hover:text-vd-forest-deep flex items-center gap-1 shrink-0"
          >
            <span>Explore diagnostics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* 4 Compact Category Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.title}
                href="/patient/diagnostics"
                className="p-4 sm:p-5 rounded-2xl bg-white border border-stone-200/80 hover:border-vd-forest/30 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${cat.accent}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading text-base font-bold text-stone-900 group-hover:text-vd-forest transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs text-stone-500 mt-1 leading-snug">
                    {cat.desc}
                  </p>
                </div>

                <div className="mt-4 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] font-bold text-vd-forest">
                  <span>View Details</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
