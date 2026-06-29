import React from "react";

export default function GuardianEmergency() {
  return (
    <section className="py-20 bg-transparent relative overflow-hidden" id="guardian">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            Life-Saving Tech: <span className="text-red-500">Guardian & SOS</span>
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Not just a booking app. Vaididea is equipped with an Auto-SOS and a Smart Ambulance Dispatch system designed to save lives in critical moments.
          </p>
        </div>

        {/* Unified Sleek Light Container */}
        <div className="bg-[#ffffff] rounded-[2rem] border border-white shadow-xl relative overflow-hidden group transition-shadow hover:shadow-2xl">
          
          {/* Ambient Glows */}
          <div className="absolute top-[-20%] right-[-10%] w-[35rem] h-[35rem] bg-red-50/80 rounded-full blur-[80px] pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[35rem] h-[35rem] bg-teal-50/80 rounded-full blur-[80px] pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>

          <div className="flex flex-col lg:flex-row divide-y lg:divide-y-0 lg:divide-x divide-gray-100 relative z-10">
            
            {/* Feature 1: Guardian SOS */}
            <div className="flex-1 p-8 md:p-12 hover:bg-red-50/40 transition-colors duration-500">
              <div className="flex items-center justify-between mb-8">
                <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center shadow-sm border border-red-200">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <div className="flex items-center gap-2 text-red-700 font-semibold bg-red-50 px-4 py-2 rounded-full text-xs border border-red-200 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
                  Live Monitoring
                </div>
              </div>
              
              <h3 className="text-3xl font-extrabold text-slate-900 mb-4">Auto-SOS & Fall Detection</h3>
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                When Vaididea Guardian detects a severe fall or crash, a 30-second high-volume alert sounds. If unchecked, the system automatically dispatches the nearest Smart Ambulance—no 108 call needed.
              </p>
            </div>

            {/* Feature 2: Uber-like Ambulance */}
            <div className="flex-1 p-8 md:p-12 hover:bg-teal-50/40 transition-colors duration-500">
              <div className="flex items-center justify-between mb-8">
                <div className="w-16 h-16 bg-teal-100 text-teal-700 rounded-2xl flex items-center justify-center shadow-sm border border-teal-200">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>
                </div>
                <div className="flex items-center gap-2 text-teal-700 font-semibold bg-teal-50 px-4 py-2 rounded-full text-xs border border-teal-200 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse shadow-[0_0_8px_rgba(20,184,166,0.6)]"></span>
                  25km Dispatch Radius
                </div>
              </div>
              
              <h3 className="text-3xl font-extrabold text-slate-900 mb-4">Smart Ambulance Dispatch</h3>
              <p className="text-slate-600 text-lg leading-relaxed font-medium">
                Request an ambulance by category. Nearest active drivers are alerted instantly. Track the ambulance live, just like a cab. The destination hospital receives live ETA updates to prepare.
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
