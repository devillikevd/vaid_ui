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
  ArrowRight,
  Phone,
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

  return (
    <section
      className="relative w-full min-h-screen overflow-hidden pt-20"
      id="hero"
      style={{ backgroundColor: "#FAF7F2" }}
    >
      {/* Ambient Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{ scale: [1, 1.1, 1], rotate: [0, 90, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -right-[10%] w-[700px] h-[700px] rounded-full blur-[140px] opacity-30"
          style={{ backgroundColor: "var(--medica-peach)" }}
        />
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-10%] -left-[5%] w-[500px] h-[500px] rounded-full blur-[100px] opacity-20"
          style={{ backgroundColor: "var(--medica-olive)" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-0 min-h-[calc(100vh-80px)]">

          {/* ─── LEFT: Olive Leaf Container ─── */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="w-full lg:w-[52%] flex flex-col justify-center py-16 lg:py-0 lg:pr-8"
          >
            {/* Eyebrow badge */}
            <div
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full w-max mb-8 text-[13px] font-semibold font-outfit"
              style={{
                backgroundColor: "rgba(58,105,30,0.12)",
                color: "var(--medica-olive)",
                border: "1px solid rgba(58,105,30,0.2)",
              }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>VERIFIED HEALTHCARE ECOSYSTEM</span>
            </div>

            {/* Main H1 */}
            <h1
              className="font-outfit font-extrabold leading-[1.08] tracking-tight mb-6"
              style={{
                fontSize: "clamp(2.5rem, 5vw, 4.25rem)",
                color: "var(--medica-charcoal)",
              }}
            >
              Quality Healthcare,{" "}
              <span style={{ color: "var(--medica-peach)" }}>
                Right Here
              </span>{" "}
              for You
            </h1>

            {/* Subtext */}
            <p
              className="text-[17px] sm:text-lg leading-relaxed mb-10 max-w-xl"
              style={{ color: "var(--medica-muted)" }}
            >
              Discover verified doctors, book instant consultations, order medicines,
              and access lab tests — all in one trusted platform built for India.
            </p>

            {/* Dual CTA Buttons */}
            <div className="flex items-center gap-4 flex-wrap mb-10">
              <Link href="/doctors" className="btn-medica-dark group" id="hero-book-cta">
                Book Appointment
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/doctors"
                className="btn-medica-outline"
                id="hero-find-cta"
                style={{ color: "var(--medica-charcoal)", borderColor: "var(--medica-charcoal)" }}
              >
                Find Doctors
              </Link>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative z-30 mb-12">
              <div
                className="flex flex-col sm:flex-row items-center p-2 sm:p-1.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] border"
                style={{
                  borderRadius: "2rem",
                  backgroundColor: "rgba(255,255,255,0.85)",
                  backdropFilter: "blur(12px)",
                  borderColor: "rgba(255,255,255,0.6)",
                }}
              >
                <div className="flex-1 flex items-center gap-3 px-4 py-3 sm:py-1.5 w-full">
                  <Search className="w-5 h-5 shrink-0" style={{ color: "var(--medica-olive)" }} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search doctors, specialties, clinics..."
                    className="w-full text-[15px] font-medium placeholder:text-stone-400 focus:outline-none bg-transparent"
                    style={{ color: "var(--medica-charcoal)" }}
                    id="hero-search-input"
                  />
                </div>

                <div className="hidden sm:block w-[1px] h-8 bg-stone-200/50 mx-2" />

                <div className="flex-1 flex items-center w-full border-t border-stone-100 sm:border-none pt-3 mt-2 sm:pt-0 sm:mt-0">
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
                  className="w-full sm:w-auto mt-3 sm:mt-0 sm:ml-1.5 font-outfit font-bold text-[14px] text-white px-7 py-3 rounded-full shrink-0 transition-all hover:opacity-90 active:scale-95 cursor-pointer"
                  style={{ backgroundColor: "var(--medica-olive)" }}
                  id="hero-search-submit"
                >
                  Search
                </button>
              </div>
            </form>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-6">
              {[
                { icon: <CheckCircle2 className="w-4 h-4" />, text: "10,000+ Verified Doctors" },
                { icon: <Zap className="w-4 h-4" />, text: "Instant Booking" },
                { icon: <Languages className="w-4 h-4" />, text: "Regional Languages" },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-[13px] font-medium font-outfit"
                  style={{ color: "var(--medica-muted)" }}>
                  <span style={{ color: "var(--medica-olive)" }}>{item.icon}</span>
                  {item.text}
                </div>
              ))}
            </div>
          </motion.div>

          {/* ─── RIGHT: Doctor Photo Premium Card ─── */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.2 }}
            className="w-full lg:w-[48%] flex justify-center items-center relative mt-8 lg:mt-0"
          >
            <div className="relative w-full max-w-[440px] lg:max-w-none lg:w-[88%]">

              {/* Decorative background blobs */}
              <div
                className="absolute -bottom-8 -right-8 w-[280px] h-[280px] rounded-full blur-2xl opacity-40 z-0"
                style={{ backgroundColor: "var(--medica-peach)" }}
              />
              <div
                className="absolute -top-8 -left-8 w-[200px] h-[200px] rounded-full blur-2xl opacity-30 z-0"
                style={{ backgroundColor: "var(--medica-sage)" }}
              />

              {/* Main Image Card — clean premium style */}
              <div
                className="relative z-10 overflow-hidden shadow-2xl"
                style={{
                  borderRadius: "32px",
                  background: "linear-gradient(145deg, var(--medica-sage) 0%, var(--medica-peach-light, #FDE8D5) 60%, #fff 100%)",
                  border: "1px solid rgba(255,255,255,0.8)",
                }}
              >
                {/* Peach arc top decoration */}
                <div
                  className="absolute top-0 left-0 right-0 h-[45%] z-0 opacity-60"
                  style={{
                    background: "linear-gradient(to bottom, var(--medica-peach) 0%, transparent 100%)",
                    borderRadius: "32px 32px 60% 60%",
                  }}
                />

                {/* Dot grid watermark */}
                <div
                  className="absolute inset-0 z-0 opacity-[0.04]"
                  style={{
                    backgroundImage: "radial-gradient(circle at 2px 2px, #1D1E20 1px, transparent 0)",
                    backgroundSize: "20px 20px",
                  }}
                />

                {/* Doctor Image — centered, shows both doctors fully */}
                <div className="relative z-10 flex items-end justify-center" style={{ height: "clamp(360px, 55vh, 540px)" }}>
                  <img
                    src="/images/hero_doctors.png"
                    alt="Vaididea — Verified Doctors Team"
                    className="w-full h-full object-contain object-bottom drop-shadow-xl"
                    style={{ paddingTop: "24px" }}
                  />
                </div>

                {/* Bottom gradient fade */}
                <div
                  className="absolute bottom-0 left-0 right-0 h-16 z-20"
                  style={{
                    background: "linear-gradient(to top, rgba(228,235,222,0.8), transparent)",
                  }}
                />
              </div>

              {/* Floating Badge: Video Consultation */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="medica-badge absolute top-8 -left-6 sm:-left-14 z-20 flex items-center gap-3 w-[190px] sm:w-[220px]"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--medica-sage)" }}
                >
                  <Video className="w-5 h-5" style={{ color: "var(--medica-olive)" }} />
                </div>
                <div>
                  <p className="text-[13px] font-bold font-outfit" style={{ color: "var(--medica-charcoal)" }}>Video Consult</p>
                  <p className="text-[11px]" style={{ color: "var(--medica-muted)" }}>Connect from anywhere</p>
                </div>
              </motion.div>

              {/* Floating Badge: Verified Doctors */}
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                className="medica-badge absolute bottom-20 -right-5 sm:-right-12 z-20 w-[175px] sm:w-[195px]"
              >
                <div className="flex items-center gap-2 mb-1">
                  <ShieldCheck className="w-4 h-4" style={{ color: "var(--medica-olive)" }} />
                  <p className="text-[13px] font-bold font-outfit" style={{ color: "var(--medica-charcoal)" }}>Verified Doctors</p>
                </div>
                <p className="text-[11px]" style={{ color: "var(--medica-muted)" }}>Background checked & trusted</p>
              </motion.div>

              {/* Floating Badge: 24/7 Support */}
              <motion.div
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="medica-badge absolute -bottom-5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2"
              >
                <Phone className="w-4 h-4" style={{ color: "var(--medica-olive)" }} />
                <span className="text-[13px] font-bold font-outfit" style={{ color: "var(--medica-charcoal)" }}>
                  24/7 Support
                </span>
              </motion.div>
            </div>
          </motion.div>

        </div>

        {/* ─── Services Grid below hero ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="pb-16 pt-8 relative z-20"
        >
          <h3
            className="text-lg font-bold font-outfit mb-6"
            style={{ color: "var(--medica-charcoal)" }}
          >
            Our Healthcare Services
          </h3>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {services.map((svc, i) => (
              <div
                key={i}
                className="bg-white rounded-[20px] p-4 border border-stone-100 hover:-translate-y-2 hover:shadow-xl transition-all duration-300 group cursor-pointer flex flex-col justify-between min-h-[130px]"
                style={{
                  boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
                }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300"
                  style={{
                    backgroundColor: "var(--medica-sage)",
                    color: "var(--medica-olive)",
                  }}
                >
                  {svc.icon}
                </div>
                <div>
                  <h4
                    className="font-bold text-[14px] font-outfit mb-1 group-hover:underline"
                    style={{ color: "var(--medica-charcoal)" }}
                  >
                    {svc.title}
                  </h4>
                  <p className="text-[11px] leading-snug line-clamp-2" style={{ color: "var(--medica-muted)" }}>
                    {svc.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
