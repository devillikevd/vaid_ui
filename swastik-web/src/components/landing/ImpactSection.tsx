"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Users, Building2, Stethoscope, Award } from "lucide-react";

const AnimatedNumber = ({ value, duration = 2 }: { value: number; duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (isInView) {
      let current = 0;
      const increment = Math.ceil(value / 60);
      const timer = setInterval(() => {
        current += increment;
        if (current >= value) {
          setCount(value);
          clearInterval(timer);
        } else {
          setCount(current);
        }
      }, 33);
      return () => clearInterval(timer);
    }
  }, [isInView, value, duration]);

  return <span ref={ref}>{count.toLocaleString()}</span>;
};

export default function ImpactSection() {
  const stats = [
    {
      id: 1,
      name: "Happy Patients",
      value: 150000,
      suffix: "+",
      icon: <Users className="w-7 h-7" />,
      accent: "var(--medica-peach)",
    },
    {
      id: 2,
      name: "Verified Doctors",
      value: 10000,
      suffix: "+",
      icon: <Stethoscope className="w-7 h-7" />,
      accent: "var(--medica-olive)",
    },
    {
      id: 3,
      name: "Partner Hospitals",
      value: 500,
      suffix: "+",
      icon: <Building2 className="w-7 h-7" />,
      accent: "var(--medica-peach)",
    },
    {
      id: 4,
      name: "Awards Won",
      value: 25,
      suffix: "",
      icon: <Award className="w-7 h-7" />,
      accent: "var(--medica-olive)",
    },
  ];

  return (
    <section
      id="impact"
      className="py-16 sm:py-20 relative overflow-hidden"
      style={{ backgroundColor: "var(--medica-offwhite)" }}
    >
      {/* Subtle texture */}
      <div
        className="absolute inset-0 opacity-[0.025] pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 2px 2px, #1D1E20 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section label */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span
            className="inline-block text-sm font-bold font-outfit tracking-[0.12em] uppercase mb-3"
            style={{ color: "var(--medica-olive)" }}
          >
            Our Impact
          </span>
          <h2 className="medica-heading text-center">
            Numbers That Speak
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.id}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: i * 0.1, type: "spring", bounce: 0.3 }}
              className="bg-white rounded-[24px] p-6 sm:p-8 text-center hover:-translate-y-2 hover:shadow-xl transition-all duration-300 cursor-default"
              style={{ boxShadow: "0 2px 16px rgba(0,0,0,0.05)" }}
            >
              {/* Icon circle */}
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
                style={{
                  backgroundColor: `${stat.accent}20`,
                  color: stat.accent,
                }}
              >
                {stat.icon}
              </div>

              {/* Number */}
              <div
                className="text-3xl sm:text-4xl lg:text-5xl font-extrabold font-outfit mb-2 leading-none"
                style={{ color: "var(--medica-charcoal)" }}
              >
                <AnimatedNumber value={stat.value} />
                {stat.suffix}
              </div>

              {/* Label */}
              <p
                className="text-sm font-semibold font-outfit tracking-wide uppercase"
                style={{ color: "var(--medica-muted)" }}
              >
                {stat.name}
              </p>

              {/* Accent bar */}
              <div
                className="mt-4 h-1 w-12 rounded-full mx-auto"
                style={{ backgroundColor: stat.accent }}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
