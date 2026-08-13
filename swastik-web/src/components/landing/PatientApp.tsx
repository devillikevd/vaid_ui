"use client";

import React from "react";

const features = [
  {
    num: "1",
    title: "Smart Doctor Booking",
    desc: "Find top-rated specialists in your area with verified reviews and instant appointment confirmations.",
  },
  {
    num: "2",
    title: "One-Tap Emergency SOS",
    desc: "Instantly dispatch the nearest ambulance and notify emergency contacts with a single tap.",
  },
  {
    num: "3",
    title: "Unified Health ID",
    desc: "Securely store prescriptions, lab reports, and consultation histories in one encrypted vault.",
  },
  {
    num: "4",
    title: "AI Symptom Checker",
    desc: "Get instant health guidance from our AI assistant — anytime, anywhere.",
  },
];

export default function PatientApp() {
  return (
    <section className="py-24 sm:py-32 bg-white relative overflow-hidden" id="patient-app">
      {/* Siri Glowing Background for Depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-60">
        <div className="siri-orb-1 w-[60vw] h-[60vw] top-[-10%] left-[-20%]" />
        <div className="siri-orb-3 w-[40vw] h-[40vw] bottom-[10%] right-[10%] opacity-40" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-20 items-center">
          {/* Left: Content */}
          <div className="animate-in fade-in slide-in-from-left-8 duration-1000 fill-mode-both">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full apple-glass shadow-sm mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-vd-forest animate-pulse" />
              <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase text-vd-forest/90">Patient App</span>
            </div>

            <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl text-vd-forest mb-6 leading-[1.1] tracking-tight">
              Your health,
              <br />
              <em className="text-transparent bg-clip-text bg-gradient-to-r from-vd-forest to-vd-sage italic">in one elegant app.</em>
            </h2>

            <p className="text-vd-muted text-lg sm:text-xl leading-relaxed mb-12 max-w-lg font-light tracking-wide">
              Experience a beautifully crafted interface designed to
              make healthcare accessible, calm, and trustworthy.
              From AI symptom checks to instant emergency response.
            </p>

            <div className="space-y-8">
              {features.map((f, i) => (
                <div key={f.num} className="flex gap-5 group animate-in fade-in slide-in-from-bottom-4 duration-1000 fill-mode-both" style={{ animationDelay: `${500 + i * 200}ms` }}>
                  <span className="text-2xl font-heading font-light text-vd-forest/20 group-hover:text-vd-sage transition-colors duration-500 shrink-0 w-6">{f.num}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-vd-forest mb-1.5">{f.title}</h3>
                    <p className="text-sm text-vd-muted leading-relaxed font-light">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Phone Mockup */}
          <div className="flex justify-center lg:justify-end animate-in fade-in slide-in-from-right-8 duration-1000 delay-500 fill-mode-both">
            <div className="relative group/phone">
              {/* Strong ambient glow behind phone */}
              <div className="absolute inset-0 bg-gradient-to-tr from-emerald-400/30 via-teal-500/20 to-vd-forest/40 blur-3xl rounded-full scale-[0.85] group-hover/phone:scale-105 group-hover/phone:rotate-3 transition-all duration-1000 opacity-70" />
              
              {/* Glassy Phone Frame */}
              <div className="w-[280px] sm:w-[320px] h-[570px] sm:h-[650px] relative rounded-[3rem] p-[8px] bg-white/20 backdrop-blur-3xl shadow-[0_30px_60px_-15px_rgba(15,95,80,0.4)] border border-white/60 group-hover/phone:-translate-y-2 transition-transform duration-700 ease-out">
                {/* Inner Bezel */}
                <div className="w-full h-full bg-black rounded-[2.6rem] p-[4px] relative overflow-hidden shadow-inner">
                  {/* Screen Image Container */}
                  <div className="w-full h-full bg-vd-cream rounded-[2.3rem] overflow-hidden relative group">
                    {/* CSS Generated Patient App UI - Premium Apple Style */}
                    <div className="w-full h-full bg-[#F5F5F7] flex flex-col relative overflow-hidden font-sans">
                      {/* Subtle Background Blobs for depth */}
                      <div className="absolute top-0 right-0 w-48 h-48 bg-vd-forest/10 rounded-full blur-3xl" />
                      <div className="absolute bottom-1/2 left-0 w-32 h-32 bg-teal-500/10 rounded-full blur-3xl" />

                      {/* Status Bar & Header */}
                      <div className="pt-3 px-5 pb-4 bg-gradient-to-b from-white via-white/95 to-white/0 z-20">
                        <div className="flex items-center justify-between text-black text-[9px] mb-4 font-semibold tracking-wider">
                          <span>9:41</span>
                          {/* iOS style icons */}
                          <div className="flex items-center gap-1.5 opacity-80">
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C18.16 4.16 7.84 4.16 1 9zm4 4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13zm4 4l2 2c.55-.55 1.45-.55 2 0l2-2c-1.66-1.66-4.34-1.66-6 0z"/></svg>
                            <div className="w-4 h-2.5 border-[1.5px] border-black rounded-[3px] p-[1px] flex justify-start">
                              <div className="w-[75%] h-full bg-black rounded-[1px]" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-end">
                          <div>
                            <p className="text-gray-500 font-medium text-[9px] mb-0.5 uppercase tracking-widest">Good Morning</p>
                            <h2 className="text-black font-bold text-lg tracking-tight">Nayan Prakash</h2>
                          </div>
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-vd-forest to-emerald-400 p-[1px] shadow-sm">
                            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                              <span className="text-vd-forest font-bold text-[10px]">NP</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Main Scrollable Content */}
                      <div className="flex-1 overflow-y-auto px-4 pb-20 hide-scrollbar relative z-10">
                        
                        {/* Premium AI Card */}
                        <div className="mb-5 mt-1 relative group cursor-pointer">
                          <div className="absolute inset-0 bg-gradient-to-r from-vd-forest to-emerald-500 rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity" />
                          <div className="relative bg-white/60 backdrop-blur-xl border border-white p-4 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-vd-forest to-emerald-500 flex items-center justify-center shadow-inner">
                                   <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                <span className="font-bold text-gray-900 text-xs">Vaididea AI</span>
                              </div>
                              <span className="flex h-2 w-2 relative mt-1">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-600 leading-relaxed font-medium">
                              Your vitals look great today! Would you like to review your latest health scan or book a follow-up?
                            </p>
                          </div>
                        </div>

                        {/* Quick Actions Grid */}
                        <h3 className="text-black font-bold text-xs mb-3 ml-1 tracking-tight">Quick Actions</h3>
                        <div className="grid grid-cols-2 gap-3 mb-5">
                          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 border border-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:scale-[1.02] transition-transform cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mb-2 text-blue-600">
                               <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                            </div>
                            <p className="font-bold text-gray-900 text-[10px] mb-0.5">Video Consult</p>
                            <p className="text-[8px] text-gray-500">Connect instantly</p>
                          </div>
                          <div className="bg-white/80 backdrop-blur-md rounded-2xl p-3 border border-white shadow-[0_4px_20px_rgb(0,0,0,0.03)] hover:scale-[1.02] transition-transform cursor-pointer">
                            <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center mb-2 text-orange-600">
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>
                            </div>
                            <p className="font-bold text-gray-900 text-[10px] mb-0.5">Clinic Visit</p>
                            <p className="text-[8px] text-gray-500">Book appointment</p>
                          </div>
                        </div>

                        {/* Health Tools List */}
                        <h3 className="text-black font-bold text-xs mb-3 ml-1 tracking-tight">Ecosystem</h3>
                        <div className="space-y-2.5">
                          <div className="bg-white/70 backdrop-blur-md rounded-2xl p-3 border border-white shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex items-center gap-3 cursor-pointer group hover:bg-white transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 21h7a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v11m0 5l4.879-4.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242z" /></svg>
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-900 text-[10px]">Diagnostics</p>
                              <p className="text-[8px] text-gray-500">View test reports & scans</p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-purple-50 transition-colors">
                              <svg className="w-3 h-3 text-gray-400 group-hover:text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                          </div>

                          <div className="bg-white/70 backdrop-blur-md rounded-2xl p-3 border border-white shadow-[0_4px_20px_rgb(0,0,0,0.02)] flex items-center gap-3 cursor-pointer group hover:bg-white transition-colors">
                            <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-pink-600 shrink-0">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            </div>
                            <div className="flex-1">
                              <p className="font-bold text-gray-900 text-[10px]">Pharmacy</p>
                              <p className="text-[8px] text-gray-500">Order medicines online</p>
                            </div>
                            <div className="w-6 h-6 rounded-full bg-gray-50 flex items-center justify-center group-hover:bg-pink-50 transition-colors">
                              <svg className="w-3 h-3 text-gray-400 group-hover:text-pink-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Premium Floating Bottom Nav */}
                      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl px-5 py-3 flex justify-between items-center shadow-[0_8px_30px_rgb(0,0,0,0.12)] z-20">
                        <div className="flex flex-col items-center gap-1 group cursor-pointer">
                          <svg className="w-5 h-5 text-vd-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
                          <div className="w-1 h-1 rounded-full bg-vd-forest mt-0.5" />
                        </div>
                        <div className="flex flex-col items-center gap-1 group cursor-pointer opacity-40 hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        {/* Floating Action Button */}
                        <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-rose-500 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30 transform -translate-y-4 border-4 border-[#F5F5F7] cursor-pointer hover:scale-105 transition-transform">
                          <span className="text-white text-[9px] font-bold tracking-widest">SOS</span>
                        </div>
                        <div className="flex flex-col items-center gap-1 group cursor-pointer opacity-40 hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                        </div>
                        <div className="flex flex-col items-center gap-1 group cursor-pointer opacity-40 hover:opacity-100 transition-opacity">
                          <svg className="w-5 h-5 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                      </div>
                    </div>

                    {/* Glassy reflection overlay on screen */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
                  </div>
                  
                  {/* Dynamic Island / Notch */}
                  <div className="absolute top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-black rounded-full" />
                </div>
              </div>

              {/* Enhanced Shadow glow */}
              <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-4/5 h-12 bg-vd-forest/20 blur-2xl rounded-full" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
