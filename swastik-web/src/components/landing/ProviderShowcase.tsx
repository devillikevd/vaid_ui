"use client";

import React, { useState } from "react";
import Link from "next/link";

const providerCards = [
  {
    id: "hospital",
    name: "Hospital",
    icon: "🏥",
    desc: "Facility management, departments, bed occupancy, and emergency dispatch.",
    registerHref: "/register/hospital",
    loginHref: "/login/hospital",
    badge: "Facility Hub",
  },
  {
    id: "doctor",
    name: "Doctor",
    icon: "👨‍⚕️",
    desc: "Personal clinical workstation, schedule management, video visits, and prescriptions.",
    registerHref: "/register/doctor",
    loginHref: "/login/doctor",
    badge: "Practitioner",
  },
  {
    id: "clinic",
    name: "Clinic",
    icon: "⚕️",
    desc: "Multi-doctor practice administration, daily calendars, and patient queue rosters.",
    registerHref: "/register/clinic",
    loginHref: "/login/clinic",
    badge: "Practice Hub",
  },
  {
    id: "pharmacy",
    name: "Pharmacy",
    icon: "💊",
    desc: "Direct digital prescription fulfillment, live inventory, and order dispatch.",
    registerHref: "/register/pharmacy",
    loginHref: "/login/pharmacy",
    badge: "Fulfillment",
  },
  {
    id: "diagnostics",
    name: "Diagnostics",
    icon: "🔬",
    desc: "Test catalog pricing, lab booking workflows, and instant digital report publishing.",
    registerHref: "/register/diagnostic-center",
    loginHref: "/login/diagnostic-center",
    badge: "Laboratory",
  },
  {
    id: "wellness",
    name: "Wellness Coach",
    icon: "🏋️",
    desc: "Workout plans, dietary guidance, client adherence monitoring, and video sessions.",
    registerHref: "/register/wellness",
    loginHref: "/login/wellness",
    badge: "Coaching",
  },
  {
    id: "fitness-center",
    name: "Gym & Studio",
    icon: "🏢",
    desc: "Facility schedules, trainer rosters, member passes, and contactless QR check-ins.",
    registerHref: "/register/fitness-center",
    loginHref: "/login/fitness-center",
    badge: "Facility",
  },
];

export default function ProviderShowcase() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  return (
    <section className="py-20 sm:py-28 bg-vd-cream relative overflow-hidden" id="provider-portals">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-14 sm:mb-18">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full apple-glass shadow-xs mb-4">
            <span className="w-2 h-2 rounded-full bg-vd-forest animate-pulse" />
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-vd-forest/90">
              Provider Network
            </span>
          </div>

          <h2 className="font-heading text-3xl sm:text-5xl md:text-6xl text-vd-forest font-semibold mb-5 tracking-tight">
            Built for every{" "}
            <em className="text-vd-sage italic font-normal">healthcare provider.</em>
          </h2>

          <p className="text-base sm:text-lg text-vd-muted max-w-2xl mx-auto font-light leading-relaxed">
            Whether you run a multi-specialty hospital or an independent practice, Vaididea
            delivers dedicated tools crafted for your daily operational workflow.
          </p>
        </div>

        {/* 7 Provider Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 mb-14">
          {providerCards.map((card) => (
            <div
              key={card.id}
              className="apple-glass rounded-3xl p-6 sm:p-7 relative border border-white/80 shadow-[0_8px_24px_rgba(0,0,0,0.03)] hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group bg-white/70"
            >
              <div>
                <div className="flex justify-between items-start mb-5">
                  <span className="text-3xl sm:text-4xl group-hover:scale-110 transition-transform">
                    {card.icon}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-vd-forest/5 text-vd-forest border border-vd-forest/10">
                    {card.badge}
                  </span>
                </div>

                <h3 className="font-heading text-xl font-semibold text-vd-forest mb-2">
                  {card.name}
                </h3>
                <p className="text-xs sm:text-sm text-vd-muted font-light leading-relaxed mb-6">
                  {card.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-gray-100/80 flex items-center justify-between">
                <Link
                  href={card.registerHref}
                  className="text-xs font-bold text-vd-forest hover:text-vd-sage transition-colors inline-flex items-center gap-1 group/link"
                >
                  <span>Explore Portal</span>
                  <svg
                    className="w-3.5 h-3.5 group-hover/link:translate-x-0.5 transition-transform"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
                <Link
                  href={card.loginHref}
                  className="text-[11px] font-medium text-vd-muted hover:text-vd-forest transition-colors"
                >
                  Login
                </Link>
              </div>
            </div>
          ))}

          {/* Quick Access Card */}
          <div className="apple-glass rounded-3xl p-6 sm:p-7 relative border border-emerald-200/80 shadow-[0_8px_24px_rgba(15,95,80,0.06)] flex flex-col justify-between bg-gradient-to-br from-white/90 to-emerald-50/50">
            <div>
              <div className="w-10 h-10 rounded-2xl bg-vd-forest text-white flex items-center justify-center font-bold text-lg mb-5">
                🔐
              </div>
              <h3 className="font-heading text-xl font-semibold text-vd-forest mb-2">
                Already Registered?
              </h3>
              <p className="text-xs sm:text-sm text-vd-muted font-light leading-relaxed mb-6">
                Access your unified workspace directly and manage your patient flow.
              </p>
            </div>
            <Link
              href="/login"
              className="w-full py-3 bg-vd-forest text-white rounded-xl text-center text-xs font-bold tracking-wide hover:bg-vd-forest-deep transition-all shadow-xs"
            >
              Provider Login →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
