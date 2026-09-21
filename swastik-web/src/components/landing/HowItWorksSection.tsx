"use client";

import React from "react";
import { motion } from "framer-motion";
import { Search, CalendarCheck, Video, HeartPulse } from "lucide-react";

export default function HowItWorksSection() {
  const steps = [
    {
      id: 1,
      title: "Find Your Doctor",
      desc: "Search by specialty, location, or condition.",
      icon: <Search className="w-6 h-6 text-[#059669]" />,
    },
    {
      id: 2,
      title: "Book Appointment",
      desc: "Choose a time slot that works best for you.",
      icon: <CalendarCheck className="w-6 h-6 text-[#059669]" />,
    },
    {
      id: 3,
      title: "Consult Seamlessly",
      desc: "Connect via secure video or visit in-person.",
      icon: <Video className="w-6 h-6 text-[#059669]" />,
    },
    {
      id: 4,
      title: "Get Better",
      desc: "Follow up, order meds, and track your health.",
      icon: <HeartPulse className="w-6 h-6 text-[#059669]" />,
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.25 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { duration: 0.6, type: "spring" as const, bounce: 0.4 }
    }
  };

  // The connecting line animation
  const lineVariants = {
    hidden: { width: "0%" },
    visible: { 
      width: "100%", 
      transition: { duration: 0.8, ease: "easeInOut" as const, delay: 0.5 }
    }
  };

  return (
    <section className="py-16 sm:py-24 bg-stone-50/50 relative overflow-hidden border-t border-stone-100" id="how-it-works">
      {/* Ambient Mesh Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[10%] left-[20%] w-[400px] h-[400px] bg-emerald-200/30 rounded-full blur-[80px] mix-blend-multiply" />
        <div className="absolute bottom-[10%] right-[20%] w-[400px] h-[400px] bg-teal-200/30 rounded-full blur-[80px] mix-blend-multiply" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-stone-900 tracking-tight mb-4">
            How <span className="text-[#059669]">Vaididea</span> Works
          </h2>
          <p className="text-stone-500 max-w-2xl mx-auto">
            Your journey to better health is simple, secure, and fully digital. Get started in four easy steps.
          </p>
        </motion.div>

        <div className="relative">
          {/* Animated Connecting Line (Desktop only) */}
          <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-[2px] bg-stone-200/80 -z-10 overflow-hidden">
            <motion.div 
              variants={lineVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-emerald-400 to-teal-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
            />
          </div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-6"
          >
            {steps.map((step) => (
              <motion.div key={step.id} variants={itemVariants} className="relative flex flex-col items-center text-center group cursor-default">
                {/* Step Circle with Glow */}
                <div className="w-20 h-20 bg-white/80 backdrop-blur-md rounded-full border-2 border-stone-100 shadow-lg flex items-center justify-center mb-6 group-hover:border-emerald-400 group-hover:shadow-emerald-500/30 group-hover:-translate-y-2 transition-all duration-500 relative z-20 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-100 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10 group-hover:scale-110 group-hover:text-emerald-700 transition-all duration-300">
                    {step.icon}
                  </div>
                  
                  {/* Step Number Badge */}
                  <div className="absolute -top-0 -right-0 w-7 h-7 bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-full flex items-center justify-center text-[12px] font-bold shadow-md shadow-emerald-500/40">
                    {step.id}
                  </div>
                </div>
                
                <h3 className="text-lg font-bold text-stone-900 mb-2 group-hover:text-[#059669] transition-colors">
                  {step.title}
                </h3>
                <p className="text-sm text-stone-500 leading-relaxed max-w-[220px]">
                  {step.desc}
                </p>
              </motion.div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
