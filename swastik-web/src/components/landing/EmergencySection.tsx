"use client";

import React, { useState } from "react";

const steps = [
  {
    step: "01",
    title: "SOS Activated",
    desc: "A single tap triggers an emergency broadcast with audible and haptic feedback.",
    icon: "🚨",
    detail: "Immediate Alert",
  },
  {
    step: "02",
    title: "Location Detected",
    desc: "Real-time GPS coordinates and primary contact details are securely fetched.",
    icon: "📍",
    detail: "GPS Locked",
  },
  {
    step: "03",
    title: "Nearby Services Alerted",
    desc: "Registered nearby ambulances, partner hospitals, and designated family contacts receive the notification.",
    icon: "📡",
    detail: "Live Broadcast",
  },
  {
    step: "04",
    title: "Help Can Respond",
    desc: "Responders navigate directly toward the patient coordinate with live route tracking.",
    icon: "🚑",
    detail: "En Route",
  },
];

export default function EmergencySection() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <section className="py-20 sm:py-28 bg-white relative overflow-hidden" id="emergency-sos">
      {/* Subtle emergency ambient glow */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] bg-radial from-red-500/10 via-vd-forest/5 to-transparent blur-3xl" />
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 sm:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-50 border border-red-200/80 shadow-xs mb-4">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            <span className="text-[11px] sm:text-xs font-bold tracking-[0.2em] uppercase text-red-700">
              Emergency Response
            </span>
          </div>

          <h2 className="font-heading text-3xl sm:text-5xl md:text-6xl text-vd-forest font-semibold mb-6 tracking-tight">
            When every second{" "}
            <span className="text-red-600 italic font-normal">matters.</span>
          </h2>

          <p className="text-base sm:text-lg text-vd-muted max-w-2xl mx-auto font-light leading-relaxed">
            Vaididea helps connect an emergency situation with nearby support and emergency
            services, so help can reach the person as early as possible.
          </p>
        </div>

        {/* 4-Step Interactive Emergency Flow */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {steps.map((item, idx) => {
            const isActive = activeStep === idx;
            return (
              <div
                key={item.step}
                onClick={() => setActiveStep(idx)}
                className={`rounded-3xl p-7 relative border transition-all duration-300 cursor-pointer flex flex-col justify-between group ${
                  isActive
                    ? "bg-white border-red-200 shadow-[0_16px_36px_rgba(220,38,38,0.08)] -translate-y-1.5 ring-2 ring-red-500/20"
                    : "bg-white/60 hover:bg-white border-gray-100 shadow-[0_8px_20px_rgba(0,0,0,0.02)]"
                }`}
              >
                <div>
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-3xl group-hover:scale-110 transition-transform">
                      {item.icon}
                    </span>
                    <span
                      className={`text-xs font-mono font-bold px-2.5 py-1 rounded-full ${
                        isActive
                          ? "bg-red-50 text-red-600 border border-red-100"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      STEP {item.step}
                    </span>
                  </div>

                  <h3 className="font-heading text-xl font-semibold text-vd-forest mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-vd-muted font-light leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-[11px]">
                  <span className="font-medium text-vd-muted">Status</span>
                  <span
                    className={`font-semibold ${
                      isActive ? "text-red-600" : "text-gray-400"
                    }`}
                  >
                    {item.detail}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Safety Note & Protocol */}
        <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/70 max-w-3xl mx-auto flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
          <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 text-base font-bold">
            ℹ️
          </div>
          <p className="text-xs sm:text-sm text-slate-600 font-light leading-relaxed">
            Emergency SOS operates via integrated mobile GPS and real-time WebSocket communication.
            Response times depend on regional network availability and nearby provider fleet presence.
          </p>
        </div>
      </div>
    </section>
  );
}
