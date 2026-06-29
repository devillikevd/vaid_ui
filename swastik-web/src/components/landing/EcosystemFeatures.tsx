"use client";
import React, { useState } from "react";
import Link from "next/link";

const ecosystemFeatures = [
  {
    id: "patient",
    title: "Patient App",
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    bgLight: "bg-blue-50/70",
    bgDark: "bg-blue-500",
    borderLight: "border-blue-200",
    textDark: "text-blue-900",
    textColor: "text-blue-600",
    desc: "Your command center. Book location-based video & in-person consultations, order medicines, book labs, and access your Digital Health QR.",
    link: "/patient-app",
    linkText: "Explore App"
  },
  {
    id: "hospital",
    title: "Hospital & Clinic Portal",
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>,
    bgLight: "bg-teal-50/70",
    bgDark: "bg-teal-600",
    borderLight: "border-teal-200",
    textDark: "text-teal-900",
    textColor: "text-teal-600",
    desc: "Admins invite doctors, manage offline bookings, and receive live emergency alerts with ETA tracking for incoming ambulances.",
    link: "/login/hospital",
    linkText: "Provider Access"
  },
  {
    id: "doctor",
    title: "Doctor Dashboard",
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>,
    bgLight: "bg-indigo-50/70",
    bgDark: "bg-indigo-600",
    borderLight: "border-indigo-200",
    textDark: "text-indigo-900",
    textColor: "text-indigo-600",
    desc: "Doctors log in to set fees, view patient QR history, manage in-person clinic slots, and conduct secure, high-rated video consultations.",
    link: "/login/doctor",
    linkText: "Doctor Access"
  },
  {
    id: "driver",
    title: "Ambulance App",
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" /></svg>,
    bgLight: "bg-rose-50/70",
    bgDark: "bg-rose-500",
    borderLight: "border-rose-200",
    textDark: "text-rose-900",
    textColor: "text-rose-600",
    desc: "Drivers go online to receive SOS alerts within a 25km radius. Accept requests and stream live GPS to users and destination hospitals.",
    link: "/ambulance-app",
    linkText: "Driver Network"
  },
  {
    id: "pharmacy",
    title: "Pharmacy Portal",
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>,
    bgLight: "bg-orange-50/70",
    bgDark: "bg-orange-500",
    borderLight: "border-orange-200",
    textDark: "text-orange-900",
    textColor: "text-orange-600",
    desc: "Registered medical stores receive nearby prescription uploads. Accept orders instantly for fast delivery or customer pick-up.",
    link: "/login/pharmacy",
    linkText: "Register Store"
  },
  {
    id: "lab",
    title: "Diagnostic Lab Portal",
    icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>,
    bgLight: "bg-purple-50/70",
    bgDark: "bg-purple-600",
    borderLight: "border-purple-200",
    textDark: "text-purple-900",
    textColor: "text-purple-600",
    desc: "Receive test bookings, manage time slots, and upload digital reports directly to the patient's Vaididea account. (Home collection coming soon).",
    link: "/diagnostic-center",
    linkText: "Lab Access"
  }
];

export default function EcosystemFeatures() {
  const [activeTab, setActiveTab] = useState("patient");
  const activeFeature = ecosystemFeatures.find(f => f.id === activeTab) || ecosystemFeatures[0];

  return (
    <section className="py-20 bg-transparent relative overflow-hidden" id="ecosystem">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
            The Complete Healthcare Ecosystem
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Vaididea provides specialized portals for every pillar of healthcare, ensuring that data flows instantly from the patient to the provider.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap justify-center gap-3 mb-12 max-w-4xl mx-auto">
          {ecosystemFeatures.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setActiveTab(feature.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 border ${
                activeTab === feature.id
                  ? `${feature.bgDark} text-white shadow-md border-transparent scale-105`
                  : `bg-[#ffffff] text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300`
              }`}
            >
              <span className={activeTab === feature.id ? "text-white" : feature.textColor}>
                {feature.icon}
              </span>
              {feature.title}
            </button>
          ))}
        </div>

        {/* Active Tab Content Card */}
        <div className="max-w-4xl mx-auto transform transition-all duration-500 ease-in-out">
          <div className={`rounded-[2rem] ${activeFeature.bgLight} border ${activeFeature.borderLight} p-8 md:p-12 shadow-xl flex flex-col md:flex-row items-center gap-10`}>
            
            <div className={`w-28 h-28 shrink-0 rounded-[1.5rem] ${activeFeature.bgDark} text-white flex items-center justify-center shadow-lg rotate-3 hover:rotate-0 transition-transform duration-300`}>
               {React.cloneElement(activeFeature.icon, { className: "w-14 h-14" })}
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h3 className={`text-3xl md:text-4xl font-extrabold ${activeFeature.textDark} mb-4`}>
                {activeFeature.title}
              </h3>
              <p className="text-slate-700 text-lg md:text-xl mb-8 leading-relaxed font-medium">
                {activeFeature.desc}
              </p>
              <Link href={activeFeature.link} className={`inline-flex items-center gap-2 ${activeFeature.bgDark} text-white px-8 py-4 rounded-2xl font-bold hover:shadow-lg hover:-translate-y-1 transition-all duration-300`}>
                {activeFeature.linkText} <span className="text-xl">&rarr;</span>
              </Link>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
