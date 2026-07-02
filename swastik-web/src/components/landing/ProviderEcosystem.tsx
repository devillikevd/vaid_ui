"use client";

import React, { useState } from "react";
import Link from "next/link";

interface PortalTab {
  id: string;
  icon: string;
  label: string;
  badge: string;
  heading: string;
  desc: string;
  features: string[];
  registerHref: string;
  registerLabel: string;
  loginHref: string;
  accentColor: string;
  dashboardTitle: string;
  sidebarItems: string[];
  stats: { label: string; value: string }[];
}

const tabs: PortalTab[] = [
  {
    id: "hospital",
    icon: "🏥",
    label: "Hospital",
    badge: "HOSPITAL OPERATIONS HUB",
    heading: "Entire hospital operations, unified in one console.",
    desc: "Experience unprecedented control. Manage doctors, departments, bed capacity, and patient appointments in real-time. Direct emergency ambulance dispatch integrated directly into your workflow.",
    features: [
      "Comprehensive doctor & department management",
      "Real-time emergency dispatch & routing center",
      "Live bed capacity & predictive appointment analytics",
    ],
    registerHref: "/register/hospital",
    registerLabel: "Register Hospital",
    loginHref: "/login?role=hospital",
    accentColor: "bg-teal-500",
    dashboardTitle: "Hospital Management Console",
    sidebarItems: ["Dashboard", "Departments", "Doctors", "Pharmacies", "Diagnostics", "Appointments", "Consultations", "Ambulances", "Emergency", "Managers"],
    stats: [
      { label: "Total Doctors", value: "2" },
      { label: "Departments", value: "3" },
      { label: "Today's Appointments", value: "0" },
      { label: "Bed Capacity", value: "100" },
    ],
  },
  {
    id: "doctor",
    icon: "👨‍⚕️",
    label: "Doctor",
    badge: "CLINICAL WORKSTATION",
    heading: "Your day, curated in your personal workspace.",
    desc: "A focused environment free from distractions. Set your schedule, join high-definition video consultations with a single click, and securely prescribe medication.",
    features: [
      "Daily schedule oversight with one-click video join",
      "Instant access to holistic patient records & visit history",
      "Engage patients through dedicated Community Q&A",
    ],
    registerHref: "/register/doctor",
    registerLabel: "Register as Doctor",
    loginHref: "/login?role=doctor",
    accentColor: "bg-emerald-500",
    dashboardTitle: "Doctor Clinical Workstation",
    sidebarItems: ["Dashboard", "Appointments", "Consultations", "Prescriptions", "Patients", "Invites", "Video", "Health Alerts", "Community Q&A", "Reviews", "Schedule"],
    stats: [
      { label: "Today's Appointments", value: "0" },
      { label: "Completed", value: "0" },
      { label: "Pending", value: "0" },
      { label: "Today's Earnings", value: "₹0" },
    ],
  },
  {
    id: "clinic",
    icon: "⚕️",
    label: "Clinic",
    badge: "SCHEDULING CENTER",
    heading: "Effortlessly manage your clinic's practitioners.",
    desc: "Streamline your clinic's administrative burden. Invite specialized doctors, oversee comprehensive appointment calendars, and establish seamless connections with local pharmacies.",
    features: [
      "Simplified doctor invites & dynamic roster management",
      "Centralized daily appointment and walk-in calendar",
      "Direct linkages to associated pharmacies & diagnostics",
    ],
    registerHref: "/register/clinic",
    registerLabel: "Register Clinic",
    loginHref: "/login?role=clinic",
    accentColor: "bg-pink-500",
    dashboardTitle: "Clinic Scheduling Center",
    sidebarItems: ["Dashboard", "Staff", "Pharmacies", "Diagnostics", "Appointments", "Consultations", "Schedule", "Health Alerts", "Reviews", "Settings"],
    stats: [
      { label: "Total Staff", value: "0" },
      { label: "Today's Appointments", value: "0" },
      { label: "Walk-ins Today", value: "0" },
      { label: "Repeat Patients", value: "0%" },
    ],
  },
  {
    id: "pharmacy",
    icon: "💊",
    label: "Pharmacy",
    badge: "FULFILLMENT CONSOLE",
    heading: "From prescription to seamless delivery.",
    desc: "Digital prescriptions arrive instantly from the physician's desk. Monitor your inventory in real-time, process incoming orders, and manage dispatch logistics without friction.",
    features: [
      "Real-time inventory tracking with automated alerts",
      "End-to-end order tracking from pending to delivered",
      "Seamless database migration with CSV import/export",
    ],
    registerHref: "/register/pharmacy",
    registerLabel: "Register Pharmacy",
    loginHref: "/login?role=pharmacy",
    accentColor: "bg-orange-500",
    dashboardTitle: "Pharmacy Fulfillment Console",
    sidebarItems: ["Dashboard", "Prescriptions", "Inventory", "Orders", "Associations", "Agents", "Reports", "Reviews", "Settings"],
    stats: [
      { label: "Pending Fulfillments", value: "0" },
      { label: "Pending Orders", value: "5" },
      { label: "Low Stock Items", value: "0" },
      { label: "Today's Revenue", value: "₹0" },
    ],
  },
  {
    id: "diagnostics",
    icon: "🔬",
    label: "Diagnostics",
    badge: "DIAGNOSTICS CENTER PORTAL",
    heading: "All laboratory tests, managed in one place.",
    desc: "Maintain total control over your diagnostic services. Configure your custom test catalog, oversee patient bookings, and securely upload results directly to the patient's app.",
    features: [
      "Customizable test catalog with dynamic pricing control",
      "Complete tracking of the booking lifecycle",
      "Secure, direct diagnostic result uploads",
    ],
    registerHref: "/register/diagnostic-center",
    registerLabel: "Register Lab",
    loginHref: "/login?role=diagnostic-center",
    accentColor: "bg-purple-500",
    dashboardTitle: "Diagnostic Center Dashboard",
    sidebarItems: ["Dashboard", "Test Catalog", "Bookings", "Results", "Associations", "Agents", "Reports", "Reviews", "Settings"],
    stats: [
      { label: "Total Tests", value: "1" },
      { label: "Today's Bookings", value: "3" },
      { label: "Pending Results", value: "17" },
      { label: "Total Patients", value: "2" },
    ],
  },
];

