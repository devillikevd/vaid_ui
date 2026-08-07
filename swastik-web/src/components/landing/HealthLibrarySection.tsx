"use client";

import React from "react";
import Link from "next/link";

export default function HealthLibrarySection() {
  return (
    <section className="py-24 bg-white relative overflow-hidden" id="health-library-section">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="animate-in fade-in slide-in-from-left-8 duration-1000 fill-mode-both">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-vd-cream border border-vd-forest/10 mb-8 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-vd-sage animate-pulse" />
              <span className="text-xs font-semibold tracking-[0.2em] uppercase text-vd-forest">Medical Intelligence</span>
            </div>
            
            <h2 className="font-heading text-4xl sm:text-5xl text-vd-forest mb-6 tracking-tight leading-[1.1]">
              The World&apos;s Most Comprehensive <br />
              <em className="text-vd-sage italic font-medium">Health Library</em>
            </h2>
            
            <p className="text-lg text-vd-muted mb-8 leading-relaxed font-light">
              Explore over 31,400+ medical conditions, symptoms, and treatments. Powered by intelligent ICD-10 categorization and real-time medical insights, our Health Library empowers you with the knowledge you need, exactly when you need it.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-10">
              <span className="px-4 py-2 rounded-full text-xs font-semibold tracking-wide bg-vd-forest/5 text-vd-forest border border-vd-forest/10">31k+ Diseases</span>
              <span className="px-4 py-2 rounded-full text-xs font-semibold tracking-wide bg-vd-forest/5 text-vd-forest border border-vd-forest/10">ICD-10 Indexed</span>
              <span className="px-4 py-2 rounded-full text-xs font-semibold tracking-wide bg-vd-forest/5 text-vd-forest border border-vd-forest/10">Smart Search</span>
            </div>
            
            <Link 
              href="/health-library"
              className="inline-flex items-center justify-center px-8 py-4 rounded-full bg-vd-forest text-white font-semibold tracking-wide hover:bg-vd-sage transition-all hover:shadow-lg hover:-translate-y-1"
            >
              Explore Health Library
              <svg className="w-5 h-5 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
          
          <div className="relative animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 fill-mode-both">
            {/* Background glowing orb */}
            <div className="absolute inset-0 bg-gradient-to-tr from-vd-sage/30 to-transparent rounded-[3rem] blur-3xl -z-10 transform scale-110" />
            
            {/* Main glass card */}
            <div className="apple-glass-card rounded-[3rem] p-8 sm:p-10 border border-white/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] relative overflow-hidden group">
               {/* Soft inner glow on hover */}
               <div className="absolute inset-0 bg-gradient-to-br from-vd-forest/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
               
               {/* Decorative floating elements */}
               <div className="absolute -top-10 -right-10 w-40 h-40 bg-vd-forest/5 rounded-full blur-2xl pointer-events-none" />
               <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-vd-sage/10 rounded-full blur-2xl pointer-events-none" />
               
               <div className="relative z-10 space-y-6">
                 {/* Mock Search Bar */}
                 <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3 border border-vd-forest/10 shadow-[0_2px_15px_rgba(0,0,0,0.03)] transition-transform duration-500 group-hover:-translate-y-1">
                   <svg className="w-5 h-5 text-vd-forest/50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                   <span className="text-sm font-medium text-slate-400">Search for Diabetes, E11, Hypertension...</span>
                 </div>
                 
                 {/* Mock Filter Chips */}
                 <div className="flex gap-2">
                   <div className="px-4 py-1.5 bg-vd-forest text-white rounded-full flex items-center justify-center text-[10px] font-bold tracking-wider shadow-sm">ALL CONDITIONS</div>
                   <div className="px-4 py-1.5 bg-red-50 text-red-700 border border-red-100 rounded-full flex items-center justify-center text-[10px] font-bold tracking-wider">CRITICAL</div>
                   <div className="px-4 py-1.5 bg-amber-50 text-amber-700 border border-amber-100 rounded-full flex items-center justify-center text-[10px] font-bold tracking-wider">SEVERE</div>
                 </div>
                 
                 {/* Mock Disease Cards */}
                 <div className="grid gap-3 mt-1">
                   {/* Card 1 */}
                   <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-vd-forest/10 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col gap-2 transition-transform duration-500 delay-75 group-hover:-translate-y-1">
                     <div className="flex justify-between items-start">
                       <div className="flex gap-2 items-center">
                         <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">E11</span>
                         <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Endocrine System</span>
                       </div>
                       <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700">SEVERE</span>
                     </div>
                     <h4 className="font-heading font-semibold text-slate-800 text-sm">Type 2 Diabetes Mellitus</h4>
                     <p className="text-[10px] text-slate-500 font-light truncate">Endocrine, nutritional and metabolic diseases</p>
                   </div>
                   
                   {/* Card 2 */}
                   <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-vd-forest/10 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col gap-2 transition-transform duration-500 delay-150 group-hover:-translate-y-1">
                     <div className="flex justify-between items-start">
                       <div className="flex gap-2 items-center">
                         <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">I10</span>
                         <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Circulatory System</span>
                       </div>
                       <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700">GENERAL</span>
                     </div>
                     <h4 className="font-heading font-semibold text-slate-800 text-sm">Essential (primary) hypertension</h4>
                     <p className="text-[10px] text-slate-500 font-light truncate">Diseases of the circulatory system</p>
                   </div>

                   {/* Card 3 */}
                   <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-vd-forest/10 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col gap-2 transition-transform duration-500 delay-200 group-hover:-translate-y-1">
                     <div className="flex justify-between items-start">
                       <div className="flex gap-2 items-center">
                         <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-600 rounded">A97</span>
                         <span className="text-[9px] font-bold text-slate-400 tracking-wider uppercase">Infectious Diseases</span>
                       </div>
                       <span className="text-[9px] font-bold px-2 py-0.5 rounded-full border border-red-200 bg-red-50 text-red-700">CRITICAL</span>
                     </div>
                     <h4 className="font-heading font-semibold text-slate-800 text-sm">Severe Dengue</h4>
                     <p className="text-[10px] text-slate-500 font-light truncate">Certain infectious and parasitic diseases</p>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
