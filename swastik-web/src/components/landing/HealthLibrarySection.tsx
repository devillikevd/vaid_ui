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
              The World's Most Comprehensive <br />
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
                 <div className="bg-white/80 backdrop-blur-md rounded-2xl p-4 flex items-center gap-3 border border-white/50 shadow-sm transition-transform duration-500 group-hover:-translate-y-1">
                   <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                   <div className="h-4 bg-gray-200/50 rounded w-1/3" />
                 </div>
                 
                 {/* Mock Filter Chips */}
                 <div className="flex gap-2">
                   <div className="h-8 w-24 bg-vd-forest text-white rounded-full flex items-center justify-center text-[10px] font-bold tracking-wider opacity-90 shadow-sm">CRITICAL</div>
                   <div className="h-8 w-32 bg-gray-100 rounded-full flex items-center justify-center text-[10px] font-bold tracking-wider text-gray-500">SEVERE</div>
                   <div className="h-8 w-20 bg-gray-100 rounded-full" />
                 </div>
                 
                 {/* Mock Disease Cards */}
                 <div className="grid gap-4 mt-2">
                   <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/50 shadow-sm flex gap-4 items-center transition-transform duration-500 delay-75 group-hover:-translate-y-1">
                     <div className="w-12 h-12 rounded-xl bg-red-50 flex items-center justify-center shrink-0 border border-red-100">
                       <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
                     </div>
                     <div className="space-y-2 flex-1">
                       <div className="h-4 bg-gray-300 rounded w-1/2" />
                       <div className="h-3 bg-gray-200 rounded w-3/4" />
                     </div>
                   </div>
                   
                   <div className="bg-white/80 backdrop-blur-md p-5 rounded-2xl border border-white/50 shadow-sm flex gap-4 items-center opacity-70 transition-transform duration-500 delay-150 group-hover:-translate-y-1">
                     <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 border border-amber-100">
                       <span className="w-3 h-3 rounded-full bg-amber-500" />
                     </div>
                     <div className="space-y-2 flex-1">
                       <div className="h-4 bg-gray-300 rounded w-2/3" />
                       <div className="h-3 bg-gray-200 rounded w-1/2" />
                     </div>
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
