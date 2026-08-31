"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Stethoscope,
  AlertCircle,
  FileText,
  Bot,
  Microscope,
  Pill,
  ArrowRight,
  Shield,
  Search,
  Video,
  MapPin,
  QrCode,
  Sparkles,
  Send,
  Calendar,
  CheckCircle2,
  Clock,
  PhoneCall,
  Activity
} from "lucide-react";

interface PatientCapability {
  id: string;
  num: string;
  title: string;
  desc: string;
  link: string;
  actionLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
}

const capabilities: PatientCapability[] = [
  {
    id: "doctors",
    num: "01",
    title: "Smart Doctor Booking",
    desc: "Search verified medical specialists, compare consultation options, view real-time availability slots, and book high-definition video calls or in-clinic visits instantly.",
    link: "/patient/doctors",
    actionLabel: "Find Doctors",
    icon: Stethoscope,
    badge: "Verified Network",
  },
  {
    id: "emergency",
    num: "02",
    title: "One-Tap Emergency SOS",
    desc: "Instantly broadcast your emergency profile with precise GPS coordinates to nearby ambulance fleets, trauma care hospitals, and designated family responders.",
    link: "/#emergency-sos",
    actionLabel: "View Emergency Network",
    icon: AlertCircle,
    badge: "Immediate Response",
  },
  {
    id: "records",
    num: "03",
    title: "Unified Health ID & Vault",
    desc: "Consolidate digital prescriptions, verified diagnostic reports, and vital history into a 256-bit encrypted health identity accessible across partner hospitals.",
    link: "/patient/records",
    actionLabel: "View Health Records",
    icon: FileText,
    badge: "Encrypted Health ID",
  },
  {
    id: "assistant",
    num: "04",
    title: "AI Health Assistant",
    desc: "Triage everyday symptoms, review medication instructions, get verified wellness guidance, and receive smart clinical routing recommendations 24/7.",
    link: "/patient/assistant",
    actionLabel: "Ask AI Assistant",
    icon: Bot,
    badge: "24/7 Clinical AI",
  },
  {
    id: "diagnostics",
    num: "05",
    title: "Diagnostic Lab Bookings",
    desc: "Book home sample collections or walk-in pathology tests with verified diagnostic labs, and receive verified digital reports directly in your health vault.",
    link: "/patient/diagnostics",
    actionLabel: "Explore Diagnostics",
    icon: Microscope,
    badge: "Home Collection",
  },
  {
    id: "pharmacy",
    num: "06",
    title: "Prescription Pharmacy Orders",
    desc: "Forward digital prescriptions directly to partner pharmacies for counter dispensation or doorstep delivery tracking with verified batch records.",
    link: "/patient/pharmacy",
    actionLabel: "Order Medicines",
    icon: Pill,
    badge: "Doorstep Delivery",
  },
];

