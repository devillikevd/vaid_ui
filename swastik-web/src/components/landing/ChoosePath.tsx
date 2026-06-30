"use client";

import React, { useState } from "react";
import Link from "next/link";

export default function ChoosePath() {
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const providerRoles = [
    { id: 'hospital', label: 'Hospital', desc: 'Manage facility & beds', icon: '🏥', href: '/register/hospital' },
    { id: 'doctor', label: 'Doctor', desc: 'Consultations & schedule', icon: '👨‍⚕️', href: '/register/doctor' },
    { id: 'clinic', label: 'Clinic', desc: 'Multi-doctor management', icon: '⚕️', href: '/register/clinic' },
    { id: 'pharmacy', label: 'Pharmacy', desc: 'Prescriptions & inventory', icon: '💊', href: '/register/pharmacy' },
    { id: 'diagnostic', label: 'Diagnostics', desc: 'Tests & lab results', icon: '🔬', href: '/register/diagnostic-center' },
  ];

  return (
    <section className="py-24 bg-vd-cream relative overflow-hidden" id="ecosystem">
      {/* Siri Glowing Background for Depth */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-70">
        <div className="siri-orb-2 w-[40vw] h-[40vw] top-[20%] left-[-10%]" />
        <div className="siri-orb-3 w-[50vw] h-[50vw] bottom-[-20%] right-[-10%]" />
        {/* Subtle noise texture */}
        <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.65\' numOctaves=\'3\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
          <h2 className="font-heading text-4xl sm:text-5xl text-vd-forest mb-6 tracking-tight">
            Whether you seek care, or provide it—
            <br />
            <em className="text-vd-sage italic relative inline-block mt-2">
              Vaididea is crafted for you.
              <svg className="absolute w-full h-2 -bottom-1 left-0 text-vd-sage/30" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
              </svg>
            </em>
          </h2>
          <p className="text-lg text-vd-muted max-w-2xl mx-auto font-light leading-relaxed">
            Empowering patients with intuitive doctor bookings, instant emergency SOS, and AI-driven health assistance. 
            Seamlessly running in parallel with a state-of-the-art, unified operational hub for hospitals, clinics, pharmacies, and diagnostic centers.
          </p>
        </div>

        <div className="text-center mb-12 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
          <div className="inline-flex items-center justify-center gap-4">
            <div className="h-px w-8 bg-gradient-to-r from-transparent to-vd-forest/20" />
            <h3 className="font-heading text-2xl text-vd-forest tracking-wide">Choose Your Path</h3>
            <div className="h-px w-8 bg-gradient-to-l from-transparent to-vd-forest/20" />
          </div>
          <p className="text-sm text-vd-muted mt-3 uppercase tracking-[0.2em] font-semibold">Both journeys begin here. Select your role in the ecosystem.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Patient Card */}
          <div className="group apple-glass-card rounded-[2.5rem] p-10 sm:p-12 relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 fill-mode-both">
            {/* Soft inner glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-vd-sage/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative z-10 h-full flex flex-col">
              <div className="w-16 h-16 rounded-2xl bg-white/60 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] border border-white flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-8 h-8 text-vd-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
                </svg>
              </div>
              <h3 className="font-heading text-3xl text-vd-forest mb-4">I am a Patient</h3>
              <p className="text-vd-muted mb-10 leading-relaxed font-light">
                Find doctors, call an ambulance in emergencies, understand symptoms with AI, 
                and track your health seamlessly in one unified app.
              </p>
              
              <div className="flex flex-wrap gap-2 mb-12">
                <span className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-white/50 text-vd-forest border border-white shadow-sm">Doctor Booking</span>
                <span className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-white/50 text-vd-forest border border-white shadow-sm">Emergency SOS</span>
                <span className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-white/50 text-vd-forest border border-white shadow-sm">AI Assistant</span>
              </div>

              <div className="mt-auto">
                <button
                  onClick={() => {
                    if (typeof window !== 'undefined') {
                      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
                      if (isMobile) {
                        window.open("https://play.google.com/store/apps/details?id=com.vaididea.patient", "_blank");
                        return;
                      }
                    }
                    const el = document.getElementById('patient-app');
                    el?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center text-sm font-bold text-vd-forest group/link cursor-pointer bg-transparent border-0 p-0 hover:opacity-80 transition-opacity"
                >
                  Download App 
                  <svg className="w-4 h-4 ml-2 group-hover/link:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Provider Card */}
          <div className="group apple-glass-card rounded-[2.5rem] p-10 sm:p-12 relative overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-700 fill-mode-both">
            {/* Soft inner glow on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-vd-forest/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative z-10 h-full flex flex-col">
              <div className="w-16 h-16 rounded-2xl bg-white/60 shadow-[inset_0_2px_10px_rgba(0,0,0,0.02)] border border-white flex items-center justify-center mb-8 group-hover:scale-110 transition-transform duration-500">
                <svg className="w-8 h-8 text-vd-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
                </svg>
              </div>
              <h3 className="font-heading text-3xl text-vd-forest mb-4">I am a Provider</h3>
              <p className="text-vd-muted mb-10 leading-relaxed font-light">
                Run a Hospital, Clinic, Pharmacy, or Diagnostics Center? 
                Manage patients, appointments, and inventory from your dedicated operations dashboard.
              </p>
              
              <div className="flex flex-wrap gap-2 mb-12">
                {['Hospital', 'Doctor', 'Clinic', 'Pharmacy', 'Diagnostics'].map((role) => (
                  <span key={role} className="px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide bg-white/50 text-vd-forest border border-white shadow-sm">
                    {role}
                  </span>
                ))}
              </div>

              <div className="mt-auto flex items-center gap-6">
                <button onClick={() => setShowRegisterModal(true)} className="inline-flex items-center text-sm font-bold text-vd-forest group/link cursor-pointer bg-transparent border-0 p-0 hover:opacity-80 transition-opacity">
                  Register on Portal
                  <svg className="w-4 h-4 ml-2 group-hover/link:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </button>
                <Link href="/login" className="inline-flex items-center text-sm font-medium text-vd-muted hover:text-vd-forest group/link2 transition-colors">
                  Login
                  <svg className="w-3.5 h-3.5 ml-1.5 opacity-0 group-hover/link2:opacity-100 group-hover/link2:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Premium Provider Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
            onClick={() => setShowRegisterModal(false)}
          />
          <div className="relative bg-white/70 dark:bg-[#0A0A0A]/80 border border-white/40 dark:border-white/10 rounded-[2.5rem] backdrop-blur-2xl p-8 sm:p-12 max-w-5xl w-full shadow-[0_8px_40px_-12px_rgba(0,0,0,0.1)] dark:shadow-2xl animate-in fade-in zoom-in-95 duration-300">
            <button 
              onClick={() => setShowRegisterModal(false)}
              className="absolute top-6 right-6 p-2 bg-gray-500/5 hover:bg-gray-500/10 dark:bg-white/[0.05] dark:hover:bg-white/10 rounded-full text-gray-500 dark:text-white/50 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
            
            <div className="text-center mb-10">
               <h3 className="font-heading text-4xl text-vd-forest dark:text-white mb-3">Select Provider Role</h3>
               <p className="text-vd-muted dark:text-white/50 text-base max-w-md mx-auto">Choose your specific healthcare facility type to access the customized registration portal.</p>
            </div>

            <div className="flex flex-wrap justify-center gap-5">
              {providerRoles.map((role) => (
                <Link 
                  key={role.id} 
                  href={role.href}
                  className={`group relative p-6 sm:p-8 rounded-[1.5rem] border border-white/60 dark:border-white/10 bg-white/50 dark:bg-white/[0.02] hover:bg-white hover:border-gray-200 dark:hover:bg-white/[0.05] dark:hover:border-white/20 transition-all duration-300 flex flex-col items-center text-center w-[calc(50%-1.25rem)] sm:w-[calc(33.333%-1.25rem)] shadow-sm hover:shadow-xl hover:-translate-y-1.5`}
                >
                  <div className="absolute inset-0 bg-gradient-to-b from-white/40 to-transparent dark:from-white/5 opacity-0 group-hover:opacity-100 rounded-[1.5rem] transition-opacity duration-300 pointer-events-none" />
                  <div className="text-5xl mb-5 group-hover:scale-110 transition-transform duration-300 drop-shadow-sm">
                    {role.icon}
                  </div>
                  <h4 className="font-bold text-lg text-vd-forest dark:text-white mb-2">{role.label}</h4>
                  <p className="text-xs text-vd-muted dark:text-white/50 font-medium leading-relaxed">{role.desc}</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
