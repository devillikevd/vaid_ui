"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
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
      className="py-10 sm:py-16 bg-[#F8F9FA] relative overflow-hidden"
      id="specialties"
    >
      <div className="max-w-7xl mx-auto relative z-10">
        {/* ── Section Header ── */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="px-4 sm:px-6 lg:px-8 mb-8 sm:mb-12 flex flex-col items-center justify-center gap-4 text-center"
        >
          <div>
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-vd-forest text-white text-[13px] font-bold tracking-wide mb-3">
              <Layers className="w-4 h-4" />
              <span>Top Specialties</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#111827] tracking-tight">
              Highlighting the <span className="text-vd-forest">Care & Support</span>
            </h2>
          </div>
        </motion.div>

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
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.1 }}
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.15 } }
          }}
          className="hidden sm:grid sm:px-6 lg:px-8 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-6"
        >
          {specialties.map((item, index) => (
            <motion.div
              key={item.name}
              variants={{
                hidden: { opacity: 0, y: 30, scale: 0.95 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5, type: "spring", bounce: 0.3 } }
              }}
              className="h-full"
            >
              <Link
                href={item.href}
                className="p-4 rounded-[20px] bg-white border border-gray-100 hover:border-vd-forest/30 shadow-sm hover:shadow-2xl hover:shadow-vd-forest/15 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between group cursor-pointer h-full"
                aria-label={`Find ${item.name} doctors`}
              >
              <div>
                {/* Compact Image Container */}
                <div className="relative w-full aspect-[4/4] rounded-[16px] overflow-hidden bg-gray-100 mb-4 flex items-center justify-center p-1">
                  <Image
                    src={item.image}
                    alt={item.alt || item.name}
                    fill
                    sizes="(max-width: 1024px) 33vw, 16vw"
                    className="object-cover rounded-lg group-hover:scale-110 transition-transform duration-500 ease-out"
                  />
                </div>

                <h3 className="text-[17px] font-bold text-[#111827] group-hover:text-vd-forest transition-colors mb-1 text-center">
                  {item.name}
                </h3>
                <p className="text-[13px] text-gray-500 font-normal line-clamp-1 text-center">
                  254 Doctors
                </p>
              </div>
            </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