function PhoneScreenContent({ activeId }: { activeId: string }) {
  switch (activeId) {
    case "doctors":
      return (
        <div className="space-y-2.5 p-3 animate-in fade-in duration-300">
          {/* Search bar */}
          <div className="bg-white rounded-xl p-2 flex items-center gap-2 border border-stone-200/80 shadow-2xs">
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="text-[9.5px] text-stone-400 truncate">Search doctors, specialties...</span>
          </div>

          {/* Specialty Filter Chips */}
          <div className="flex gap-1 overflow-x-auto pb-0.5 no-scrollbar text-[8.5px] font-medium">
            <span className="px-2.5 py-0.5 bg-vd-forest text-white rounded-full shrink-0">
              General
            </span>
            <span className="px-2.5 py-0.5 bg-white text-stone-600 rounded-full border border-stone-200 shrink-0">
              Cardiology
            </span>
            <span className="px-2.5 py-0.5 bg-white text-stone-600 rounded-full border border-stone-200 shrink-0">
              Dermatology
            </span>
          </div>

          {/* Doctor Card 1 */}
          <div className="bg-white rounded-xl p-2.5 border border-stone-200/80 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100/80 flex items-center justify-center text-vd-forest font-bold text-[10px] shrink-0">
                DR
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-bold text-stone-900 truncate">Dr. Senior Specialist</h5>
                  <span className="text-[8px] font-bold text-vd-forest bg-emerald-50 px-1 py-0.5 rounded">
                    ★ 4.9
                  </span>
                </div>
                <p className="text-[8.5px] text-stone-500 truncate">General Medicine • 12y exp</p>
              </div>
            </div>
            <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
              <span className="text-[8px] text-stone-500 font-medium flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-vd-forest" /> Next Slot: Today
              </span>
              <span className="px-2 py-0.5 bg-emerald-50 text-vd-forest text-[8px] font-bold rounded">
                Video / Clinic
              </span>
            </div>
          </div>

          {/* Doctor Card 2 */}
          <div className="bg-white rounded-xl p-2.5 border border-stone-200/80 shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-teal-100/80 flex items-center justify-center text-teal-800 font-bold text-[10px] shrink-0">
                DR
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h5 className="text-[10px] font-bold text-stone-900 truncate">Dr. Cardiologist</h5>
                  <span className="text-[8px] font-bold text-vd-forest bg-emerald-50 px-1 py-0.5 rounded">
                    ★ 4.8
                  </span>
                </div>
                <p className="text-[8.5px] text-stone-500 truncate">Cardiology • MD</p>
              </div>
            </div>
            <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between">
              <span className="text-[8px] text-stone-500 font-medium flex items-center gap-1">
                <Clock className="w-2.5 h-2.5 text-vd-forest" /> Tomorrow 10 AM
              </span>
              <span className="px-2 py-0.5 bg-vd-forest text-white text-[8px] font-bold rounded shadow-xs">
                Book Slot
              </span>
            </div>
          </div>
        </div>
      );

    case "emergency":
      return (
        <div className="space-y-2.5 p-3 animate-in fade-in duration-300">
          {/* GPS Status Banner */}
          <div className="bg-red-50 border border-red-200/80 rounded-xl p-2 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
              <span className="text-[9px] font-bold text-red-900">GPS Beacon Ready</span>
            </div>
            <span className="text-[7.5px] font-semibold text-red-700 bg-red-100/80 px-1.5 py-0.5 rounded">
              High Accuracy
            </span>
          </div>

          {/* Central SOS Action */}
          <div className="bg-gradient-to-b from-red-500 to-rose-600 rounded-2xl p-3.5 text-white text-center shadow-md shadow-red-500/20 space-y-1.5">
            <div className="w-11 h-11 mx-auto rounded-full bg-white/20 border-2 border-white/40 flex items-center justify-center font-bold text-sm tracking-widest animate-pulse">
              SOS
            </div>
            <h5 className="font-bold text-[11px]">Emergency Broadcast</h5>
            <p className="text-[8px] text-red-100 leading-tight font-light">
              Alerts ambulances & trauma ER teams
            </p>
          </div>

          {/* Nearby Support Grid */}
          <div className="bg-white rounded-xl p-2.5 border border-stone-200/80 shadow-2xs space-y-1.5">
            <span className="text-[8px] font-bold uppercase tracking-wider text-stone-400">
              Immediate Network Support
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-left">
              <div className="bg-stone-50 rounded-lg p-1.5 border border-stone-100">
                <p className="text-[8.5px] font-bold text-stone-800">Ambulances</p>
                <p className="text-[7.5px] text-emerald-600 font-medium">Coverage Ready</p>
              </div>
              <div className="bg-stone-50 rounded-lg p-1.5 border border-stone-100">
                <p className="text-[8.5px] font-bold text-stone-800">Hospital ER</p>
                <p className="text-[7.5px] text-emerald-600 font-medium">Alert Standby</p>
              </div>
            </div>
          </div>
        </div>
      );

    case "records":
      return (
        <div className="space-y-2.5 p-3 animate-in fade-in duration-300">
          {/* Health Card */}
          <div className="bg-gradient-to-br from-vd-forest to-vd-forest-deep rounded-xl p-3 text-white shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase tracking-widest text-emerald-200">
                Vaididea Health ID
              </span>
              <QrCode className="w-4 h-4 text-emerald-100" />
            </div>
            <div>
              <p className="font-mono text-[10px] font-bold tracking-wider">VID-9182-4820-3910</p>
              <p className="text-[7.5px] text-emerald-100/80 mt-0.5">National Health Stack Linked</p>
            </div>
            <div className="pt-1.5 border-t border-white/15 flex items-center justify-between text-[7.5px] text-emerald-100/90">
              <span>Blood Group: O+</span>
              <span>256-Bit Encrypted</span>
            </div>
          </div>

          {/* Vault Summary Cards */}
          <div className="space-y-1.5">
            <div className="bg-white rounded-xl p-2 border border-stone-200/80 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 text-vd-forest flex items-center justify-center">
                  <FileText className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-stone-900">Digital Prescriptions</p>
                  <p className="text-[7.5px] text-stone-500">3 verified doctor orders</p>
                </div>
              </div>
              <span className="text-[7.5px] font-bold text-vd-forest bg-emerald-50 px-1.5 py-0.5 rounded">
                Verified
              </span>
            </div>

            <div className="bg-white rounded-xl p-2 border border-stone-200/80 shadow-2xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Microscope className="w-3 h-3" />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-stone-900">Lab Reports</p>
                  <p className="text-[7.5px] text-stone-500">5 digital diagnostic reports</p>
                </div>
              </div>
              <span className="text-[7.5px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">
                Vault Ready
              </span>
            </div>
          </div>
        </div>
      );

    case "assistant":
      return (
        <div className="space-y-2 p-3 animate-in fade-in duration-300">
          {/* AI Banner */}
          <div className="bg-emerald-50 border border-emerald-200/70 rounded-xl p-1.5 flex items-center gap-1.5">
            <Sparkles className="w-3 h-3 text-vd-forest shrink-0" />
            <span className="text-[8.5px] font-bold text-vd-forest">
              AI Clinical Assistant • Active 24/7
            </span>
          </div>

          {/* Chat Bubbles */}
          <div className="space-y-1.5">
            <div className="bg-stone-100 rounded-xl rounded-br-xs p-2 max-w-[88%] ml-auto text-stone-800 text-[8.5px] leading-relaxed">
              Mild headache & throat irritation since morning.
            </div>

            <div className="bg-white rounded-xl rounded-bl-xs p-2.5 max-w-[92%] border border-stone-200/80 shadow-2xs space-y-1 text-left">
              <p className="text-[8.5px] font-medium text-stone-800 leading-snug">
                Based on your symptoms, recommendations:
              </p>
              <ul className="text-[8px] text-stone-600 space-y-0.5 list-disc pl-3">
                <li>Stay hydrated with warm fluids</li>
                <li>Monitor temperature if fever develops</li>
              </ul>
              <div className="pt-1 border-t border-stone-100 flex items-center justify-between">
                <span className="text-[7px] text-stone-400">Clinical guidance</span>
                <span className="text-[7.5px] font-bold text-vd-forest bg-emerald-50 px-1.5 py-0.5 rounded">
                  Connect Doctor →
                </span>
              </div>
            </div>
          </div>

          {/* Chat Input Bar */}
          <div className="bg-white rounded-xl p-1.5 border border-stone-200/80 flex items-center justify-between gap-1 shadow-2xs">
            <span className="text-[8px] text-stone-400 pl-1">Ask health questions...</span>
            <div className="w-5 h-5 rounded-lg bg-vd-forest text-white flex items-center justify-center shrink-0">
              <Send className="w-2.5 h-2.5" />
            </div>
          </div>
        </div>
      );

    case "diagnostics":
      return (
        <div className="space-y-2.5 p-3 animate-in fade-in duration-300">
          {/* Search bar */}
          <div className="bg-white rounded-xl p-2 flex items-center gap-2 border border-stone-200/80 shadow-2xs">
            <Search className="w-3.5 h-3.5 text-stone-400 shrink-0" />
            <span className="text-[9.5px] text-stone-400 truncate">Search tests, panels...</span>
          </div>

          {/* Test Package Card 1 */}
          <div className="bg-white rounded-xl p-2.5 border border-stone-200/80 shadow-2xs space-y-1.5">
            <div className="flex justify-between items-start">
              <div>
                <h5 className="text-[10px] font-bold text-stone-900">Complete Lipid Profile</h5>
                <p className="text-[8.5px] text-stone-500">Verified Lab • 8 Parameters</p>
              </div>
              <span className="text-[8px] font-bold text-vd-forest bg-emerald-50 px-1.5 py-0.5 rounded">
                Home Sample
              </span>
            </div>
            <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[8px]">
              <span className="text-stone-500">Reports in 12–24h</span>
              <span className="px-2 py-0.5 bg-vd-forest text-white font-bold rounded shadow-xs">
                Book Test
              </span>
            </div>
          </div>

          {/* Test Package Card 2 */}
          <div className="bg-white rounded-xl p-2.5 border border-stone-200/80 shadow-2xs space-y-1.5">
            <div className="flex justify-between items-start">
              <div>
                <h5 className="text-[10px] font-bold text-stone-900">Health Checkup Panel</h5>
                <p className="text-[8.5px] text-stone-500">62 Parameters • Fasting</p>
              </div>
              <span className="text-[8px] font-bold text-teal-800 bg-teal-50 px-1.5 py-0.5 rounded">
                Certified Phleb
              </span>
            </div>
            <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[8px]">
              <span className="text-stone-500">Walk-in / Home</span>
              <span className="px-2 py-0.5 bg-stone-100 text-stone-700 font-bold rounded">
                Details
              </span>
            </div>
          </div>
        </div>
      );

    case "pharmacy":
      return (
        <div className="space-y-2.5 p-3 animate-in fade-in duration-300">
          {/* Prescription Intake Card */}
          <div className="bg-white rounded-xl p-2.5 border border-stone-200/80 shadow-2xs space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
                  <Pill className="w-3 h-3" />
                </div>
                <div>
                  <h5 className="text-[9.5px] font-bold text-stone-900">Active Rx Order</h5>
                  <p className="text-[8px] text-stone-500">Verified by Pharmacist</p>
                </div>
              </div>
              <span className="text-[7.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                Dispatched
              </span>
            </div>
            <div className="pt-1.5 border-t border-stone-100 flex items-center justify-between text-[8px] text-stone-500">
              <span>Expected: Today, 5 PM</span>
              <span className="font-bold text-vd-forest">Live Tracker</span>
            </div>
          </div>

          {/* Quick Pharmacy Services */}
          <div className="grid grid-cols-2 gap-1.5 text-left">
            <div className="bg-white rounded-xl p-2 border border-stone-200/80 shadow-2xs">
              <p className="text-[9px] font-bold text-stone-900">Upload Rx</p>
              <p className="text-[7.5px] text-stone-500">Instant dispatch</p>
            </div>
            <div className="bg-white rounded-xl p-2 border border-stone-200/80 shadow-2xs">
              <p className="text-[9px] font-bold text-stone-900">Refill Alert</p>
              <p className="text-[7.5px] text-stone-500">Dosage cycle</p>
            </div>
          </div>
        </div>
      );

    default:
      return null;
  }
}

