"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, Video, TestTube2, Pill, Ambulance } from "lucide-react";
import Link from "next/link";

const services = [
  {
    id: 1,
    title: "Video Consultation",
    desc: "Connect with verified doctors from the comfort of home. Get prescriptions, advice, and follow-ups instantly.",
    image: "/images/medica_service_video.png",
    icon: <Video className="w-5 h-5" />,
    href: "/doctors",
    tag: "Most Popular",
  },
  {
    id: 2,
    title: "Diagnostics & Lab Tests",
    desc: "Book accredited lab tests at home or at certified diagnostic centres. Get reports digitally, fast.",
    image: "/images/medica_service_diagnostics.png",
    icon: <TestTube2 className="w-5 h-5" />,
    href: "/diagnostics",
    tag: "At Home",
  },
  {
    id: 3,
    title: "Online Pharmacy",
    desc: "Order genuine medicines from verified pharmacies. Same-day delivery available across 100+ cities.",
    image: "/images/medica_service_pharmacy.png",
    icon: <Pill className="w-5 h-5" />,
    href: "/pharmacy",
    tag: "Fast Delivery",
  },
  {
    id: 4,
    title: "Emergency & Ambulance",
    desc: "One-tap emergency ambulance booking with live GPS tracking. Available 24/7 for critical situations.",
    image: "/images/medica_service_emergency.png",
    icon: <Ambulance className="w-5 h-5" />,
    href: "/emergency",
    tag: "24/7 Available",
  },
];

export default function WhyChooseSection() {
  return (
    <section
      id="services"
      className="py-20 sm:py-28 relative overflow-hidden"
      style={{ backgroundColor: "var(--medica-iceblue)" }}
    >
      {/* Subtle texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, #1D1E20 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      {/* Ambient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-25"
          style={{ backgroundColor: "var(--medica-peach)" }}
        />
        <div
          className="absolute bottom-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-20"
          style={{ backgroundColor: "var(--medica-olive)" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-14"
        >
          <span
            className="inline-block text-sm font-bold font-outfit tracking-[0.12em] uppercase mb-4"
            style={{ color: "var(--medica-olive)" }}
          >
            What We Offer
          </span>
          <h2 className="medica-heading text-center mb-4">
            Everything You Need,{" "}
            <span style={{ color: "var(--medica-olive)" }}>
              All in One Place
            </span>
          </h2>
          <p
            className="max-w-2xl mx-auto text-[17px] leading-relaxed"
            style={{ color: "var(--medica-text)" }}
          >
            From video consultations to home lab tests — Vaididea brings complete
            healthcare right to your doorstep.
          </p>
        </motion.div>

        {/* 2×2 Service Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {services.map((svc, i) => (
            <motion.div
              key={svc.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: i * 0.1, type: "spring", bounce: 0.3 }}
              className="group bg-white rounded-[24px] overflow-hidden hover:-translate-y-3 hover:shadow-2xl transition-all duration-400 cursor-pointer"
              style={{ boxShadow: "0 4px 20px rgba(0,0,0,0.07)" }}
            >
              {/* Arch-top image */}
              <div
                className="relative overflow-hidden"
                style={{
                  height: "220px",
                  borderRadius: "999px 999px 0 0",
                  margin: "12px 12px 0 12px",
                }}
              >
                {/* Tag pill */}
                <div
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full text-[11px] font-bold font-outfit text-white"
                  style={{ backgroundColor: "var(--medica-olive)" }}
                >
                  {svc.tag}
                </div>

                <img
                  src={svc.image}
                  alt={svc.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />

                {/* Gradient overlay at bottom of image */}
                <div
                  className="absolute inset-x-0 bottom-0 h-16"
                  style={{
                    background:
                      "linear-gradient(to top, rgba(255,255,255,1), transparent)",
                  }}
                />
              </div>

              {/* Card content */}
              <div className="p-6 pt-4">
                {/* Icon pill */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: "var(--medica-sage)",
                      color: "var(--medica-olive)",
                    }}
                  >
                    {svc.icon}
                  </div>
                </div>

                <h3
                  className="text-[18px] font-bold font-outfit mb-2"
                  style={{ color: "var(--medica-charcoal)" }}
                >
                  {svc.title}
                </h3>
                <p
                  className="text-[13px] leading-relaxed mb-5"
                  style={{ color: "var(--medica-muted)" }}
                >
                  {svc.desc}
                </p>

                {/* Explore button */}
                <Link
                  href={svc.href}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-[13px] font-bold font-outfit transition-all duration-200 hover:shadow-md group-hover:-translate-y-0.5"
                  style={{
                    backgroundColor: "var(--medica-charcoal)",
                    color: "#ffffff",
                  }}
                  id={`service-explore-${svc.id}`}
                >
                  Explore
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
