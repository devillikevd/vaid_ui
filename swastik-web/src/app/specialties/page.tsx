"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
  HeartPulse,
  Brain,
  Bone,
  Baby,
  Eye,
  Smile,
  Sparkles,
  Stethoscope,
  Activity,
  Layers,
  ArrowRight,
  Search,
  ShieldCheck,
  Pill,
  CheckCircle2,
  Users
} from "lucide-react";

const MEDICAL_SPECIALTIES_DATA = [
  {
    name: "General Physician",
    slug: "General Physician",
    icon: Stethoscope,
    badge: "Primary Care",
    description: "Treatment for common fevers, infections, metabolic health, preventative wellness, and adult primary healthcare.",
    color: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
  {
    name: "Cardiology",
    slug: "Cardiology",
    icon: HeartPulse,
    badge: "Heart & Vascular",
    description: "Diagnosis and clinical care for hypertension, coronary heart diseases, arrhythmias, chest pain, and cardiac wellness.",
    color: "text-rose-700 bg-rose-50 border-rose-200",
  },
  {
    name: "Dermatology",
    slug: "Dermatology",
    icon: Sparkles,
    badge: "Skin & Hair",
    description: "Comprehensive medical and cosmetic treatment for skin allergies, acne, eczema, psoriasis, hair loss, and nail disorders.",
    color: "text-purple-700 bg-purple-50 border-purple-200",
  },
  {
    name: "Orthopedics",
    slug: "Orthopedics",
    icon: Bone,
    badge: "Bones & Joints",
    description: "Care for joint pain, arthritis, fractures, spine problems, sports injuries, ligament tears, and musculoskeletal health.",
    color: "text-blue-700 bg-blue-50 border-blue-200",
  },
  {
    name: "Gynecology & Obstetrics",
    slug: "Gynecology",
    icon: Activity,
    badge: "Women's Health",
    description: "Women's reproductive health, prenatal and postpartum care, PCOS/PCOD management, menstrual health, and fertility guidance.",
    color: "text-pink-700 bg-pink-50 border-pink-200",
  },
  {
    name: "Pediatrics",
    slug: "Pediatrics",
    icon: Baby,
    badge: "Child Health",
    description: "Newborn care, infant vaccination schedules, childhood development tracking, pediatric nutrition, and seasonal illness care.",
    color: "text-amber-700 bg-amber-50 border-amber-200",
  },
  {
    name: "Neurology",
    slug: "Neurology",
    icon: Brain,
    badge: "Brain & Nerves",
    description: "Specialized clinical diagnosis for severe migraines, stroke recovery, epilepsy, neuropathy, and central nervous disorders.",
    color: "text-indigo-700 bg-indigo-50 border-indigo-200",
  },
  {
    name: "Ophthalmology",
    slug: "Ophthalmology",
    icon: Eye,
    badge: "Vision Care",
    description: "Complete eye care, optical prescriptions, cataract screening, glaucoma management, and corrective eye treatments.",
    color: "text-teal-700 bg-teal-50 border-teal-200",
  },
  {
    name: "Dentistry",
    slug: "Dentist",
    icon: Smile,
    badge: "Dental Health",
    description: "Oral checkups, dental cleanings, cavity fillings, root canals, orthodontics, teeth whitening, and gum disease care.",
    color: "text-cyan-700 bg-cyan-50 border-cyan-200",
  },
  {
    name: "ENT (Otolaryngology)",
    slug: "ENT",
    icon: Activity,
    badge: "Ear, Nose, Throat",
    description: "Specialized clinical care for sinusitis, hearing difficulties, ear infections, throat pain, tonsillitis, and vocal health.",
    color: "text-orange-700 bg-orange-50 border-orange-200",
  },
  {
    name: "Gastroenterology",
    slug: "Gastroenterology",
    icon: Activity,
    badge: "Digestive Health",
    description: "Treatment for acid reflux, IBS, stomach ulcers, liver health, indigestion, abdominal pain, and digestive wellness.",
    color: "text-lime-700 bg-lime-50 border-lime-200",
  },
  {
    name: "Psychiatry & Mental Health",
    slug: "Psychiatry",
    icon: Brain,
    badge: "Mental Wellness",
    description: "Confidential consultations for anxiety, depression, insomnia, stress management, mood disorders, and cognitive well-being.",
    color: "text-violet-700 bg-violet-50 border-violet-200",
  },
];

export default function SpecialtiesPage() {
  const [filterQuery, setFilterQuery] = useState("");

  const filteredSpecialties = MEDICAL_SPECIALTIES_DATA.filter((s) =>
    s.name.toLowerCase().includes(filterQuery.toLowerCase()) ||
    s.description.toLowerCase().includes(filterQuery.toLowerCase()) ||
    s.badge.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-stone-50/50 flex flex-col justify-between">
      <Navbar />

      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-12 flex-1">
        {/* Header */}
        <div className="max-w-3xl mb-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest text-xs font-bold uppercase tracking-wider mb-2.5 border border-emerald-200/60">
            <Layers className="w-3.5 h-3.5" />
            <span>Clinical Directory</span>
          </div>
          <h1 className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold text-vd-forest tracking-tight">
            Medical Specialties
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 mt-2 font-light leading-relaxed">
            Browse verified medical disciplines, learn about clinical focus areas, and book appointments directly with top specialist practitioners.
          </p>

          {/* Specialty Filter Search */}
          <div className="relative mt-6 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter specialties by name or condition..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-stone-200 rounded-xl text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:border-vd-forest shadow-2xs"
            />
          </div>
        </div>

        {/* Specialties Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSpecialties.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.name}
                className="bg-white p-6 rounded-2xl border border-stone-200/90 hover:border-vd-forest/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center border ${item.color}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                      {item.badge}
                    </span>
                  </div>

                  <h2 className="font-heading text-lg font-bold text-stone-900 mb-2">
                    {item.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed mb-6">
                    {item.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
                  <Link
                    href={`/doctors?specialty=${encodeURIComponent(item.slug)}`}
                    className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-vd-forest hover:text-vd-forest-deep transition-colors group"
                  >
                    <span>Find Specialists</span>
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <Footer />
    </div>
  );
}