export default function PatientApp() {
  const [activeCap, setActiveCap] = useState<string>("doctors");

  const current = capabilities.find((c) => c.id === activeCap) || capabilities[0];

  return (
    <section className="py-12 sm:py-16 bg-[#FAF8F4] relative overflow-hidden" id="patient-care">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 shadow-xs mb-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-vd-forest animate-pulse" />
            <span className="text-[10.5px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-vd-forest">
              PATIENT CARE EXPERIENCE
            </span>
          </div>

          <h2 className="font-heading text-2xl sm:text-3xl md:text-4xl text-vd-forest font-semibold mb-2.5 tracking-tight leading-tight">
            Your healthcare,{" "}
            <em className="text-vd-sage italic font-normal">wherever you are.</em>
          </h2>

          <p className="text-xs sm:text-sm text-stone-600 font-normal leading-relaxed max-w-xl mx-auto">
            Access your healthcare journey from your phone or browser — without losing the continuity of your care.
          </p>
        </div>

        {/* 2-Column Layout: Left Feature Selectors / Right Balanced iPhone Mockup */}
        <div className="grid lg:grid-cols-12 gap-6 lg:gap-10 items-center">
          {/* Left Column: Interactive Capability Cards (55%) */}
          <div className="lg:col-span-7 space-y-2 order-2 lg:order-1">
            {capabilities.map((cap) => {
              const isActive = activeCap === cap.id;
              const CapIcon = cap.icon;

              return (
                <div
                  key={cap.id}
                  onClick={() => setActiveCap(cap.id)}
                  className={`p-3 sm:p-3.5 rounded-xl transition-all duration-200 border cursor-pointer flex items-start gap-3 ${
                    isActive
                      ? "bg-white shadow-[0_6px_20px_-4px_rgba(15,95,80,0.08)] border-emerald-500/40 translate-x-1"
                      : "bg-white/60 hover:bg-white border-stone-200/70"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isActive ? "bg-vd-forest text-white shadow-2xs" : "bg-stone-100 text-stone-600"
                    }`}
                  >
                    <CapIcon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <h3 className="text-xs sm:text-[13px] font-bold text-vd-forest">
                        {cap.num} — {cap.title}
                      </h3>
                      {isActive && (
                        <span className="text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-vd-forest border border-emerald-200 shrink-0">
                          {cap.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-stone-500 font-normal leading-relaxed line-clamp-2">
                      {cap.desc}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Direct Gateway Links */}
            <div className="pt-2 flex items-center gap-2.5 flex-wrap">
              <Link
                href={current.link}
                className="px-5 py-2 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-full text-xs font-bold tracking-wide transition-all shadow-xs flex items-center gap-1.5 group"
              >
                <span>Launch {current.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
              </Link>
              <Link
                href="/patient"
                className="px-4 py-2 bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 rounded-full text-xs font-semibold tracking-wide transition-all shadow-xs"
              >
                Open Patient Portal →
              </Link>
            </div>
          </div>

          {/* Right Column: Balanced Height iPhone Device Mockup (45%) */}
          <div className="lg:col-span-5 flex justify-center order-1 lg:order-2">
            <div className="relative w-full max-w-[275px] sm:max-w-[285px] md:max-w-[290px] group">
              {/* Outer Phone Hardware Shell */}
              <div className="relative rounded-[2.5rem] bg-[#1a1a1a] p-2.5 shadow-[0_20px_45px_-12px_rgba(0,0,0,0.3)] border-[3px] border-[#2d2d2d]">
                {/* Dynamic Island / Speaker Pill */}
                <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-20 h-4 bg-black rounded-full z-30 flex items-center justify-end px-1.5">
                  <div className="w-2 h-2 rounded-full bg-[#111] border border-[#222]" />
                </div>

                {/* Inner Screen Container */}
                <div className="relative rounded-[2.1rem] bg-[#F7F7F8] overflow-hidden aspect-[9/19] flex flex-col font-sans select-none border border-stone-200/50 max-h-[580px]">
                  {/* Status Bar */}
                  <div className="pt-2.5 px-5 pb-1.5 flex justify-between items-center text-[9px] font-semibold text-stone-800 z-20">
                    <span>9:41</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[7.5px] font-bold">5G</span>
                      <div className="w-3.5 h-1.5 rounded-xs border border-stone-800 p-0.5 flex items-center">
                        <div className="h-full w-full bg-stone-800 rounded-2xs" />
                      </div>
                    </div>
                  </div>

                  {/* App Screen Header */}
                  <div className="px-3.5 py-2 bg-white border-b border-stone-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-md bg-vd-forest text-white flex items-center justify-center font-bold text-[9px]">
                        V
                      </div>
                      <span className="font-heading font-bold text-[11px] text-vd-forest tracking-tight uppercase">
                        VAIDIDEA
                      </span>
                    </div>
                    <span className="text-[7.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-full border border-emerald-200/80">
                      Patient App
                    </span>
                  </div>

                  {/* Dynamic Screen View */}
                  <div className="flex-1 overflow-y-auto no-scrollbar">
                    <PhoneScreenContent activeId={activeCap} />
                  </div>

                  {/* Floating Bottom App Navigation */}
                  <div className="bg-white/95 backdrop-blur-md border-t border-stone-200/80 px-3.5 py-1.5 flex justify-between items-center shadow-xs">
                    <div className="flex flex-col items-center gap-0.5 text-vd-forest">
                      <Activity className="w-3.5 h-3.5" />
                      <span className="text-[7px] font-bold">Care</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-stone-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[7px]">Slots</span>
                    </div>
                    {/* Central SOS Button */}
                    <div className="w-7 h-7 -my-1.5 rounded-full bg-gradient-to-tr from-red-500 to-rose-600 text-white flex items-center justify-center font-bold text-[8px] shadow-sm shadow-red-500/30 border-2 border-white">
                      SOS
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-stone-400">
                      <FileText className="w-3.5 h-3.5" />
                      <span className="text-[7px]">Vault</span>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 text-stone-400">
                      <Bot className="w-3.5 h-3.5" />
                      <span className="text-[7px]">AI</span>
                    </div>
                  </div>

                  {/* iOS Home Bar */}
                  <div className="pb-1 pt-0.5 bg-white flex justify-center">
                    <div className="w-20 h-0.5 bg-stone-300 rounded-full" />
                  </div>
                </div>
              </div>

              {/* Ambient Glow below phone */}
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-3/4 h-6 bg-vd-forest/15 blur-lg rounded-full pointer-events-none" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

