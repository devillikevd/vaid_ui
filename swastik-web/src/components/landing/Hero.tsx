"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function Hero() {
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerType, setScannerType] = useState<"Patient" | "Driver" | null>(null);

  const openScanner = (type: "Patient" | "Driver") => {
    if (typeof window !== 'undefined') {
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
      
      if (isMobile) {
        // Redirect to Playstore based on app type
        const playstoreLink = type === "Patient" 
          ? "https://play.google.com/store/apps/details?id=com.vaididea.patient"
          : "https://play.google.com/store/apps/details?id=com.vaididea.ambulance";
        window.open(playstoreLink, "_blank");
        return;
      }
    }
    
    setScannerType(type);
    setScannerOpen(true);
  };

  return (
    <section className="relative min-h-screen portrait:min-h-0 portrait:py-24 flex items-center justify-center pt-32 pb-8 overflow-hidden bg-[#EFF6FF] text-[#0F172A]" id="vision">
      {/* Dynamic Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 -left-1/4 w-[50vw] h-[50vw] bg-brand-primary/20 rounded-full blur-[120px] mix-blend-multiply opacity-60 animate-pulse"></div>
        <div className="absolute bottom-1/4 -right-1/4 w-[60vw] h-[60vw] bg-brand-accent/20 rounded-full blur-[150px] mix-blend-multiply opacity-50"></div>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid md:grid-cols-2 portrait:grid-cols-1 portrait:md:grid-cols-1 gap-12 lg:gap-8 items-center">
          
          {/* Left Content */}
          <div className="text-center md:text-left portrait:md:text-center portrait:md:order-last">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#ffffff]/70 border border-blue-200/60 shadow-sm mb-6 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-brand-primary animate-pulse"></span>
              <span className="text-xs sm:text-sm font-medium text-brand-primary tracking-wide uppercase">Next-Gen Healthcare Ecosystem</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold mb-4 tracking-tight leading-tight pb-2">
              Intelligent care, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-700 via-blue-500 to-cyan-400 drop-shadow-sm py-1">
                seamlessly connected.
              </span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto md:mx-0 portrait:md:mx-auto font-light leading-relaxed">
              Vaididea unifies patients, top-rated doctors, hospitals, and smart ambulances into a single, lightning-fast digital network. Experience the future of urban healthcare.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start portrait:md:justify-center">
              <button onClick={() => openScanner("Patient")} className="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-full font-semibold text-lg transition-all shadow-[0_8px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.4)] transform hover:-translate-y-1 hover:scale-[1.02] w-full sm:w-auto border border-blue-400/20">
                Download Patient App
              </button>
              <Link href="/login" className="px-8 py-4 bg-[#ffffff]/80 hover:bg-[#ffffff] border border-white/60 text-[#0F172A] rounded-full font-semibold text-lg transition-all shadow-sm hover:shadow-md backdrop-blur-xl w-full sm:w-auto transform hover:-translate-y-1 hover:scale-[1.02]">
                Provider Login
              </Link>
            </div>
            
            <div className="mt-8 flex items-center justify-center md:justify-start portrait:md:justify-center gap-6 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                AI Meal Tracking
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-brand-primary" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                Auto-SOS Guardian
              </div>
            </div>
          </div>

          {/* Right Visual / Ecosystem Interactive Mockup */}
          <div className="relative hidden md:block h-[400px] xl:h-[500px] w-full scale-75 md:scale-[0.8] lg:scale-100 origin-center portrait:md:order-first portrait:mb-12">
            {/* Center Node (Vaididea Core) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 rounded-full shadow-[0_0_50px_rgba(37,99,235,0.5)] flex items-center justify-center z-20 hover:scale-110 transition-all duration-300 cursor-pointer border border-white/20">
              <span className="text-white font-bold text-xl tracking-tighter drop-shadow-md">vaididea</span>
            </div>

            {/* Orbit 1 (Inner) - 30s clockwise */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] xl:w-[300px] xl:h-[300px] rounded-full border border-blue-200 animate-[spin_30s_linear_infinite] pointer-events-none">
              {/* Patient App: 0 deg */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                <div className="animate-[spin_30s_linear_infinite_reverse]">
                  <button onClick={() => openScanner("Patient")} className="w-20 h-20 xl:w-24 xl:h-24 bg-gradient-to-br from-white/95 to-blue-50/90 backdrop-blur-xl rounded-2xl border border-white/60 p-2 xl:p-4 flex flex-col items-center justify-center shadow-2xl shadow-blue-900/5 hover:scale-110 hover:shadow-blue-900/15 transition-all duration-300 cursor-pointer">
                    <div className="text-2xl xl:text-3xl mb-1">📱</div>
                    <span className="text-[9px] xl:text-[10px] font-semibold text-[#0F172A] tracking-wide uppercase text-center leading-tight">Patient App</span>
                  </button>
                </div>
              </div>
              
              {/* Doctor: 120 deg */}
              <div className="absolute top-[75%] left-[93.3%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                <div className="animate-[spin_30s_linear_infinite_reverse]">
                  <Link href="/doctor" className="w-20 h-20 xl:w-24 xl:h-24 bg-gradient-to-br from-white/95 to-blue-50/90 backdrop-blur-xl rounded-2xl border border-white/60 p-2 xl:p-4 flex flex-col items-center justify-center shadow-2xl shadow-blue-900/5 hover:scale-110 hover:shadow-blue-900/15 transition-all duration-300 cursor-pointer">
                    <div className="text-2xl xl:text-3xl mb-1">👨‍⚕️</div>
                    <span className="text-[9px] xl:text-[10px] font-semibold text-[#0F172A] tracking-wide uppercase text-center leading-tight">Doctor</span>
                  </Link>
                </div>
              </div>

              {/* Clinic: 240 deg */}
              <div className="absolute top-[75%] left-[6.7%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                <div className="animate-[spin_30s_linear_infinite_reverse]">
                  <Link href="/clinic" className="w-20 h-20 xl:w-24 xl:h-24 bg-gradient-to-br from-white/95 to-blue-50/90 backdrop-blur-xl rounded-2xl border border-white/60 p-2 xl:p-4 flex flex-col items-center justify-center shadow-2xl shadow-blue-900/5 hover:scale-110 hover:shadow-blue-900/15 transition-all duration-300 cursor-pointer">
                    <div className="text-2xl xl:text-3xl mb-1">🏥</div>
                    <span className="text-[9px] xl:text-[10px] font-semibold text-[#0F172A] tracking-wide uppercase text-center leading-tight">Clinic</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Orbit 2 (Outer) - 45s counter-clockwise */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[380px] h-[380px] xl:w-[440px] xl:h-[440px] rounded-full border border-blue-200/50 animate-[spin_45s_linear_infinite_reverse] pointer-events-none">
              
              {/* Hospital: 0 deg */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                <div className="animate-[spin_45s_linear_infinite]">
                  <Link href="/hospital" className="w-20 h-20 xl:w-24 xl:h-24 bg-gradient-to-br from-white/95 to-blue-50/90 backdrop-blur-xl rounded-2xl border border-white/60 p-2 xl:p-4 flex flex-col items-center justify-center shadow-2xl shadow-blue-900/5 hover:scale-110 hover:shadow-blue-900/15 transition-all duration-300 cursor-pointer">
                    <div className="text-2xl xl:text-3xl mb-1">🏥</div>
                    <span className="text-[9px] xl:text-[10px] font-semibold text-[#0F172A] tracking-wide uppercase text-center leading-tight">Hospital</span>
                  </Link>
                </div>
              </div>

              {/* Pharmacy: 90 deg */}
              <div className="absolute top-1/2 left-[100%] -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                <div className="animate-[spin_45s_linear_infinite]">
                  <Link href="/pharmacy" className="w-20 h-20 xl:w-24 xl:h-24 bg-gradient-to-br from-white/95 to-blue-50/90 backdrop-blur-xl rounded-2xl border border-white/60 p-2 xl:p-4 flex flex-col items-center justify-center shadow-2xl shadow-blue-900/5 hover:scale-110 hover:shadow-blue-900/15 transition-all duration-300 cursor-pointer">
                    <div className="text-2xl xl:text-3xl mb-1">💊</div>
                    <span className="text-[9px] xl:text-[10px] font-semibold text-[#0F172A] tracking-wide uppercase text-center leading-tight">Pharmacy</span>
                  </Link>
                </div>
              </div>

              {/* Driver App: 180 deg */}
              <div className="absolute top-[100%] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                <div className="animate-[spin_45s_linear_infinite]">
                  <button onClick={() => openScanner("Driver")} className="w-20 h-20 xl:w-24 xl:h-24 bg-gradient-to-br from-white/95 to-blue-50/90 backdrop-blur-xl rounded-2xl border border-white/60 p-2 xl:p-4 flex flex-col items-center justify-center shadow-2xl shadow-blue-900/5 hover:scale-110 hover:shadow-blue-900/15 transition-all duration-300 cursor-pointer">
                    <div className="text-2xl xl:text-3xl mb-1">🚑</div>
                    <span className="text-[9px] xl:text-[10px] font-semibold text-[#0F172A] tracking-wide uppercase text-center leading-tight">Ambulance App</span>
                  </button>
                </div>
              </div>

              {/* Diagnostic: 270 deg */}
              <div className="absolute top-1/2 left-0 -translate-x-1/2 -translate-y-1/2 pointer-events-auto">
                <div className="animate-[spin_45s_linear_infinite]">
                  <Link href="/diagnostic-center" className="w-20 h-20 xl:w-24 xl:h-24 bg-gradient-to-br from-white/95 to-blue-50/90 backdrop-blur-xl rounded-2xl border border-white/60 p-2 xl:p-4 flex flex-col items-center justify-center shadow-2xl shadow-blue-900/5 hover:scale-110 hover:shadow-blue-900/15 transition-all duration-300 cursor-pointer">
                    <div className="text-2xl xl:text-3xl mb-1">🔬</div>
                    <span className="text-[9px] xl:text-[10px] font-semibold text-[#0F172A] tracking-wide uppercase text-center leading-tight">Diagnostic Center</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {scannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setScannerOpen(false)}>
          <div className="bg-[#ffffff] p-8 rounded-3xl max-w-sm w-full mx-4 shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-4 right-4 text-slate-400 hover:text-slate-700" onClick={() => setScannerOpen(false)}>
              ✕
            </button>
            <h3 className="text-xl font-bold text-center text-[#0F172A] mb-2">Download {scannerType || ''} App</h3>
            <p className="text-sm text-center text-slate-500 mb-6">Scan this QR code to download the app directly to your phone.</p>
            <div className="bg-blue-50 p-4 rounded-2xl flex justify-center mb-6 border border-blue-100">
              {/* External QR Code Generator API for demo */}
              <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://vaididea.com/download/${scannerType?.toLowerCase()}`} alt="QR Code" className="w-48 h-48 rounded-xl mix-blend-multiply" />
            </div>
            <button className="w-full py-3 bg-brand-primary text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors" onClick={() => setScannerOpen(false)}>
              Close Scanner
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
