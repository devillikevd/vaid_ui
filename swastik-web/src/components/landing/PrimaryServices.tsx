"use client";

import React from "react";
import Link from "next/link";
import {
  Stethoscope,
  Building2,
  Building,
  Activity,
  Pill,
  ArrowRight
} from "lucide-react";

export default function PrimaryServices() {
  const services = [
    {
      title: "Doctors",
      desc: "Find & book doctor consultations",
      href: "/patient/doctors",
      icon: Stethoscope,
      iconBg: "bg-emerald-50 text-emerald-700",
    },
    {
      title: "Hospitals",
      desc: "Find hospitals near your locality",
      href: "/patient/hospitals",
      icon: Building2,
      iconBg: "bg-blue-50 text-blue-700",
    },
    {
      title: "Clinics",
      desc: "Explore nearby clinic centers",
      href: "/patient/clinics",
      icon: Building,
      iconBg: "bg-sky-50 text-sky-700",
    },
    {
      title: "Diagnostics",
      desc: "Book pathology tests & packages",
      href: "/patient/diagnostics",
      icon: Activity,
      iconBg: "bg-purple-50 text-purple-700",
    },
    {
      title: "Pharmacy",
      desc: "Medicines & prescription orders",
      href: "/patient/pharmacy",
      icon: Pill,
      iconBg: "bg-amber-50 text-amber-700",
    },
  ];

  return (
    <section className="py-10 sm:py-12 bg-white border-b border-stone-100" id="primary-services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-vd-forest tracking-tight">
            What are you looking for?
          </h2>
        </div>

        {/* 5 Cohesive Unified Service Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {services.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group p-4 rounded-2xl bg-stone-50/50 hover:bg-white border border-stone-200/80 hover:border-vd-forest/40 shadow-2xs hover:shadow-sm transition-all duration-200 flex flex-col justify-between hover:-translate-y-0.5"
              >
                <div>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105 ${item.iconBg}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="font-heading text-base font-bold text-stone-900 group-hover:text-vd-forest transition-colors">
                    {item.title}
                  </h3>
                  <p className="text-[11px] sm:text-xs text-stone-500 font-normal mt-0.5 leading-snug">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-4 pt-2.5 border-t border-stone-100 flex items-center justify-between text-[11px] font-bold text-vd-forest">
                  <span>Explore</span>
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
