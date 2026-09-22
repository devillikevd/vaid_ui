"use client";

import React, { useRef, useState, useEffect } from "react";
import { motion, useAnimation, useInView } from "framer-motion";
import { Star, Quote } from "lucide-react";

export default function TestimonialsSection() {
  const testimonials = [
    {
      id: 1,
      name: "Rahul Sharma",
      role: "Patient",
      text: "Vaididea made finding a specialist so incredibly easy. I booked an appointment and had a video consultation within hours. The doctor was amazing and the whole process was completely frictionless.",
      rating: 5,
      avatar: "/images/avatar_rahul.png"
    },
    {
      id: 2,
      name: "Priya Patel",
      role: "Mother of two",
      text: "As a working mom, I don't always have time to sit in a clinic waiting room. The Vaididea app lets me consult pediatricians from home. It's been a lifesaver for my family's health.",
      rating: 5,
      avatar: "/images/avatar_priya.png"
    },
    {
      id: 3,
      name: "Amit Desai",
      role: "Patient",
      text: "I was skeptical about telemedicine, but the video quality and the doctor's professionalism completely won me over. Plus, my prescribed medicines were delivered the next day!",
      rating: 5,
      avatar: "/images/avatar_amit.png"
    },
    {
      id: 4,
      name: "Dr. Sneha Rao",
      role: "Verified Doctor",
      text: "The provider portal is fantastic. It allows me to manage my schedule, access patient records securely, and conduct consultations without any technical glitches. Highly recommended for clinics.",
      rating: 5,
      avatar: "/images/avatar_sneha.png"
    }
  ];

  const carouselRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const isInView = useInView(carouselRef, { once: true, amount: 0.2 });

  useEffect(() => {
    if (carouselRef.current) {
      setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
    }
    
    const handleResize = () => {
      if (carouselRef.current) {
        setWidth(carouselRef.current.scrollWidth - carouselRef.current.offsetWidth);
      }
    };
    
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <section className="py-16 sm:py-24 relative overflow-hidden" id="testimonials" style={{ backgroundColor: "var(--medica-olive)" }}>
      {/* Abstract Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div 
          animate={{ rotate: 360, scale: [1, 1.1, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -right-[10%] w-[500px] h-[500px] rounded-full bg-emerald-400/30 blur-[100px]" 
        />
        <motion.div 
          animate={{ rotate: -360, scale: [1, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -left-[10%] w-[600px] h-[600px] rounded-full bg-teal-500/20 blur-[120px]" 
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12 sm:mb-16"
        >
          <span
            className="inline-block text-sm font-bold font-outfit tracking-[0.12em] uppercase mb-4"
            style={{ color: "var(--medica-peach)" }}
          >
            Patient Stories
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 font-outfit">
            Loved by Thousands
          </h2>
          <p className="text-white/70 max-w-2xl mx-auto">
            Don't just take our word for it. Here is what our patients and doctors have to say about their Vaididea experience.
          </p>
        </motion.div>

        {/* Draggable Carousel */}
        <div className="relative cursor-grab active:cursor-grabbing overflow-hidden pb-10" ref={carouselRef}>
          <motion.div 
            drag="x"
            dragConstraints={{ right: 0, left: -width }}
            initial={{ opacity: 0, x: 100 }}
            animate={isInView ? { opacity: 1, x: 0 } : {}}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex gap-6 sm:gap-8 w-max"
          >
            {testimonials.map((testimonial, idx) => (
              <motion.div 
                key={testimonial.id}
                className="w-[300px] sm:w-[400px] bg-white/10 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-white/20 shadow-2xl flex flex-col hover:bg-white/20 hover:border-emerald-300/40 hover:shadow-[0_0_40px_rgba(255,255,255,0.15)] transition-all duration-300 relative overflow-hidden group"
                whileHover={{ y: -8, scale: 1.02 }}
              >
                {/* Subtle gradient overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/0 to-emerald-200/0 group-hover:to-emerald-200/10 transition-colors duration-300 pointer-events-none" />

                <Quote className="w-10 h-10 text-emerald-300/40 mb-4 relative z-10 group-hover:text-emerald-300/60 transition-colors duration-300 group-hover:scale-110" />
                
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star 
                      key={i} 
                      className={`w-4 h-4 ${i < testimonial.rating ? "fill-yellow-400 text-yellow-400" : "fill-white/20 text-transparent"}`} 
                    />
                  ))}
                </div>
                
                <p className="text-white/90 leading-relaxed mb-8 flex-1 text-sm sm:text-base">
                  "{testimonial.text}"
                </p>
                
                <div className="flex items-center gap-4 mt-auto">
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name} 
                    className="w-12 h-12 rounded-full border-2 border-white/30 object-cover"
                  />
                  <div>
                    <h4 className="text-white font-bold text-sm sm:text-base">{testimonial.name}</h4>
                    <p className="text-emerald-200 text-xs">{testimonial.role}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>

      </div>
    </section>
  );
}
