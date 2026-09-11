"use client";

import React from "react";
import Link from "next/link";
import {
  Stethoscope,
  Building2,
  Building,
  Activity,
  Pill,
  Home,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from "lucide-react";

export default function QuickServiceDiscovery() {
  const discoveryServices = [
    {
      id: "doctor",
      title: "Find a Doctor",
      desc: "Book confirmed in-person or video appointments with verified specialists",
      badge: "Verified Doctors",
      href: "/patient/doctors",
      icon: Stethoscope,
      accent: "bg-emerald-50 text-emerald-700 border-emerald-200/60 group-hover:border-emerald-500",
      pillColor: "bg-emerald-100/80 text-emerald-800",
    },
    {
      id: "hospital",
      title: "Hospitals",
      desc: "Find multi-specialty hospitals with 24/7 emergency & ICU support",
      badge: "24/7 Care",
      href: "/patient/hospitals",
      icon: Building2,
      accent: "bg-blue-50 text-blue-700 border-blue-200/60 group-hover:border-blue-500",
      pillColor: "bg-blue-100/80 text-blue-800",
    },
    {
      id: "clinic",
      title: "Clinics",
      desc: "Locate neighborhood clinics for family healthcare and routine checkups",
      badge: "Neighborhood",
      href: "/patient/clinics",
      icon: Building,
      accent: "bg-sky-50 text-sky-700 border-sky-200/60 group-hover:border-sky-500",
      pillColor: "bg-sky-100/80 text-sky-800",
    },
    {
      id: "diagnostics",
      title: "Diagnostics",
      desc: "Book blood tests, scans & comprehensive health packages with home collection",
      badge: "Home Sample Pickup",
      href: "/patient/diagnostics",
      icon: Activity,
      accent: "bg-purple-50 text-purple-700 border-purple-200/60 group-hover:border-purple-500",
      pillColor: "bg-purple-100/80 text-purple-800",
    },
    {
      id: "pharmacy",
      title: "Pharmacy",
      desc: "Order 100% genuine medicines & healthcare essentials with doorstep delivery",
      badge: "Genuine Medicines",
      href: "/patient/pharmacy",
      icon: Pill,
      accent: "bg-amber-50 text-amber-700 border-amber-200/60 group-hover:border-amber-500",
      pillColor: "bg-amber-100/80 text-amber-800",
    },
    {
      id: "home-care",
      title: "Home Healthcare",
      desc: "Request certified home doctor visits, nursing assistance, and physiotherapy",
      badge: "Doorstep Visits",
      href: "/patient/doctors?mode=in_person",
      icon: Home,
      accent: "bg-rose-50 text-rose-700 border-rose-200/60 group-hover:border-rose-500",
      pillColor: "bg-rose-100/80 text-rose-800",
    },
    {
      id: "wellness",
      title: "Wellness",
      desc: "Discover fitness studios, yoga centers, and personalized nutrition consultations",
      badge: "Holistic Health",
      href: "/wellness",
      icon: Sparkles,
      accent: "bg-teal-50 text-teal-700 border-teal-200/60 group-hover:border-teal-500",
      pillColor: "bg-teal-100/80 text-teal-800",
    },
  ];

  return (
    <section className="py-16 sm:py-20 bg-white border-b border-stone-100" id="quick-services">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Heading */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/60 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-vd-forest">
                Quick Service Discovery
              </span>
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-vd-forest tracking-tight">
              What are you looking for today?
            </h2>
            <p className="text-sm sm:text-base text-stone-500 font-normal mt-1.5 max-w-xl">
              Select a healthcare category to instantly compare, locate, and book appointments.
            </p>
          </div>

          <Link
            href="/patient"
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-bold text-vd-forest hover:text-vd-forest-deep transition-colors mt-4 md:mt-0"
          >
            <span>Browse All Services</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 7 Discovery Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {discoveryServices.map((service, index) => {
            const Icon = service.icon;
            // The first card (Doctor) spans 2 cols on xl if desired, or all 7 balanced
            const isFeatured = index === 0;

            return (
              <Link
                key={service.id}
                href={service.href}
                className={`group relative p-5 sm:p-6 rounded-2xl bg-white border border-stone-200/80 hover:border-vd-forest/40 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between hover:-translate-y-1 ${
                  isFeatured ? "sm:col-span-2 xl:col-span-2 bg-gradient-to-br from-emerald-50/40 via-white to-white" : ""
                }`}
              >
                <div>
                  {/* Top Bar: Icon & Tag */}
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all group-hover:scale-105 ${service.accent}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full ${service.pillColor}`}
                    >
                      {service.badge}
                    </span>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-heading text-xl font-bold text-stone-900 group-hover:text-vd-forest transition-colors mb-2">
                    {service.title}
                  </h3>
                  <p className="text-xs sm:text-[13px] text-stone-600 font-normal leading-relaxed">
                    {service.desc}
                  </p>
                </div>

                {/* Bottom CTA Indicator */}
                <div className="mt-5 pt-3.5 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-vd-forest">
                  <span>Explore & Book</span>
                  <div className="w-6 h-6 rounded-full bg-stone-50 group-hover:bg-vd-forest group-hover:text-white flex items-center justify-center transition-colors">
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
