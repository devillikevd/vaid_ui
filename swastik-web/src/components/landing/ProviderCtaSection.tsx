"use client";

import React from "react";
import Link from "next/link";

export default function ProviderCtaSection() {
  const providerButtons = [
    { label: "Doctor", href: "/register/doctor" },
    { label: "Hospital", href: "/register/hospital" },
    { label: "Clinic", href: "/register/clinic" },
    { label: "Diagnostics", href: "/register/diagnostic-center" },
    { label: "Pharmacy", href: "/register/pharmacy" },
  ];

  return (
    <section className="py-8 sm:py-10 bg-stone-50/70 border-b border-stone-200/80" id="providers">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-stone-200 shadow-2xs">
          <div>
            <h3 className="font-heading text-lg sm:text-xl font-bold text-vd-forest">
              Are you a healthcare provider?
            </h3>
            <p className="text-xs sm:text-sm text-stone-500 mt-0.5">
              Join Vaididea and connect with patients looking for healthcare services.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {providerButtons.map((btn) => (
              <Link
                key={btn.label}
                href={btn.href}
                className="px-3 py-1.5 rounded-lg bg-stone-100 hover:bg-vd-forest hover:text-white text-stone-700 text-xs font-semibold transition-colors"
              >
                {btn.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
