"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search, CalendarCheck, Video, HeartPulse, ArrowRight } from "lucide-react";

export default function HowItWorksSection() {
  const steps = [
    {
      id: 1,
      title: "Find Your Doctor",
      desc: "Search by specialty, location, condition, or language — powered by smart filters.",
      icon: <Search className="w-7 h-7" />,
    },
    {
      id: 2,
      title: "Book Appointment",
      desc: "Choose a time slot that fits your schedule. Instant confirmation, no waiting.",
      icon: <CalendarCheck className="w-7 h-7" />,
    },
    {
      id: 3,
      title: "Consult Seamlessly",
      desc: "Connect via secure HD video call or visit the clinic in person — your choice.",
      icon: <Video className="w-7 h-7" />,
    },
    {
      id: 4,
      title: "Get Better",
      desc: "Follow up, order medicines, track health records, and stay on top of your wellness.",
      icon: <HeartPulse className="w-7 h-7" />,
    },
  ];

  return (
    <section
      id="how-it-works"
      className="py-20 sm:py-28 relative overflow-hidden"
      style={{ backgroundColor: "var(--medica-sage)" }}
    >
      {/* Soft ambient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div
          className="absolute top-[-10%] left-[-5%] w-[400px] h-[400px] rounded-full blur-[100px] opacity-25"
          style={{ backgroundColor: "var(--medica-olive)" }}
        />
        <div
          className="absolute bottom-[-10%] right-[-5%] w-[350px] h-[350px] rounded-full blur-[90px] opacity-20"
          style={{ backgroundColor: "var(--medica-peach)" }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.7 }}
          className="text-center mb-16"
        >
          <span
            className="inline-block text-sm font-bold font-outfit tracking-[0.12em] uppercase mb-4"
            style={{ color: "var(--medica-olive)" }}
          >
            Simple Process
          </span>
          <h2 className="medica-heading text-center mb-4">
            How{" "}
            <span style={{ color: "var(--medica-olive)" }}>Vaididea</span>{" "}
            Works
          </h2>
          <p
            className="max-w-2xl mx-auto text-[17px] leading-relaxed"
            style={{ color: "var(--medica-text)" }}
          >
            Your journey to better health is simple, secure, and fully digital.
            Get started in four easy steps.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.6, delay: i * 0.12, type: "spring", bounce: 0.3 }}
              className="relative group"
            >
              {/* Arrow connector (desktop only) */}
              {i < steps.length - 1 && (
                <div className="hidden lg:flex absolute top-10 -right-3 z-10 items-center justify-center">
                  <ArrowRight
                    className="w-5 h-5 opacity-40"
                    style={{ color: "var(--medica-olive)" }}
                  />
                </div>
              )}

              {/* Card */}
              <div
                className="bg-white rounded-[24px] p-7 h-full hover:-translate-y-2 hover:shadow-xl transition-all duration-300 cursor-default"
                style={{ boxShadow: "0 2px 20px rgba(0,0,0,0.06)" }}
              >
                {/* Step number pill */}
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[15px] font-extrabold font-outfit shrink-0"
                    style={{ backgroundColor: "var(--medica-olive)" }}
                  >
                    {step.id}
                  </div>
                  <div
                    className="h-[2px] flex-1 rounded-full opacity-30"
                    style={{ backgroundColor: "var(--medica-olive)" }}
                  />
                </div>

                {/* Icon */}
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300"
                  style={{
                    backgroundColor: "var(--medica-sage)",
                    color: "var(--medica-olive)",
                  }}
                >
                  {step.icon}
                </div>

                {/* Text */}
                <h3
                  className="text-[18px] font-bold font-outfit mb-3"
                  style={{ color: "var(--medica-charcoal)" }}
                >
                  {step.title}
                </h3>
                <p
                  className="text-[14px] leading-relaxed"
                  style={{ color: "var(--medica-muted)" }}
                >
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
