import React from "react";

export default function DailyHealthAI() {
  return (
    <section className="py-24 bg-transparent relative overflow-hidden" id="ai-health">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-teal-50 text-teal-700 font-bold mb-6 border border-teal-100 shadow-sm animate-fade-in-up">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            Powered by Vaididea AI
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Smarter Daily Health
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto font-medium">
            From tracking your meals with AI to keeping a unified digital health card, Vaididea makes managing your health effortless and smart.
          </p>
        </div>

        {/* Clean 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1: Snap & Track Meal */}
          <div className="bg-gradient-to-br from-blue-50/80 via-white to-white rounded-3xl p-8 md:p-10 border border-blue-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(37,99,235,0.1)] hover:-translate-y-2 transition-all duration-300 text-center flex flex-col items-center group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/50 rounded-full blur-2xl transform group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
            <div className="w-20 h-20 bg-[#ffffff] text-blue-600 rounded-2xl flex items-center justify-center mb-8 shadow-sm border border-blue-50 relative z-10 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4 relative z-10">Snap & Track Meal</h3>
            <p className="text-slate-600 font-medium leading-relaxed relative z-10">
              Upload a picture of your meal. Our AI instantly analyzes the food and calculates the exact nutritional breakdown.
            </p>
          </div>

          {/* Card 2: Vaididea AI Assistant */}
          <div className="bg-gradient-to-br from-teal-50/80 via-white to-white rounded-3xl p-8 md:p-10 border border-teal-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(20,184,166,0.1)] hover:-translate-y-2 transition-all duration-300 text-center flex flex-col items-center group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-teal-100/50 rounded-full blur-2xl transform group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
            <div className="w-20 h-20 bg-[#ffffff] text-teal-600 rounded-2xl flex items-center justify-center mb-8 shadow-sm border border-teal-50 relative z-10 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4 relative z-10">Vaididea AI Assistant</h3>
            <p className="text-slate-600 font-medium leading-relaxed relative z-10">
              Got a health query? Ask the Vaididea Assistant anytime for instant guidance and intelligent symptom checking.
            </p>
          </div>

          {/* Card 3: Digital Health QR */}
          <div className="bg-gradient-to-br from-purple-50/80 via-white to-white rounded-3xl p-8 md:p-10 border border-purple-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgba(168,85,247,0.1)] hover:-translate-y-2 transition-all duration-300 text-center flex flex-col items-center group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-100/50 rounded-full blur-2xl transform group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
            <div className="w-20 h-20 bg-[#ffffff] text-purple-600 rounded-2xl flex items-center justify-center mb-8 shadow-sm border border-purple-50 relative z-10 group-hover:scale-110 transition-transform duration-300">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-900 mb-4 relative z-10">Digital Health QR</h3>
            <p className="text-slate-600 font-medium leading-relaxed relative z-10">
              One QR code for all your history. Doctors scan it to instantly access your past conditions, medicines, and test reports.
            </p>
          </div>
        </div>

        {/* Google Health Connect Banner (Clean Light Version) */}
        <div className="mt-12 bg-[#ffffff] rounded-3xl p-8 border border-slate-100 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 hover:shadow-2xl transition-all duration-300 relative overflow-hidden group">
          <div className="absolute -left-20 -bottom-20 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700"></div>
          
          <div className="flex items-center gap-6 relative z-10">
            <div className="w-16 h-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-full flex items-center justify-center font-bold text-slate-800 text-2xl border border-slate-200 shadow-sm shrink-0">
              G
            </div>
            <div>
              <h4 className="text-2xl font-bold text-slate-900 mb-1">Google Health Connect Integration</h4>
              <p className="text-slate-600 font-medium text-lg">Sync your smartwatch to track steps, active time, and kcal directly in Vaididea.</p>
            </div>
          </div>
          <button className="relative z-10 whitespace-nowrap px-8 py-3 bg-slate-900 text-white rounded-full font-bold hover:bg-brand-primary hover:shadow-lg transition-all duration-300">
            Connect Now
          </button>
        </div>

      </div>
    </section>
  );
}
