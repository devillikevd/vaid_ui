"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  MapPin,
  ShieldCheck,
  Video,
  User,
  Building2,
  Stethoscope,
  Pill,
  Flower2,
  TestTube2,
  Dumbbell,
  Zap,
  Languages,
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import SearchLocationPicker, { SelectedLocation } from "@/components/shared/SearchLocationPicker";

export default function Hero() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocation, setSelectedLocation] = useState<SelectedLocation | null>(null);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim();
    const params = new URLSearchParams();
    if (query) params.append("q", query);

    if (selectedLocation) {
      if (selectedLocation.latitude && selectedLocation.longitude) {
        params.append("lat", String(selectedLocation.latitude));
        params.append("lng", String(selectedLocation.longitude));
      }
      if (selectedLocation.city && selectedLocation.city !== "Current Location") {
        params.append("city", selectedLocation.city);
      }
      if (selectedLocation.pincode) {
        params.append("pincode", selectedLocation.pincode);
      }
      if (selectedLocation.displayName) {
        params.append("location", selectedLocation.displayName);
      }
    }

    router.push(`/doctors?${params.toString()}`);
  };

  const services = [
    { title: "Hospitals", desc: "Access trusted hospitals & specialist care", icon: <Building2 className="w-5 h-5" /> },
    { title: "Clinics", desc: "Find nearby clinics and book appointments", icon: <Stethoscope className="w-5 h-5" /> },
    { title: "Pharmacies", desc: "Order genuine medicines & healthcare products", icon: <Pill className="w-5 h-5" /> },
    { title: "Wellness", desc: "Stay fit, healthy & preventive care", icon: <Flower2 className="w-5 h-5" /> },
    { title: "Diagnostic", desc: "Book lab tests & health checkups", icon: <TestTube2 className="w-5 h-5" /> },
    { title: "Gym & Studios", desc: "Fitness, nutrition & wellness programs", icon: <Dumbbell className="w-5 h-5" /> },
  ];

  const floatingCards = [
    {
      icon: <Video className="w-5 h-5 text-[#059669]" />,
      title: "Video Consultation",
      desc: "Talk to verified doctors from anywhere",
      position: "top-[2%] -right-10 sm:-right-32",
      delay: 0.6
    },
    {
      icon: <User className="w-5 h-5 text-[#059669]" />,
      title: "In-Person Consultation",
      desc: "Visit clinics & hospitals near you",
      position: "top-[60%] -left-8 sm:-left-28",
      delay: 0.8
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-white" />,
      title: "Verified Doctors",
      desc: "Background checked & trusted",
      position: "bottom-[5%] -right-6 sm:-right-24",
      delay: 1.0,
      iconBg: "bg-[#059669]"
    }
  ];

  return (
    <section className="relative w-full min-h-screen bg-stone-50 overflow-hidden pt-28 pb-16" id="hero">
      {/* Premium Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        {/* Subtle Dotted Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)', backgroundSize: '24px 24px' }}
        />
        
        {/* Dynamic Glowing Orbs */}
        <motion.div 
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[800px] h-[800px] bg-gradient-to-br from-emerald-300/40 to-emerald-100/10 rounded-full blur-[120px] mix-blend-multiply"
        />
        <motion.div 
          animate={{ scale: [1, 1.2, 1], rotate: [0, -90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute top-[20%] -right-[10%] w-[900px] h-[900px] bg-gradient-to-br from-teal-300/30 to-emerald-200/10 rounded-full blur-[140px] mix-blend-multiply"
        />
        <motion.div 
          animate={{ scale: [1, 1.15, 1], y: [0, -50, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-20%] left-[20%] w-[600px] h-[600px] bg-gradient-to-tr from-emerald-200/30 to-transparent rounded-full blur-[100px] mix-blend-multiply"
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full flex flex-col">
        
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-8 mb-16">
          {/* Left Content */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="w-full lg:w-[55%] flex flex-col relative z-20"
          >
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100/60 text-emerald-800 text-[13px] font-bold tracking-wide w-max mb-8 border border-emerald-200/50">
              <ShieldCheck className="w-4 h-4" />
              <span>VERIFIED HEALTHCARE ECOSYSTEM</span>
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-stone-900 tracking-tight leading-[1.1] mb-6">
              Consult Verified <br />
              <span className="bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">Doctors Only</span>
            </h1>

            <p className="text-lg sm:text-xl text-stone-600 mb-10 max-w-2xl leading-relaxed">
              Get expert medical advice, video or in-person consultations, and complete healthcare support — all in one place.
            </p>

            {/* Unified Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative z-30">
              <div className="flex flex-col sm:flex-row items-center bg-white/70 backdrop-blur-xl rounded-[2rem] p-2.5 sm:p-2 shadow-[0_8px_30px_rgb(0,0,0,0.08)] focus-within:shadow-[0_0_20px_rgba(16,185,129,0.3)] focus-within:border-emerald-300 hover:shadow-emerald-500/10 border border-white/50 max-w-4xl w-full transition-all duration-300">
                
                <div className="flex-1 flex items-center gap-3 px-4 py-3 sm:py-2 w-full group">
                  <Search className="w-5 h-5 text-emerald-600 shrink-0 group-focus-within:scale-110 transition-transform" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search doctors, specialties, or clinics..."
                    className="w-full text-[15px] font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none bg-transparent"
                  />
                </div>

                <div className="hidden sm:block w-[1px] h-8 bg-stone-200/50 mx-2" />

                <div className="flex-1 flex items-center w-full border-t border-stone-100 sm:border-none pt-3 mt-3 sm:pt-0 sm:mt-0">
                  <SearchLocationPicker
                    value={selectedLocation}
                    onChange={setSelectedLocation}
                    placeholder="City / Pincode"
                    className="w-full bg-transparent"
                    align="center"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-8 py-3.5 sm:py-3 mt-3 sm:mt-0 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold text-[15px] transition-all flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-emerald-500/25 sm:ml-2 cursor-pointer hover:scale-105 active:scale-95"
                >
                  <span>Find Doctors</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          </motion.div>

          {/* Right Content (Doctor Image) */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
            className="w-full lg:w-[45%] relative mt-10 lg:mt-0"
          >
            <div className="relative w-full max-w-lg mx-auto">
              {/* Doctor Image Container */}
              <div className="relative z-10 w-full aspect-[4/5] sm:aspect-square flex items-end justify-center rounded-[2rem] overflow-hidden bg-gradient-to-b from-transparent to-emerald-50/50">
                <img 
                  src="/images/two_doctors_hero.png" 
                  alt="Professional Doctors" 
                  className="w-full h-[115%] object-cover object-top drop-shadow-2xl translate-y-[5%]"
                />
              </div>

              {/* Specific Floating Cards matching screenshot */}
              {floatingCards.map((card, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20, scale: 0.9 }}
                  animate={{ 
                    opacity: 1, 
                    scale: 1,
                    y: [0, -12, 0]
                  }}
                  transition={{ 
                    opacity: { duration: 0.6, delay: card.delay },
                    scale: { duration: 0.6, delay: card.delay, type: "spring", bounce: 0.4 },
                    y: { duration: 4 + (i * 0.5), repeat: Infinity, ease: "easeInOut", delay: card.delay }
                  }}
                  className={`absolute ${card.position} z-20 bg-white/95 backdrop-blur-md rounded-2xl p-4 shadow-[0_10px_30px_-10px_rgba(0,0,0,0.1)] border border-white/50 flex items-center gap-4 w-[280px] hover:shadow-emerald-500/20 hover:border-emerald-300/50 cursor-pointer group`}
                >
                  <div className={`w-10 h-10 rounded-full ${card.iconBg || "bg-emerald-50"} flex items-center justify-center shrink-0`}>
                    {card.icon}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-bold text-stone-900 leading-tight mb-0.5">{card.title}</h4>
                    <p className="text-[11px] text-stone-500 leading-snug pr-4">{card.desc}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-[#059669] absolute right-4 top-1/2 -translate-y-1/2 transition-colors" />
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Our Healthcare Services Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.2 }}
          className="w-full relative z-20"
        >
          <h3 className="text-xl font-bold text-stone-900 mb-6 flex items-center gap-2">
            Our Healthcare Services
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {services.map((svc, i) => (
              <div key={i} className="bg-white/60 backdrop-blur-sm rounded-[24px] p-5 shadow-sm border border-white/80 hover:border-emerald-300 hover:shadow-2xl hover:shadow-emerald-500/15 hover:-translate-y-2 transition-all duration-300 group cursor-pointer flex flex-col justify-between min-h-[150px] relative overflow-hidden">
                {/* Hover Glow Behind Card */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/0 to-emerald-400/0 group-hover:from-emerald-400/10 group-hover:to-teal-500/10 transition-colors duration-300 -z-10" />
                
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100/80 to-teal-50/80 flex items-center justify-center text-emerald-600 group-hover:bg-gradient-to-br group-hover:from-emerald-500 group-hover:to-teal-500 group-hover:text-white group-hover:shadow-lg group-hover:shadow-emerald-500/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                    {svc.icon}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-bold text-stone-900 text-[14px] group-hover:text-emerald-600 transition-colors">{svc.title}</h4>
                  </div>
                  <p className="text-[11px] text-stone-500 font-medium leading-snug line-clamp-2 pr-2">{svc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Bottom Features Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          className="mt-12 flex flex-col lg:flex-row items-center justify-between gap-8 bg-gradient-to-r from-emerald-50/30 to-white rounded-3xl p-6 sm:p-8 border border-emerald-100 relative"
        >
          <div className="flex flex-wrap lg:flex-nowrap items-center justify-center lg:justify-start gap-8 lg:gap-12 w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-[#059669]" />
              <div>
                <h5 className="text-sm font-bold text-stone-900">Lower Bandwidth</h5>
                <p className="text-[11px] text-stone-500">Works even on slow networks</p>
              </div>
            </div>
            <div className="hidden sm:block w-[1px] h-8 bg-stone-200" />
            <div className="flex items-center gap-3">
              <Languages className="w-5 h-5 text-[#059669]" />
              <div>
                <h5 className="text-sm font-bold text-stone-900">Regional Language Support</h5>
                <p className="text-[11px] text-stone-500">Healthcare in your language</p>
              </div>
            </div>
            <div className="hidden sm:block w-[1px] h-8 bg-stone-200" />
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-[#059669]" />
              <div>
                <h5 className="text-sm font-bold text-stone-900">Better Healthcare</h5>
                <p className="text-[11px] text-stone-500">No matter where you are</p>
              </div>
            </div>
          </div>

          {/* Hand-written text accent */}
          <div className="relative shrink-0 flex items-center justify-center transform -rotate-6 lg:mr-10 mt-4 lg:mt-0">
            {/* The cursive text */}
            <div className="text-3xl sm:text-4xl font-[Caveat,cursive] text-[#059669] tracking-wide font-bold leading-tight">
              Your Health,<br/>
              Our Priority
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
