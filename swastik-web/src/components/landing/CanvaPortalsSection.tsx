"use client";

import React from "react";
import Link from "next/link";
import { Stethoscope, Building2, Ambulance, PlusSquare, Pill, Dumbbell, ArrowUpRight } from "lucide-react";

export default function CanvaPortalsSection() {
  const portals = [
    {
      title: "Doctors Portal",
      desc: "Manage appointments, consultations & grow your practice digitally.",
      icon: <Stethoscope className="w-7 h-7" />,
      href: "/register/doctor",
      color: "from-emerald-400 to-teal-600",
      bg: "bg-emerald-50",
    },
    {
      title: "Clinic Portal",
      desc: "Streamline your clinic operations and patient management system.",
      icon: <PlusSquare className="w-7 h-7" />,
      href: "/register/clinic",
      color: "from-blue-400 to-indigo-600",
      bg: "bg-blue-50",
    },
    {
      title: "Ambulance Service",
      desc: "Be available for emergencies — save lives, earn trust.",
      icon: <Ambulance className="w-7 h-7" />,
      href: "/register/ambulance",
      color: "from-red-400 to-rose-600",
      bg: "bg-red-50",
    },
    {
      title: "Hospitals Portal",
      desc: "Manage departments, staff, patients and hospital operations.",
      icon: <Building2 className="w-7 h-7" />,
      href: "/register/hospital",
      color: "from-violet-400 to-purple-600",
      bg: "bg-violet-50",
    },
    {
      title: "Pharmacies Portal",
      desc: "Manage inventory, process orders and serve your customers.",
      icon: <Pill className="w-7 h-7" />,
      href: "/register/pharmacy",
      color: "from-amber-400 to-orange-600",
      bg: "bg-amber-50",
    },
    {
      title: "Gym & Fitness",
      desc: "Manage members, plans and fitness services on one platform.",
      icon: <Dumbbell className="w-7 h-7" />,
      href: "/register/fitness-center",
      color: "from-cyan-400 to-sky-600",
      bg: "bg-cyan-50",
    },
  ];

  return (
    <section className="py-28 bg-[#F5F8F7] font-sans relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-[#2B6A60]/5 rounded-full blur-[150px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-purple-200/20 rounded-full blur-[120px] translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="max-w-[1400px] mx-auto px-6 sm:px-10 lg:px-16 relative z-10">
        
        <div className="text-center mb-20">
          <div className="inline-flex items-center gap-2 bg-[#2B6A60]/10 text-[#2B6A60] text-sm font-bold px-5 py-2 rounded-full mb-6 tracking-wider uppercase">
            <span className="w-2 h-2 bg-[#2B6A60] rounded-full animate-pulse"></span> For Healthcare Providers
          </div>
          <h2 className="text-5xl md:text-6xl font-bold text-[#222] tracking-tight mb-6">
            One Ecosystem, <br/>
            <span className="italic text-[#2B6A60] font-serif font-medium">Many Possibilities.</span>
          </h2>
          <p className="text-lg text-gray-500 font-medium max-w-xl mx-auto leading-relaxed">
            Join the VaidIdea network. Whether you're a doctor, hospital, or pharmacy — we have a portal built just for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-[1200px] mx-auto">
          {portals.map((portal, index) => (
            <Link 
              key={index} 
              href={portal.href}
              className="group bg-white hover:bg-white p-8 rounded-[32px] transition-all duration-500 border border-gray-100 hover:border-gray-200 shadow-sm hover:shadow-2xl hover:-translate-y-2 flex flex-col items-start relative overflow-hidden"
            >
              {/* Gradient accent on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${portal.color} opacity-0 group-hover:opacity-[0.03] transition-opacity duration-500`} />
              
              <div className={`w-16 h-16 rounded-2xl ${portal.bg} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 relative z-10`}>
                <div className={`bg-gradient-to-br ${portal.color} bg-clip-text`}>
                  {React.cloneElement(portal.icon, { className: "w-7 h-7 text-current" })}
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-[#222] mb-3 flex items-center gap-2 relative z-10">
                {portal.title}
                <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-[#2B6A60] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed font-medium relative z-10">
                {portal.desc}
              </p>
            </Link>
          ))}
        </div>

      </div>
    </section>
  );
}
