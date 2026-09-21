"use client";

import React, { useEffect, useState, useRef } from "react";
import { motion, useInView, useAnimation } from "framer-motion";
import { Users, Building2, Stethoscope, Award } from "lucide-react";

// A small component to animate a number from 0 to target
const AnimatedNumber = ({ value, duration = 2 }: { value: number, duration?: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });

  useEffect(() => {
    if (isInView) {
      let start = 0;
      const stepTime = Math.abs(Math.floor((duration * 1000) / value));
      const end = value;
      
      const timer = setInterval(() => {
        start += 1;
        setCount(start);
        if (start === end) clearInterval(timer);
      }, stepTime > 0 ? stepTime : 10); // Minimum 10ms step to avoid freezing

      // For large numbers, jump in bigger increments
      if (value > 200) {
        clearInterval(timer);
        let current = 0;
        const increment = Math.ceil(value / 60); // 60 frames
        const fastTimer = setInterval(() => {
          current += increment;
          if (current >= value) {
            setCount(value);
            clearInterval(fastTimer);
          } else {
            setCount(current);
          }
        }, 33);
      }
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
      icon: <Users className="w-8 h-8 text-emerald-600" />,
      color: "from-emerald-500/20 to-emerald-500/5",
    },
    {
      id: 2,
      name: "Verified Doctors",
      value: 10000,
      suffix: "+",
      icon: <Stethoscope className="w-8 h-8 text-teal-600" />,
      color: "from-teal-500/20 to-teal-500/5",
    },
    {
      id: 3,
      name: "Partner Hospitals",
      value: 500,
      suffix: "+",
      icon: <Building2 className="w-8 h-8 text-[#059669]" />,
      color: "from-[#059669]/20 to-[#059669]/5",
    },
    {
      id: 4,
      name: "Awards Won",
      value: 25,
      suffix: "",
      icon: <Award className="w-8 h-8 text-orange-500" />,
      color: "from-orange-500/20 to-orange-500/5",
    },
  ];

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.15,
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30, scale: 0.9 },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: { duration: 0.6, type: "spring" as const, bounce: 0.4 }
    }
  };

  return (
    <section className="py-12 sm:py-20 bg-stone-50 relative overflow-hidden border-t border-stone-200/50" id="impact">
      {/* Ambient Mesh Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div 
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.7, 0.5] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-300/40 rounded-full blur-[100px] mix-blend-multiply" 
        />
        <motion.div 
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-teal-300/40 rounded-full blur-[100px] mix-blend-multiply" 
        />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 lg:gap-10"
        >
          {stats.map((stat) => (
            <motion.div 
              key={stat.id}
              variants={itemVariants}
              className="relative flex flex-col items-center justify-center p-6 sm:p-8 bg-white/40 backdrop-blur-xl rounded-[2rem] border border-white/60 shadow-lg shadow-emerald-500/5 hover:shadow-xl hover:shadow-emerald-500/15 hover:-translate-y-2 transition-all duration-300 group cursor-default overflow-hidden"
            >
              {/* Subtle hover gradient border */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${stat.color} flex items-center justify-center mb-5 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-500 relative z-10 shadow-inner`}>
                {stat.icon}
              </div>
              <div className="flex items-baseline gap-0.5 text-3xl sm:text-4xl lg:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-br from-stone-800 to-stone-600 mb-1 relative z-10">
                <AnimatedNumber value={stat.value} />
                <span>{stat.suffix}</span>
              </div>
              <p className="text-sm font-bold text-stone-500 tracking-wider uppercase relative z-10">{stat.name}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