function GlassyImageFrame({ tab }: { tab: PortalTab }) {
  return (
    <div className="rounded-2xl relative p-3 max-w-[600px] w-full group">
      {/* Premium Glassmorphic Outer Frame */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] transition-all duration-500 group-hover:bg-white/10" />
      
      {/* Decorative Glows */}
      <div className={`absolute -top-10 -left-10 w-40 h-40 ${tab.accentColor} opacity-20 blur-[60px] rounded-full pointer-events-none transition-all duration-500 group-hover:opacity-40 group-hover:scale-110`} />
      <div className={`absolute -bottom-10 -right-10 w-40 h-40 ${tab.accentColor} opacity-20 blur-[60px] rounded-full pointer-events-none transition-all duration-500 group-hover:opacity-40 group-hover:scale-110`} />

      <div className="relative rounded-xl overflow-hidden bg-black/40 border border-white/5 ring-1 ring-black/50 shadow-inner">
        {/* Window Chrome (Apple style) */}
        <div className="bg-[#1A1A1A]/80 backdrop-blur-md px-4 py-3 flex items-center justify-between border-b border-white/5">
          <div className="flex gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF5F56] border border-[#E0443E]" />
            <div className="w-3 h-3 rounded-full bg-[#FFBD2E] border border-[#DEA123]" />
            <div className="w-3 h-3 rounded-full bg-[#27C93F] border border-[#1AAB29]" />
          </div>
          <div className="text-white/40 text-[10px] font-medium tracking-wider flex items-center gap-2">
            <span>{tab.icon}</span>
            {tab.badge}
          </div>
        </div>

        {/* The Real Image */}
        <div className="relative aspect-[16/10] bg-[#0A0A0A] overflow-hidden">
          {/* Dynamic CSS UI Mockup based on actual portal designs */}
          <div className="absolute inset-0 bg-[#0A0A0A] overflow-hidden flex flex-col font-sans">
            {/* Header / Banner */}
            <div className={`p-4 ${
              tab.id === 'hospital' ? 'bg-gradient-to-r from-teal-600 to-teal-800' :
              tab.id === 'doctor' ? 'bg-gradient-to-r from-emerald-600 to-emerald-800' :
              tab.id === 'clinic' ? 'bg-gradient-to-r from-pink-600 to-pink-800' :
              tab.id === 'pharmacy' ? 'bg-gradient-to-r from-orange-600 to-orange-800' :
              'bg-gradient-to-r from-purple-600 to-purple-800'
            }`}>
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-white font-bold text-sm">{tab.dashboardTitle}</h3>
                  <p className="text-white/70 text-[9px] mt-0.5">Welcome back! Here&apos;s your overview.</p>
                </div>
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px]">
                  👤
                </div>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-3 bg-gray-50 flex gap-3">
              {/* Sidebar */}
              <div className="w-[100px] bg-white rounded-lg border border-gray-100 shadow-sm p-2 hidden sm:block">
                <div className="space-y-1">
                  {tab.sidebarItems.map((item, i) => (
                    <div key={item} className={`px-2 py-1.5 rounded text-[8px] font-medium ${i === 0 ? `bg-${tab.id === 'hospital' ? 'teal' : tab.id === 'doctor' ? 'emerald' : tab.id === 'clinic' ? 'pink' : tab.id === 'pharmacy' ? 'orange' : 'purple'}-50 text-${tab.id === 'hospital' ? 'teal' : tab.id === 'doctor' ? 'emerald' : tab.id === 'clinic' ? 'pink' : tab.id === 'pharmacy' ? 'orange' : 'purple'}-600` : 'text-gray-500'}`}>
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              {/* Dashboard Grid */}
              <div className="flex-1 flex flex-col gap-3">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-2">
                  {tab.stats.slice(0, 4).map((stat) => (
                    <div key={stat.label} className="bg-white rounded-lg p-2 border border-gray-100 shadow-sm flex items-center justify-between">
                      <div>
                        <p className="text-gray-500 text-[8px]">{stat.label}</p>
                        <p className="text-gray-900 font-bold text-xs mt-0.5">{stat.value}</p>
                      </div>
                      <div className={`w-5 h-5 rounded ${
                        tab.id === 'hospital' ? 'bg-teal-50 text-teal-600' :
                        tab.id === 'doctor' ? 'bg-emerald-50 text-emerald-600' :
                        tab.id === 'clinic' ? 'bg-pink-50 text-pink-600' :
                        tab.id === 'pharmacy' ? 'bg-orange-50 text-orange-600' :
                        'bg-purple-50 text-purple-600'
                      } flex items-center justify-center text-[10px]`}>
                        {stat.label.includes('Appoint') || stat.label.includes('Booking') ? '📅' :
                         stat.label.includes('Revenue') ? '₹' :
                         stat.label.includes('Doctor') || stat.label.includes('Staff') || stat.label.includes('Patient') ? '👥' :
                         '📊'}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Main Panel */}
                <div className="bg-white rounded-lg border border-gray-100 shadow-sm flex-1 p-2.5 flex flex-col">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-gray-800 font-bold text-[10px]">
                      {tab.id === 'pharmacy' ? 'Pending Prescriptions' : 
                       tab.id === 'diagnostic' ? 'Today\'s Bookings' : 
                       'Recent Appointments'}
                    </p>
                    <span className={`text-[8px] ${
                      tab.id === 'hospital' ? 'text-teal-600' :
                      tab.id === 'doctor' ? 'text-emerald-600' :
                      tab.id === 'clinic' ? 'text-pink-600' :
                      tab.id === 'pharmacy' ? 'text-orange-600' :
                      'text-purple-600'
                    }`}>View all</span>
                  </div>
                  
                  <div className="space-y-1.5 flex-1 overflow-hidden">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-md border border-gray-50 bg-gray-50/50">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-gray-200 flex items-center justify-center text-[8px]">
                            {tab.id === 'pharmacy' ? 'Rx' : '👤'}
                          </div>
                          <div>
                            <p className="text-gray-900 font-medium text-[9px]">
                              {tab.id === 'pharmacy' ? `Order #${1024 + i}` : `Patient Name ${i}`}
                            </p>
                            <p className="text-gray-500 text-[7px]">
                              {tab.id === 'pharmacy' ? '3 items pending' : '10:00 AM • Video Consult'}
                            </p>
                          </div>
                        </div>
                        <span className={`px-1.5 py-0.5 rounded text-[7px] font-medium ${
                          i === 1 ? 'bg-amber-100 text-amber-700' : 
                          i === 2 ? 'bg-blue-100 text-blue-700' : 
                          'bg-green-100 text-green-700'
                        }`}>
                          {i === 1 ? 'Pending' : i === 2 ? 'In Progress' : 'Completed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Suble glass overlay for extra premium feel */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        </div>
      </div>
    </div>
  );
}

export default function ProviderEcosystem() {
  const [activeTab, setActiveTab] = useState("hospital");
  const active = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <section className="py-24 sm:py-32 bg-[#0A0A0A] text-white relative overflow-hidden" id="providers">
      {/* Siri Glowing Background for Depth in Dark Mode */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-40 mix-blend-screen">
        <div className="siri-orb-2 w-[50vw] h-[50vw] top-[-10%] right-[-20%]" />
        <div className="siri-orb-3 w-[60vw] h-[60vw] bottom-[-20%] left-[-10%]" />
      </div>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 fill-mode-both">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-vd-sage animate-pulse" />
            <span className="text-[10px] sm:text-xs font-bold tracking-[0.2em] uppercase text-white/90">Unified Architecture</span>
          </div>
          <h2 className="font-heading text-4xl sm:text-5xl md:text-6xl text-white mb-6 leading-tight tracking-tight">
            The Provider Ecosystem
          </h2>
          <p className="text-white/60 max-w-2xl mx-auto text-lg sm:text-xl font-light leading-relaxed tracking-wide">
            A seamlessly integrated suite of operational hubs designed for every pillar of modern healthcare delivery.
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center mb-16 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300 fill-mode-both">
          <div className="inline-flex flex-wrap justify-center gap-2 bg-white/5 backdrop-blur-xl rounded-[2rem] p-2 border border-white/10 shadow-[0_8px_30px_rgba(0,0,0,0.2)]">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-400 ${
                  activeTab === tab.id
                    ? 'bg-white text-black shadow-lg scale-105'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <span className={activeTab === tab.id ? 'scale-110 transition-transform' : ''}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Dashboard Mockup */}
          <div className="flex justify-center lg:justify-start order-2 lg:order-1 animate-in fade-in zoom-in-95 duration-1000 delay-500 fill-mode-both">
            <GlassyImageFrame tab={active} />
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2 animate-in fade-in slide-in-from-right-8 duration-1000 delay-700 fill-mode-both">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md mb-6">
              <span className="text-[10px] font-bold tracking-widest uppercase text-vd-sage">{active.badge}</span>
            </div>

            <h3 className="font-heading text-3xl sm:text-4xl lg:text-5xl text-white mb-6 leading-[1.1] tracking-tight">
              {active.heading}
            </h3>

            <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-lg font-light">
              {active.desc}
            </p>

            <ul className="space-y-4 mb-12">
              {active.features.map(f => (
                <li key={f} className="flex items-start gap-4 group">
                  <div className="w-6 h-6 rounded-full bg-vd-sage/10 flex items-center justify-center shrink-0 group-hover:bg-vd-sage/30 transition-colors duration-300">
                    <svg className="w-3.5 h-3.5 text-vd-sage shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white/80 text-sm font-medium leading-relaxed">{f}</span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-4 flex-wrap">
              <Link
                href={active.registerHref}
                className="group relative px-8 py-4 bg-white text-black rounded-full text-sm font-bold tracking-wide hover:bg-gray-100 transition-all duration-400 shadow-[0_8px_30px_rgba(255,255,255,0.15)] hover:shadow-[0_15px_40px_rgba(255,255,255,0.25)] hover:-translate-y-1 flex items-center gap-2 overflow-hidden"
              >
                <span className="relative z-10">{active.registerLabel}</span>
                <svg className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href={active.loginHref}
                className="group px-8 py-4 border border-white/20 bg-white/5 backdrop-blur-md text-white rounded-full text-sm font-semibold tracking-wide hover:bg-white/10 hover:border-white/40 transition-all duration-400 flex items-center gap-2"
              >
                Login
                <svg className="w-3.5 h-3.5 opacity-0 -ml-2 group-hover:opacity-100 group-hover:ml-0 transition-all duration-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
