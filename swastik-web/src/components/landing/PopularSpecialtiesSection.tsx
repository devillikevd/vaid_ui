"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Layers } from "lucide-react";

export default function PopularSpecialtiesSection() {
  const specialties = [
    {
      name: "Cardiology",
      subtitle: "Heart & Vascular Care",
      image: "/images/specialties/cardiology.webp",
      href: "/doctors?specialty=Cardiology",
      alt: "Cardiology heart and vascular medical care",
    },
    {
      name: "Neurology",
      subtitle: "Brain & Nerve Health",
      image: "/images/specialties/neurology.webp",
      href: "/doctors?specialty=Neurology",
      alt: "Neurology brain and nerve healthcare",
    },
    {
      name: "Orthopedics",
      subtitle: "Joints, Bones & Spine",
      image: "/images/specialties/orthopedics.webp",
      href: "/doctors?specialty=Orthopedics",
      alt: "Orthopedics bones, joints, and spine care",
    },
    {
      name: "Pediatrics",
      subtitle: "Child & Infant Care",
      image: "/images/specialties/pediatrics.webp",
      href: "/doctors?specialty=Pediatrics",
      alt: "Pediatrics child and infant medical care",
    },
    {
      name: "Ophthalmology",
      subtitle: "Eye Care & Vision",
      image: "/images/specialties/ophthalmology.webp",
      href: "/doctors?specialty=Ophthalmology",
      alt: "Ophthalmology eye care and vision health",
    },
    {
      name: "Dentistry",
      subtitle: "Dental Care & Oral Health",
      image: "/images/specialties/dentistry.webp",
      href: "/doctors?specialty=Dentist",
      alt: "Dentistry dental and oral health care",
    },
  ];

  return (
    <section
      className="py-8 sm:py-14 bg-stone-50/50 border-b border-stone-200/80"
      id="specialties"
    >
      <div className="max-w-7xl mx-auto">
        {/* ── Section Header ── */}
        <div className="px-4 sm:px-6 lg:px-8 mb-5 sm:mb-8 flex items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-200/60">
              <Layers className="w-3.5 h-3.5" />
              <span>Medical Specialties</span>
            </div>
            <h2 className="font-heading text-xl sm:text-3xl md:text-4xl font-bold text-vd-forest tracking-tight">
              Popular Specialties
            </h2>
          </div>

          {/* View All — right-aligned, all breakpoints */}
          <Link
            href="/specialties"
            className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-vd-forest hover:text-vd-forest-deep transition-colors"
            aria-label="View all specialties"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* ══════════════════════════════════════════════════════════
            MOBILE (<sm): Horizontal scroll-snap carousel
            ══════════════════════════════════════════════════════════ */}
        <div
          className="sm:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory scrollbar-none pb-4 px-4"
          role="list"
          aria-label="Medical specialties carousel"
        >
          {specialties.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              role="listitem"
              aria-label={`Find ${item.name} doctors`}
              className="snap-start shrink-0 w-[76vw] max-w-[280px] flex flex-col justify-between bg-white rounded-2xl border border-stone-200/90 hover:border-vd-forest/50 hover:shadow-md transition-all duration-200 group cursor-pointer overflow-hidden"
            >
              {/* Image — 4:3 ratio, fills top of card */}
              <div className="relative w-full aspect-[4/3] overflow-hidden bg-stone-50/80 border-b border-stone-100">
                <Image
                  src={item.image}
                  alt={item.alt || item.name}
                  fill
                  sizes="76vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              {/* Card body */}
              <div className="p-3">
                <h3 className="font-heading text-sm font-bold text-stone-900 group-hover:text-vd-forest transition-colors mb-0.5">
                  {item.name}
                </h3>
                <p className="text-[11px] text-stone-500 font-normal line-clamp-1 mb-2.5">
                  {item.subtitle}
                </p>

                {/* Find Doctors CTA */}
                <div className="flex items-center justify-between text-[11px] font-semibold text-vd-forest pt-2 border-t border-stone-100">
                  <span>Find Doctors</span>
                  <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
                </div>
              </div>
            </Link>
          ))}

          {/* Trailing spacer so last card peek doesn't press against edge */}
          <div className="shrink-0 w-2" aria-hidden="true" />
        </div>

        {/* ══════════════════════════════════════════════════════════
            DESKTOP / TABLET (sm+): Original 6-column grid — UNCHANGED
            ══════════════════════════════════════════════════════════ */}
        <div className="hidden sm:grid sm:px-6 lg:px-8 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {specialties.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="p-3 sm:p-3.5 rounded-xl sm:rounded-2xl border border-stone-200/90 bg-white hover:border-vd-forest/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer h-full"
              aria-label={`Find ${item.name} doctors`}
            >
              <div>
                {/* Compact Image Container */}
                <div className="relative w-full aspect-[16/11] rounded-lg sm:rounded-xl overflow-hidden bg-stone-50/80 border border-stone-100 mb-2.5 flex items-center justify-center p-1">
                  <Image
                    src={item.image}
                    alt={item.alt || item.name}
                    fill
                    sizes="(max-width: 1024px) 33vw, 16vw"
                    className="object-cover rounded-lg group-hover:scale-105 transition-transform duration-300"
                  />
                </div>

                <h3 className="font-heading text-xs sm:text-sm font-bold text-stone-900 group-hover:text-vd-forest transition-colors mb-0.5 truncate">
                  {item.name}
                </h3>
                <p className="text-[11px] text-stone-500 font-normal line-clamp-1">
                  {item.subtitle}
                </p>
              </div>

              <div className="mt-2.5 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] font-semibold text-vd-forest group-hover:text-vd-forest-deep">
                <span>Find Doctors</span>
                <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
