"use client";

import React, { useState } from "react";
import Link from "next/link";

interface WorkspaceModule {
  title: string;
  desc: string;
  tag: string;
}

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
  dashboardTitle: string;
  portalRoute: string;
  sidebarItems: string[];
  modules: WorkspaceModule[];
  workflowTags: string[];
}

const tabs: PortalTab[] = [
  {
    id: "hospital",
    icon: "🏥",
    label: "Hospital",
    badge: "HOSPITAL OPERATIONS SUITE",
    heading: "Complete hospital operations, unified in one workspace.",
    desc: "Coordinate doctors, clinical departments, bed occupancy, outpatient appointments, and emergency fleet dispatch through a centralized healthcare console.",
    features: [
      "Department directory and practitioner roster administration",
      "Inpatient ward bed tracking and admission management",
      "Emergency ambulance dispatch and triage coordination",
    ],
    registerHref: "/register/hospital",
    registerLabel: "Register Hospital",
    loginHref: "/login/hospital",
    dashboardTitle: "Hospital Management Console",
    portalRoute: "/hospital",
    sidebarItems: [
      "Departments",
      "Doctors",
      "Appointments",
      "Beds & IPD",
      "Ambulances",
      "Emergency",
      "Inhouse Pharmacy",
      "Lab Orders",
    ],
    modules: [
      {
        title: "Medical Staff & Rosters",
        desc: "Manage doctor profiles, departmental affiliations, and daily clinical shift schedules.",
        tag: "Staff Administration",
      },
      {
        title: "Inpatient Bed Management",
        desc: "Track ward occupancy, bed allocation, and admission status across departments.",
        tag: "IPD Capacity",
      },
      {
        title: "Emergency & Ambulance Fleet",
        desc: "Receive incoming SOS alerts, dispatch ambulances, and prepare emergency triage teams.",
        tag: "Emergency Triage",
      },
      {
        title: "Integrated Diagnostics & Pharmacy",
        desc: "Directly route lab orders and prescription fulfillments to in-house pharmacy and diagnostic units.",
        tag: "In-House Fulfillment",
      },
    ],
    workflowTags: ["OPD / IPD Care", "Bed Allocation", "Ambulance Dispatch", "Department Rosters"],
  },
  {
    id: "doctor",
    icon: "👨‍⚕️",
    label: "Doctor",
    badge: "CLINICAL WORKSTATION",
    heading: "Your clinical practice. One focused workspace.",
    desc: "A dedicated digital workspace for managing appointment slots, conducting secure video consultations, authoring digital prescriptions, and reviewing verified patient histories.",
    features: [
      "Daily appointment schedule with direct video consultation launch",
      "Patient health records, longitudinal vitals, and diagnostic histories",
      "Digital prescription authoring with instant pharmacy routing",
    ],
    registerHref: "/register/doctor",
    registerLabel: "Register as Doctor",
    loginHref: "/login/doctor",
    dashboardTitle: "Doctor Clinical Workstation",
    portalRoute: "/doctor",
    sidebarItems: [
      "Appointments",
      "Consultations",
      "Prescriptions",
      "Patients",
      "Schedule",
      "Care Networks",
      "Health Alerts",
      "Earnings",
    ],
    modules: [
      {
        title: "Appointment Queue & Schedule",
        desc: "View scheduled in-person and tele-consultation slots with patient intake summaries.",
        tag: "Queue Management",
      },
      {
        title: "Telemedicine Video Suite",
        desc: "Launch encrypted video consultations with integrated in-call clinical notes.",
        tag: "Clinical Telehealth",
      },
      {
        title: "Digital Prescription Builder",
        desc: "Author structured prescriptions with standardized dosage schedules and pharmacy dispatch.",
        tag: "Structured Rx",
      },
      {
        title: "Care Networks & Affiliations",
        desc: "Connect your clinical profile with partner hospitals and clinics for patient referrals.",
        tag: "Provider Network",
      },
    ],
    workflowTags: ["Telemedicine", "Digital Prescriptions", "Patient History", "Hospital Affiliation"],
  },
  {
    id: "clinic",
    icon: "⚕️",
    label: "Clinic",
    badge: "CLINIC OPERATIONS CENTER",
    heading: "Effortlessly manage practitioners, queues, and appointments.",
    desc: "Streamline multi-practitioner schedules, coordinate walk-in patient queues, and establish partner linkages with local pharmacies and diagnostic centers.",
    features: [
      "Multi-practitioner onboarding and shift roster coordination",
      "Centralized walk-in and online appointment intake queue",
      "Direct integration with associated neighborhood pharmacies and labs",
    ],
    registerHref: "/register/clinic",
    registerLabel: "Register Clinic",
    loginHref: "/login/clinic",
    dashboardTitle: "Clinic Operations Center",
    portalRoute: "/clinic",
    sidebarItems: [
      "Staff & Doctors",
      "Appointments",
      "Consultations",
      "Departments",
      "Schedule",
      "Pharmacies",
      "Diagnostic Centers",
      "Reports",
    ],
    modules: [
      {
        title: "Practitioner Scheduling",
        desc: "Coordinate doctor availability, consultation hours, and department coverage.",
        tag: "Roster Management",
      },
      {
        title: "Patient Intake & Queue",
        desc: "Manage walk-in and booked patient queues for smooth outpatient clinic flow.",
        tag: "Intake Coordination",
      },
      {
        title: "Diagnostic & Pharmacy Links",
        desc: "Establish direct referral partnerships with local labs and pharmacies for patient care.",
        tag: "Partner Network",
      },
      {
        title: "Specialty Departments",
        desc: "Organize clinic services by medical specialty and practitioner assignments.",
        tag: "Department Setup",
      },
    ],
    workflowTags: ["Multi-Doctor Rosters", "Walk-In Queues", "Pharmacy Links", "Diagnostic Referrals"],
  },
  {
    id: "pharmacy",
    icon: "💊",
    label: "Pharmacy",
    badge: "FULFILLMENT CONSOLE",
    heading: "Prescription intake, inventory, and order fulfillment.",
    desc: "Receive digital prescriptions directly from physician desks, manage pharmaceutical inventory batches and reorder thresholds, and process delivery orders.",
    features: [
      "Direct digital prescription intake from registered doctors and clinics",
      "Batch-level inventory tracking, stock levels, and low-stock indicators",
      "Prescription order processing, POS billing, and fulfillment tracking",
    ],
    registerHref: "/register/pharmacy",
    registerLabel: "Register Pharmacy",
    loginHref: "/login/pharmacy",
    dashboardTitle: "Pharmacy Fulfillment Console",
    portalRoute: "/pharmacy",
    sidebarItems: [
      "Prescriptions",
      "Inventory",
      "Orders",
      "POS Billing",
      "Associations",
      "Agents",
      "Campaigns",
      "Reports",
    ],
    modules: [
      {
        title: "Prescription Intake Queue",
        desc: "Review incoming electronic prescriptions authored by network doctors.",
        tag: "Rx Processing",
      },
      {
        title: "Inventory & Batch Management",
        desc: "Track medicine stock levels, batch numbers, expiry dates, and automated reorder alerts.",
        tag: "Stock Control",
      },
      {
        title: "POS Billing & Dispensation",
        desc: "Generate bills, verify prescriptions, and record medicine dispensation at the counter.",
        tag: "Counter POS",
      },
      {
        title: "Delivery Agent Logistics",
        desc: "Assign local fulfillment orders to delivery agents for doorstep patient dispatch.",
        tag: "Order Dispatch",
      },
    ],
    workflowTags: ["Digital Rx Intake", "Batch Inventory", "Counter POS", "Delivery Logistics"],
  },
  {
    id: "diagnostics",
    icon: "🔬",
    label: "Diagnostics",
    badge: "DIAGNOSTIC CENTER PORTAL",
    heading: "From test catalog to verified digital lab reports.",
    desc: "Configure test catalogs with customized pricing, coordinate phlebotomy and walk-in sample collections, and securely publish digital lab reports to patient Health IDs.",
    features: [
      "Custom test catalog, package builder, and dynamic pricing management",
      "Patient booking lifecycle, appointment slots, and work queue tracking",
      "Direct digital report delivery to patient Health ID vaults",
    ],
    registerHref: "/register/diagnostic-center",
    registerLabel: "Register Diagnostic Lab",
    loginHref: "/login/diagnostic-center",
    dashboardTitle: "Diagnostic Center Workspace",
    portalRoute: "/diagnostic-center",
    sidebarItems: [
      "Test Catalog",
      "Bookings",
      "Work Queue",
      "Results & Reports",
      "Associations",
      "Agents",
      "Revenue",
      "Settings",
    ],
    modules: [
      {
        title: "Test & Package Catalog",
        desc: "Configure pathology and radiology test listings, preparation instructions, and pricing.",
        tag: "Catalog Builder",
      },
      {
        title: "Sample Collection Queue",
        desc: "Track scheduled home sample collection and walk-in phlebotomy appointments.",
        tag: "Phlebotomy Queue",
      },
      {
        title: "Report Generation & Signing",
        desc: "Upload lab findings, verify test parameters, and securely deliver digital reports.",
        tag: "Report Publishing",
      },
      {
        title: "Doctor & Hospital Associations",
        desc: "Receive test referral requests from affiliated clinics and hospitals across the network.",
        tag: "Referral Network",
      },
    ],
    workflowTags: ["Test Catalog", "Phlebotomy Bookings", "Digital Lab Reports", "Clinic Referrals"],
  },
  {
    id: "wellness",
    icon: "🏋️",
    label: "Wellness",
    badge: "COACHING WORKSPACE",
    heading: "Manage clients, nutrition regimes, and wellness sessions.",
    desc: "A dedicated workstation for nutritionists, yoga instructors, fitness coaches, and mobility specialists offering personalized 1-on-1 programs and community sessions.",
    features: [
      "Custom workout and personalized nutrition plan builder",
      "Direct video coaching sessions and scheduled client check-ins",
      "Client goal tracking, session logs, and wellness reviews",
    ],
    registerHref: "/register/wellness",
    registerLabel: "Register as Coach",
    loginHref: "/login/wellness",
    dashboardTitle: "Wellness Coaching Workspace",
    portalRoute: "/wellness",
    sidebarItems: [
      "Clients",
      "Sessions",
      "Plans & Nutrition",
      "Consultations",
      "Marketplace",
      "Schedule",
      "Reviews",
      "Settings",
    ],
    modules: [
      {
        title: "Nutrition & Routine Plans",
        desc: "Design structured diet regimens, daily meal plans, and personalized wellness routines.",
        tag: "Plan Authoring",
      },
      {
        title: "1-on-1 Coaching Sessions",
        desc: "Schedule and host direct virtual guidance sessions with attached progress notes.",
        tag: "Virtual Coaching",
      },
      {
        title: "Client Engagement & Logs",
        desc: "Monitor client milestone progress, dietary check-ins, and session attendance.",
        tag: "Client Progress",
      },
      {
        title: "Wellness Marketplace",
        desc: "Offer coaching packages, consultation plans, and subscription services to patients.",
        tag: "Service Offerings",
      },
    ],
    workflowTags: ["Nutrition Regimes", "1-on-1 Coaching", "Client Progress Logs", "Wellness Plans"],
  },
  {
    id: "fitness-center",
    icon: "🏢",
    label: "Gym & Studio",
    badge: "FITNESS FACILITY CONSOLE",
    heading: "Run fitness centers, trainer rosters, and member passes.",
    desc: "Manage fitness centers, studio amenities, equipment catalogs, trainer rosters, group class schedules, and contactless day-pass check-ins.",
    features: [
      "Trainer onboarding, invites, and specialization roster management",
      "Day passes, trial class offerings, and schedule coordination",
      "Facility profiles showcasing amenities, equipment, and operating hours",
    ],
    registerHref: "/register/fitness-center",
    registerLabel: "Register Gym / Studio",
    loginHref: "/login/fitness-center",
    dashboardTitle: "Fitness Facility Workspace",
    portalRoute: "/fitness-center",
    sidebarItems: [
      "Facility Profile",
      "Trainer Roster",
      "Day Passes",
      "Classes & Schedule",
      "Amenities",
      "Equipment",
      "Reviews",
      "Settings",
    ],
    modules: [
      {
        title: "Trainer Roster & Invites",
        desc: "Invite accredited coaches and manage attached trainers across specialties.",
        tag: "Trainer Directory",
      },
      {
        title: "Passes & Class Pricing",
        desc: "Configure day pass rates, trial class access, and group session schedules.",
        tag: "Pass Management",
      },
      {
        title: "Facility & Equipment Profile",
        desc: "Showcase gym amenities, specialized machinery, and hygiene standards to members.",
        tag: "Facility Directory",
      },
      {
        title: "Community & Member Reviews",
        desc: "Engage with local fitness enthusiasts and manage verified client feedback.",
        tag: "Member Reviews",
      },
    ],
    workflowTags: ["Trainer Directory", "Day Passes", "Equipment Catalog", "Class Schedules"],
  },
];

