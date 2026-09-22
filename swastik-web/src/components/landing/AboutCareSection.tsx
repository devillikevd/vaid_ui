"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Star, Quote, ArrowRight } from "lucide-react";

export default function AboutCareSection() {
  return (
    <section
      id="about-care"
      className="py-20 sm:py-28 relative overflow-hidden"
      style={{ backgroundColor: "var(--medica-sage)" }}
    >
      {/* Subtle background texture */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, #3A691E 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
          {/* LEFT — Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="w-full lg:w-1/2 flex flex-col"
          >
            {/* Eyebrow */}
            <span
              className="inline-block font-outfit text-sm font-700 tracking-[0.12em] uppercase mb-5"
              style={{ color: "var(--medica-olive)" }}
            >
              Trusted by 1,50,000+ Patients
            </span>

            {/* Heading */}
            <h2 className="medica-heading mb-6">
              Care You Can <br />
              <span style={{ color: "var(--medica-olive)" }}>Truly Trust</span>
            </h2>

            {/* Body */}
            <p
              className="text-[17px] leading-relaxed mb-6 max-w-xl"
              style={{ color: "var(--medica-text)" }}
            >
              At Vaididea, we connect you with verified, background-checked doctors
              across India. Whether it's a quick video consultation from home or a
              specialist visit in your city — we make quality healthcare simple,
              affordable, and accessible.
            </p>

            {/* Bullet features */}
            <ul className="space-y-3 mb-10">
              {[
                "Verified & licensed doctors only",
                "Instant video & in-person consultations",
                "Lab tests, pharmacy & home care — all in one app",
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-[15px]" style={{ color: "var(--medica-text)" }}>
                  <span
                    className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white text-[11px] font-bold"
                    style={{ backgroundColor: "var(--medica-olive)" }}
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>

            {/* CTA */}
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/doctors" className="btn-medica-dark group">
                Book Appointment
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center gap-1.5 text-[15px] font-semibold font-outfit underline underline-offset-4"
                style={{ color: "var(--medica-olive)" }}
              >
                Learn more
              </Link>
            </div>
          </motion.div>

          {/* RIGHT — Arch Photo + Floating Badge */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7, ease: "easeOut", delay: 0.15 }}
            className="w-full lg:w-1/2 relative flex justify-center"
          >
            {/* Arch image frame */}
            <div className="relative w-full max-w-md">
              {/* Decorative circle behind */}
              <div
                className="absolute -bottom-8 -right-8 w-72 h-72 rounded-full opacity-30"
                style={{ backgroundColor: "var(--medica-olive)" }}
              />

              {/* Main photo with arch top */}
              <div
                className="relative z-10 overflow-hidden shadow-2xl"
                style={{
                  borderRadius: "50% 50% 6px 6px / 40% 40% 6px 6px",
                  aspectRatio: "4/5",
                }}
              >
                <img
                  src="/images/medica_about_doctor.png"
                  alt="Doctor consulting patient at Vaididea"
                  className="w-full h-full object-cover"
                />
                {/* Overlay tint for warmth */}
                <div
                  className="absolute inset-0 opacity-10"
                  style={{
                    background: `linear-gradient(to bottom, var(--medica-olive), transparent)`,
                  }}
                />
              </div>

              {/* Floating Testimonial Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.5, type: "spring", bounce: 0.4 }}
                className="medica-badge medica-float absolute -left-8 sm:-left-16 bottom-16 z-20 w-[220px] sm:w-[260px]"
              >
                <div className="flex items-center gap-1 mb-2">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400"
                    />
                  ))}
                </div>
                <p className="text-[13px] leading-snug font-medium mb-3" style={{ color: "var(--medica-charcoal)" }}>
                  "Quick, caring, and convenient! Found my specialist in minutes."
                </p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: "var(--medica-olive)" }}
                  >
                    PK
                  </div>
                  <div>
                    <p className="text-[12px] font-bold" style={{ color: "var(--medica-charcoal)" }}>Priya Kumar</p>
                    <p className="text-[11px]" style={{ color: "var(--medica-muted)" }}>Verified Patient</p>
                  </div>
                </div>
              </motion.div>

              {/* Stats badge top-right */}
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: 0.7, type: "spring", bounce: 0.4 }}
                className="medica-badge medica-float absolute -right-4 sm:-right-10 top-10 z-20 w-[150px] text-center"
                style={{ animationDelay: "1s" }}
              >
                <p
                  className="text-3xl font-extrabold font-outfit"
                  style={{ color: "var(--medica-olive)" }}
                >
                  10K+
                </p>
                <p className="text-[12px] font-semibold" style={{ color: "var(--medica-charcoal)" }}>
                  Verified Doctors
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
