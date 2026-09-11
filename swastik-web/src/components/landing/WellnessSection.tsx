"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  Dumbbell,
  Flower2,
  Apple,
  ShieldAlert,
  ArrowRight,
  HeartHandshake,
  CheckCircle2
} from "lucide-react";

export default function WellnessSection() {
  const wellnessCategories = [
    {
      title: "Fitness & Gyms",
      desc: "Top certified fitness clubs, strength training gyms, and dedicated personal trainers near you.",
      badge: "Active Fitness",
      href: "/fitness-center",
      icon: Dumbbell,
      accent: "bg-emerald-50 text-emerald-700",
    },
    {
      title: "Yoga & Studios",
      desc: "Traditional yoga postures, guided pranayama breathing, and holistic mind-body meditation sessions.",
      badge: "Mind & Body",
      href: "/wellness",
      icon: Flower2,
      accent: "bg-teal-50 text-teal-700",
    },
    {
      title: "Diet & Nutrition",
      desc: "Personalized clinical diet plans, metabolic weight management, and lifestyle disease prevention.",
      badge: "Clinical Diet",
      href: "/wellness",
      icon: Apple,
      accent: "bg-amber-50 text-amber-700",
    },
    {
      title: "Wellness Centers",
      desc: "Ayurvedic panchakarma retreats, holistic healing spas, and restorative wellness therapies.",
      badge: "Holistic Healing",
      href: "/wellness",
      icon: Sparkles,
      accent: "bg-purple-50 text-purple-700",
    },
  ];

  return (
    <section className="py-16 sm:py-24 bg-white border-b border-stone-100" id="wellness-discovery">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 sm:mb-12">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200/60 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-teal-700" />
              <span className="text-[11px] font-semibold tracking-wider uppercase text-teal-800">
                Preventive Health & Vitality
              </span>
            </div>
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-vd-forest tracking-tight">
              Stay healthy, stay active
            </h2>
            <p className="text-sm sm:text-base text-stone-600 font-normal mt-2 max-w-2xl">
              Nurture your daily health through verified fitness centers, certified yoga studios, and clinical nutritionists.
            </p>
          </div>

          <Link
            href="/wellness"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-vd-forest text-white text-xs sm:text-sm font-semibold hover:bg-vd-forest-deep transition-all shadow-xs mt-4 md:mt-0 w-fit shrink-0"
          >
            <span>Explore Wellness</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {wellnessCategories.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.title}
                href={item.href}
                className="group p-6 rounded-2xl bg-white border border-stone-200/80 hover:border-vd-forest/40 shadow-xs hover:shadow-lg transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.accent} group-hover:scale-105 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-stone-100 text-stone-700">
                      {item.badge}
                    </span>
                  </div>

                  <h3 className="font-heading text-xl font-bold text-stone-900 group-hover:text-vd-forest transition-colors mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs text-stone-500 font-light leading-relaxed mb-4">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs font-bold text-vd-forest">
                  <span>Discover Center</span>
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