function LightWorkspaceFrame({ tab }: { tab: PortalTab }) {
  return (
    <div className="rounded-3xl relative p-1.5 sm:p-2.5 max-w-[580px] w-full group">
      {/* Outer Card Container */}
      <div className="relative rounded-2xl overflow-hidden bg-white border border-stone-200/90 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.06)]">
        {/* Window Header Bar */}
        <div className="bg-stone-50/90 px-3.5 py-2.5 flex items-center justify-between border-b border-stone-200/80">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-stone-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-stone-300" />
              <div className="w-2.5 h-2.5 rounded-full bg-stone-300" />
            </div>
            <span className="text-[10px] font-mono text-stone-400 pl-1 hidden sm:inline">
              vaididea.com{tab.portalRoute}
            </span>
          </div>
          <div className="text-vd-forest text-[10px] font-semibold tracking-wider flex items-center gap-1.5 uppercase bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
            <span>{tab.icon}</span>
            <span>{tab.badge}</span>
          </div>
        </div>

        {/* Console Workspace Surface */}
        <div className="bg-white overflow-hidden flex flex-col font-sans text-left">
          {/* Header Banner */}
          <div className="px-4 py-3 bg-vd-forest text-white flex justify-between items-center border-b border-vd-forest-deep">
            <div>
              <h4 className="font-bold text-xs sm:text-sm text-white">{tab.dashboardTitle}</h4>
              <p className="text-emerald-100/80 text-[9px] sm:text-[10px] mt-0.5 font-light">
                Dedicated operational software layer for {tab.label.toLowerCase()} providers
              </p>
            </div>
            <div className="px-2.5 py-1 bg-white/15 rounded-full text-[9px] font-semibold text-emerald-100 border border-white/20 shrink-0">
              Workspace Preview
            </div>
          </div>

          {/* Body */}
          <div className="p-3 sm:p-3.5 bg-stone-50/50 flex gap-2.5 sm:gap-3">
            {/* Sidebar Navigation */}
            <div className="w-[105px] sm:w-[120px] bg-white rounded-xl border border-stone-200/80 p-2 hidden sm:block shadow-xs shrink-0">
              <p className="text-[8px] uppercase tracking-wider text-stone-400 font-bold px-1.5 mb-1.5">
                Navigation
              </p>
              <div className="space-y-1">
                {tab.sidebarItems.slice(0, 7).map((item, i) => (
                  <div
                    key={item}
                    className={`px-2 py-1 rounded-md text-[9px] font-medium transition-colors ${
                      i === 0
                        ? "bg-emerald-50 text-vd-forest font-bold border border-emerald-200/70"
                        : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Capability Modules Grid */}
            <div className="flex-1 flex flex-col gap-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {tab.modules.map((mod) => (
                  <div
                    key={mod.title}
                    className="bg-white rounded-xl p-2.5 border border-stone-200/80 shadow-xs flex flex-col justify-between hover:border-emerald-200 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <h5 className="text-[10px] font-bold text-stone-900 leading-tight">
                          {mod.title}
                        </h5>
                        <span className="text-[8px] font-semibold text-vd-forest bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 shrink-0">
                          {mod.tag}
                        </span>
                      </div>
                      <p className="text-stone-500 text-[8.5px] font-normal leading-relaxed">
                        {mod.desc}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Connected Workflows Bar */}
              <div className="bg-white rounded-xl border border-stone-200/80 p-2 shadow-xs">
                <p className="text-[8px] uppercase tracking-wider text-stone-400 font-bold mb-1">
                  Connected Workflow Capabilities
                </p>
                <div className="flex flex-wrap gap-1">
                  {tab.workflowTags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 bg-stone-50 text-stone-700 rounded text-[8px] font-medium border border-stone-200/80"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProviderEcosystem() {
  const [activeTab, setActiveTab] = useState("hospital");
  const active = tabs.find((t) => t.id === activeTab) || tabs[0];

  return (
    <section className="py-16 sm:py-24 bg-[#FAF8F4] relative overflow-hidden" id="providers">
      <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10">
        {/* Section Header */}
        <div className="text-center mb-12 sm:mb-14 animate-in fade-in slide-in-from-bottom-6 duration-700">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/70 mb-3.5 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-vd-forest animate-pulse" />
            <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-vd-forest">
              PROVIDER ECOSYSTEM
            </span>
          </div>

          <h2 className="font-heading text-3xl sm:text-4xl md:text-5xl text-vd-forest font-semibold mb-4 leading-tight tracking-tight">
            The healthcare ecosystem,{" "}
            <em className="text-vd-sage italic font-normal">connected.</em>
          </h2>

          <p className="text-stone-600 max-w-2xl mx-auto text-sm sm:text-base font-normal leading-relaxed">
            A unified suite of dedicated software workspaces tailored to every provider role across clinical
            medicine, hospital management, pharmacy, diagnostics, and wellness.
          </p>
        </div>

        {/* Tab Navigation Bar */}
        <div className="flex justify-center mb-10 sm:mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-150">
          <div className="inline-flex flex-wrap justify-center gap-1.5 bg-white/90 backdrop-blur-md rounded-2xl sm:rounded-full p-1.5 border border-stone-200/80 shadow-xs max-w-full">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer ${
                    isActive
                      ? "bg-vd-forest text-white shadow-sm"
                      : "text-stone-600 hover:text-vd-forest hover:bg-stone-100/70"
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content & Workspace Preview Grid */}
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Workspace Capability Preview (Left) */}
          <div className="lg:col-span-6 flex justify-center order-2 lg:order-1 animate-in fade-in zoom-in-95 duration-700">
            <LightWorkspaceFrame tab={active} />
          </div>

          {/* Details & Actions (Right) */}
          <div className="lg:col-span-6 order-1 lg:order-2 animate-in fade-in slide-in-from-right-6 duration-700">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200/70 mb-3.5">
              <span className="text-[10px] font-bold tracking-widest uppercase text-vd-forest">
                {active.badge}
              </span>
            </div>

            <h3 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-vd-forest font-semibold mb-3.5 leading-tight">
              {active.heading}
            </h3>

            <p className="text-stone-600 text-sm sm:text-base leading-relaxed mb-6 font-normal">
              {active.desc}
            </p>

            <ul className="space-y-2.5 mb-8">
              {active.features.map((f) => (
                <li key={f} className="flex items-start gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-emerald-100/80 flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-vd-forest" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-stone-700 text-xs sm:text-sm font-normal leading-relaxed">
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3.5 flex-wrap">
              <Link
                href={active.registerHref}
                className="px-6 sm:px-7 py-3 bg-vd-forest text-white rounded-full text-xs sm:text-sm font-bold tracking-wide hover:bg-vd-forest-deep transition-all shadow-[0_8px_25px_-6px_rgba(15,95,80,0.35)] hover:-translate-y-0.5 flex items-center gap-2"
              >
                <span>{active.registerLabel}</span>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
              <Link
                href={active.loginHref}
                className="px-6 sm:px-7 py-3 border border-stone-300/80 bg-white text-vd-forest rounded-full text-xs sm:text-sm font-semibold tracking-wide hover:bg-stone-50 transition-all hover:-translate-y-0.5 shadow-xs"
              >
                Login to Portal
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}



