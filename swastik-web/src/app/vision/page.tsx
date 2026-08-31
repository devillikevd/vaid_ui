/* eslint-disable @next/next/no-img-element */
import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import {
    Activity,
    Shield,
    Users,
    Stethoscope,
    Building2,
    Clock,
    HeartPulse,
    Cpu,
    WifiOff,
    CheckCircle2,
    ArrowRight,
    Search,
    Calendar,
    Video,
    FileText,
    Pill,
    Sparkles,
    Siren,
    Layers,
    Share2,
    Hospital,
    Building,
    Microscope,
    Truck,
    Flame,
    ArrowDown,
    Zap,
    Radio
} from "lucide-react";

export const metadata: Metadata = {
    title: "Vision & Healthcare Ecosystem — Vaididea",
    description:
        "Vaididea is building a connected healthcare infrastructure where patients and healthcare providers operate together across one unified ecosystem.",
};

export default function VisionPage() {
    return (
        <div className="min-h-screen bg-[#FAF8F4] text-stone-900 font-sans selection:bg-vd-sage/20 selection:text-vd-forest">
            {/* Global Navigation */}
            <Navbar />

            {/* ========================================================================= */}
            {/* 01. HERO SECTION: EDITORIAL & LAYERED HORIZONTAL ECOSYSTEM */}
            {/* ========================================================================= */}
            <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-gradient-to-b from-stone-100/70 via-[#FAF8F4] to-[#FAF8F4] border-b border-stone-200/60">
                <div className="max-w-6xl mx-auto px-5 sm:px-8 relative z-10 text-center">
                    {/* Eyebrow */}
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/90 border border-stone-200 shadow-xs mb-8">
                        <span className="w-2 h-2 rounded-full bg-vd-forest animate-pulse" />
                        <span className="text-[11px] sm:text-xs font-semibold tracking-[0.2em] uppercase text-vd-forest">
                            THE VAIDIDEA VISION
                        </span>
                    </div>

                    {/* Main Headline */}
                    <h1 className="font-heading text-4xl sm:text-6xl md:text-7xl lg:text-8xl text-vd-forest font-semibold tracking-tight leading-[1.08] mb-6 max-w-5xl mx-auto">
                        Healthcare Without Boundaries.
                    </h1>

                    {/* Subheadline */}
                    <p className="text-xl sm:text-2xl md:text-3xl text-vd-forest-deep/90 font-heading italic font-normal max-w-3xl mx-auto mb-6 leading-relaxed">
                        One connected infrastructure for people, providers, and every step of the healthcare journey.
                    </p>

                    {/* Supporting Copy */}
                    <p className="text-base sm:text-lg text-stone-600 font-light max-w-3xl mx-auto leading-relaxed mb-10">
                        Vaididea brings patients and healthcare providers into one connected ecosystem — combining healthcare discovery,
                        consultation, records, diagnostics, medicines, emergency support, intelligent assistance, and provider operations.
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
                        <a
                            href="#ecosystem-model"
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-vd-forest hover:bg-vd-forest-deep text-white font-semibold text-sm tracking-wide transition-all shadow-[0_8px_25px_-6px_rgba(15,95,80,0.35)] hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>Explore the Ecosystem</span>
                            <ArrowRight className="w-4 h-4" />
                        </a>
                        <a
                            href="#how-it-works"
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-white hover:bg-stone-50 text-stone-800 border border-stone-200 font-semibold text-sm tracking-wide transition-all shadow-xs hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                        >
                            <span>How Vaididea Works</span>
                            <ArrowDown className="w-4 h-4 text-vd-forest" />
                        </a>
                    </div>

                    {/* Horizontal Layered Ecosystem Preview (No giant circles) */}
                    <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-sm max-w-5xl mx-auto text-left">
                        <div className="flex flex-col md:flex-row items-stretch justify-between gap-4">
                            {/* Layer 1: People */}
                            <div className="flex-1 bg-vd-cream/60 p-5 rounded-2xl border border-stone-200/80">
                                <div className="flex items-center gap-2 mb-2 text-vd-forest font-bold text-xs uppercase tracking-wider">
                                    <Users className="w-4 h-4 text-vd-forest" />
                                    <span>Patients & Families</span>
                                </div>
                                <p className="text-xs text-stone-600 font-light leading-relaxed">
                                    Continuous personal care: find verified doctors, book clinic visits, order prescriptions, and maintain lifelong health records.
                                </p>
                            </div>

                            {/* Center Bridge */}
                            <div className="flex md:flex-col items-center justify-center px-2 py-1 text-vd-forest">
                                <span className="hidden md:block w-px h-8 bg-vd-forest/20" />
                                <div className="px-3 py-1.5 bg-vd-forest text-white rounded-full text-[10px] font-bold uppercase tracking-widest text-center shadow-xs">
                                    Connected Core
                                </div>
                                <span className="hidden md:block w-px h-8 bg-vd-forest/20" />
                            </div>

                            {/* Layer 2: Providers */}
                            <div className="flex-1 bg-vd-cream/60 p-5 rounded-2xl border border-stone-200/80">
                                <div className="flex items-center gap-2 mb-2 text-vd-forest font-bold text-xs uppercase tracking-wider">
                                    <Stethoscope className="w-4 h-4 text-vd-forest" />
                                    <span>Healthcare Providers</span>
                                </div>
                                <p className="text-xs text-stone-600 font-light leading-relaxed">
                                    Dedicated operational workspaces: clinical consultation, bed management, lab queues, inventory, and emergency dispatch.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 02. THE PROBLEM: HEALTHCARE FRAGMENTATION */}
            {/* ========================================================================= */}
            <section className="py-20 md:py-28 bg-[#FAF8F4] border-b border-stone-200/60" id="the-problem">
                <div className="max-w-5xl mx-auto px-5 sm:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-vd-forest block mb-3">
                            01 — THE STRUCTURAL CHALLENGE
                        </span>
                        <h2 className="font-heading text-3xl sm:text-5xl font-semibold text-vd-forest tracking-tight mb-6">
                            Healthcare is not one service. So why does it feel like one?
                        </h2>
                        <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed">
                            Patients routinely navigate between doctors, diagnostic labs, hospitals, pharmacies, emergency services, and wellness centers.
                            Yet each of these crucial providers operates in its own isolated silo.
                        </p>
                    </div>

                    {/* Disconnected / Siloed providers strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 mb-16">
                        {[
                            { name: "Doctor", icon: Stethoscope },
                            { name: "Hospital", icon: Hospital },
                            { name: "Clinic", icon: Building },
                            { name: "Diagnostic Lab", icon: Microscope },
                            { name: "Pharmacy", icon: Pill },
                            { name: "Emergency", icon: Siren },
                            { name: "Wellness", icon: Flame },
                        ].map((item, i) => (
                            <div
                                key={i}
                                className="bg-white/85 p-4 rounded-2xl border border-stone-200/90 hover:border-stone-300 text-center shadow-2xs transition-all flex flex-col items-center justify-between min-h-[124px]"
                            >
                                <div className="w-10 h-10 rounded-xl bg-stone-100/80 text-stone-600 flex items-center justify-center mb-2">
                                    <item.icon className="w-5 h-5 text-stone-700" />
                                </div>
                                <span className="text-xs font-semibold text-stone-800 block mb-2">{item.name}</span>
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-rose-50/70 border border-rose-200/60 text-[10px] font-medium text-rose-600/90">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500/70" />
                                    <span>Disconnected</span>
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Problem grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                        {[
                            {
                                title: "Scattered Health Records",
                                desc: "Paper reports and siloed PDF files get lost between consultations, forcing doctors to treat patients without complete history.",
                                icon: FileText,
                                tag: "Fragmented History",
                            },
                            {
                                title: "Friction in Care Discovery",
                                desc: "Patients rely on word-of-mouth or unverified listings to locate clinical specialists, lab tests, and hospital beds.",
                                icon: Search,
                                tag: "Blind Discovery",
                            },
                            {
                                title: "Disconnected Diagnostics",
                                desc: "Patients must physically retrieve test reports and re-upload or hand-carry them to their physicians.",
                                icon: Microscope,
                                tag: "Manual Relays",
                            },
                            {
                                title: "Prescription & Pharmacy Gaps",
                                desc: "Handwritten scripts lead to dispensing errors, stockouts, and lack of verified digital tracking.",
                                icon: Pill,
                                tag: "Dispensing Gaps",
                            },
                            {
                                title: "Critical Emergency Delays",
                                desc: "When emergencies strike, first responders and ER triage teams lack instant access to blood group, allergies, or chronic history.",
                                icon: Siren,
                                tag: "Triage Delays",
                            },
                            {
                                title: "Different Systems for Providers",
                                desc: "Hospitals, clinics, and standalone pharmacies juggle disparate legacy software with zero interoperability.",
                                icon: Layers,
                                tag: "Zero Interoperability",
                            },
                        ].map((prob, i) => (
                            <div key={i} className="bg-white p-6 rounded-3xl border border-stone-200/80 hover:border-stone-300 shadow-2xs transition-all flex items-start gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-rose-50/80 border border-rose-100/90 text-rose-700/80 flex items-center justify-center shrink-0">
                                    <prob.icon className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                        <h4 className="text-sm sm:text-base font-bold text-stone-900">{prob.title}</h4>
                                        <span className="text-[10px] font-semibold text-rose-600/80 bg-rose-50/60 px-2 py-0.5 rounded-md border border-rose-100/60 shrink-0">
                                            {prob.tag}
                                        </span>
                                    </div>
                                    <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed">{prob.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Transition statement */}
                    <div className="mt-12 p-6 rounded-2xl bg-vd-forest/5 border border-vd-forest/15 text-center">
                        <p className="font-heading text-lg sm:text-xl text-vd-forest font-semibold italic">
                            “Vaididea is designed to connect these parts into one cohesive healthcare infrastructure.”
                        </p>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 03. THE VAIDIDEA MODEL: ONE ECOSYSTEM, TWO CONNECTED SIDES */}
            {/* ========================================================================= */}
            <section className="py-20 md:py-28 bg-stone-100/40 border-b border-stone-200/60 relative overflow-hidden" id="ecosystem-model">
                <div className="max-w-7xl mx-auto px-5 sm:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-vd-forest block mb-3">
                            02 — THE ARCHITECTURE
                        </span>
                        <h2 className="font-heading text-3xl sm:text-5xl font-semibold text-vd-forest tracking-tight mb-6">
                            One ecosystem. Two connected sides.
                        </h2>
                        <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed">
                            Vaididea is not just a portal for patients and not just practice software for doctors.
                            It is a unified infrastructure connecting everyday people with the operational software running behind medical providers.
                        </p>
                    </div>

                    {/* Desktop Network Bridge Layout */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                        {/* LEFT: FOR PEOPLE (5 cols on lg) */}
                        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/90 shadow-sm flex flex-col justify-between h-full relative">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest text-xs font-bold uppercase tracking-wider mb-4 border border-emerald-200/60">
                                    <Users className="w-3.5 h-3.5" />
                                    <span>FOR PEOPLE</span>
                                </div>
                                <h3 className="font-heading text-xl sm:text-2xl font-bold text-vd-forest mb-2.5">
                                    A Continuous Healthcare Companion
                                </h3>
                                <p className="text-xs text-stone-500 font-light leading-relaxed mb-6">
                                    Patients access comprehensive health management across all life stages:
                                </p>

                                <div className="grid grid-cols-2 gap-2 text-xs text-stone-700 font-medium">
                                    {[
                                        "Doctor Discovery",
                                        "Appointment Booking",
                                        "Video Consultation",
                                        "In-Person Consultation",
                                        "Lifelong Health Records",
                                        "Digital Health ID (QR)",
                                        "Diagnostic Lab Tests",
                                        "Medicine Orders & Refills",
                                        "AI Health Assistant",
                                        "Emergency SOS Broadcast",
                                        "Verified Health Library",
                                        "Wellness & Activity Plans",
                                        "Family Health Profiles",
                                        "Community Q&A Support",
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-stone-50/80 border border-stone-100 hover:bg-emerald-50/40 transition-colors">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            <span className="truncate">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* CENTER CONNECTOR (2 cols on lg) */}
                        <div className="lg:col-span-2 flex flex-col items-center justify-center my-2 lg:my-0 px-2">
                            {/* Horizontal Connector for Desktop */}
                            <div className="hidden lg:flex flex-col items-center justify-center w-full relative">
                                {/* Left-Right Connector Lines with Pulsing Nodes */}
                                <div className="w-full flex items-center justify-between relative px-1 mb-3">
                                    <div className="h-0.5 flex-1 bg-gradient-to-r from-emerald-500/40 via-vd-forest to-vd-forest relative">
                                        <span className="w-2.5 h-2.5 rounded-full bg-vd-forest absolute -top-1 left-0 ring-4 ring-emerald-100" />
                                    </div>
                                    <div className="mx-2.5 w-8 h-8 rounded-full bg-vd-forest text-white flex items-center justify-center shadow-md shrink-0">
                                        <Share2 className="w-4 h-4 text-emerald-200" />
                                    </div>
                                    <div className="h-0.5 flex-1 bg-gradient-to-r from-vd-forest via-vd-forest to-emerald-500/40 relative">
                                        <span className="w-2.5 h-2.5 rounded-full bg-vd-forest absolute -top-1 right-0 ring-4 ring-emerald-100" />
                                    </div>
                                </div>

                                {/* Central Network Badge */}
                                <div className="px-3 py-2 rounded-2xl bg-white border border-vd-forest/20 shadow-xs text-center space-y-1 w-full max-w-[170px]">
                                    <span className="text-[10px] font-bold tracking-widest uppercase text-vd-forest block">
                                        VAIDIDEA NETWORK
                                    </span>
                                    <span className="text-[8.5px] text-stone-500 font-medium block leading-tight">
                                        CONNECTED HEALTHCARE INFRASTRUCTURE
                                    </span>
                                </div>
                            </div>

                            {/* Vertical Connector for Mobile / Tablet */}
                            <div className="flex lg:hidden flex-col items-center justify-center w-full py-2">
                                <div className="h-6 w-0.5 bg-gradient-to-b from-stone-200 to-vd-forest" />
                                <div className="my-2 px-4 py-2 rounded-2xl bg-white border border-vd-forest/20 shadow-xs text-center space-y-0.5">
                                    <div className="flex items-center justify-center gap-2">
                                        <Share2 className="w-3.5 h-3.5 text-vd-forest" />
                                        <span className="text-[11px] font-bold tracking-wider uppercase text-vd-forest">
                                            VAIDIDEA NETWORK
                                        </span>
                                    </div>
                                    <span className="text-[10px] text-stone-500 block">
                                        CONNECTED HEALTHCARE INFRASTRUCTURE
                                    </span>
                                </div>
                                <div className="h-6 w-0.5 bg-gradient-to-b from-vd-forest to-stone-200" />
                            </div>
                        </div>

                        {/* RIGHT: FOR PROVIDERS (5 cols on lg) */}
                        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl border border-stone-200/90 shadow-sm flex flex-col justify-between h-full relative">
                            <div>
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 text-xs font-bold uppercase tracking-wider mb-4 border border-teal-200/60">
                                    <Building2 className="w-3.5 h-3.5" />
                                    <span>FOR PROVIDERS</span>
                                </div>
                                <h3 className="font-heading text-xl sm:text-2xl font-bold text-vd-forest mb-2.5">
                                    Dedicated Operational Workspaces
                                </h3>
                                <p className="text-xs text-stone-500 font-light leading-relaxed mb-6">
                                    Providers operate their medical practice with dedicated operational software:
                                </p>

                                <div className="grid grid-cols-2 gap-2 text-xs text-stone-700 font-medium">
                                    {[
                                        "Doctor Workspace",
                                        "Hospital Operations",
                                        "Clinic Management",
                                        "Diagnostic Queues",
                                        "Pharmacy Operations",
                                        "Emergency SOS Fleet",
                                        "Sample & Med Delivery",
                                        "Wellness Studio Portals",
                                        "Clinical Roster Schedules",
                                        "Bed Capacity Tracking",
                                        "Digital Rx Authoring",
                                        "Diagnostic PDF Reports",
                                        "Inventory & POS Billing",
                                        "Admin & Audit Logs",
                                    ].map((item, idx) => (
                                        <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-stone-50/80 border border-stone-100 hover:bg-teal-50/40 transition-colors">
                                            <Zap className="w-3.5 h-3.5 text-teal-700 shrink-0" />
                                            <span className="truncate">{item}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 04. HOW PROVIDERS JOIN: STEP-BY-STEP ONBOARDING FLOW */}
            {/* ========================================================================= */}
            <section className="py-20 md:py-28 bg-[#FAF8F4] border-b border-stone-200/60" id="provider-onboarding">
                <div className="max-w-6xl mx-auto px-5 sm:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-vd-forest block mb-3">
                            03 — PROVIDER INTEGRATION
                        </span>
                        <h2 className="font-heading text-3xl sm:text-5xl font-semibold text-vd-forest tracking-tight mb-6">
                            Healthcare providers don&apos;t just join the network. They get the tools to run their work.
                        </h2>
                        <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed">
                            Joining Vaididea is an active operational integration. Providers gain clinical and administrative software tailored to their medical role.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            {
                                step: "01",
                                title: "JOIN",
                                desc: "Provider registers their profile and medical facility credentials with Vaididea.",
                                icon: Stethoscope,
                            },
                            {
                                step: "02",
                                title: "VERIFY",
                                desc: "Provider identity and organization details are verified according to the applicable onboarding process.",
                                icon: Shield,
                            },
                            {
                                step: "03",
                                title: "CONFIGURE",
                                desc: "Provider configures clinical services, consultation modes, staff rosters, slot schedules, and operational inventory.",
                                icon: Layers,
                            },
                            {
                                step: "04",
                                title: "CONNECT",
                                desc: "The verified provider is instantly linked to the broader Vaididea care, referral, and emergency networks.",
                                icon: Share2,
                            },
                            {
                                step: "05",
                                title: "SERVE",
                                desc: "Patients discover verified services, schedule visits, and initiate telemedicine consultations seamlessly.",
                                icon: HeartPulse,
                            },
                            {
                                step: "06",
                                title: "OPERATE",
                                desc: "Daily patient triage, e-prescribing, bed routing, diagnostic queues, and billing are managed within the dedicated workspace.",
                                icon: Activity,
                            },
                        ].map((item, idx) => (
                            <div key={idx} className="bg-white p-7 rounded-3xl border border-stone-200 shadow-xs relative overflow-hidden group hover:border-vd-sage transition-all">
                                <span className="text-3xl font-heading font-bold text-vd-forest/15 absolute top-5 right-6 select-none">
                                    {item.step}
                                </span>
                                <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-vd-forest flex items-center justify-center mb-4">
                                    <item.icon className="w-5 h-5" />
                                </div>
                                <h3 className="font-heading text-lg font-bold text-vd-forest mb-2">
                                    {item.step}. {item.title}
                                </h3>
                                <p className="text-xs text-stone-600 font-light leading-relaxed">
                                    {item.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 05. DEDICATED PROVIDER SOFTWARE LAYER */}
            {/* ========================================================================= */}
            <section className="py-20 md:py-28 bg-stone-100/50 border-b border-stone-200/60" id="provider-software">
                <div className="max-w-6xl mx-auto px-5 sm:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-vd-forest block mb-3">
                            04 — THE WORKSPACE LAYER
                        </span>
                        <h2 className="font-heading text-3xl sm:text-5xl font-semibold text-vd-forest tracking-tight mb-6">
                            Every provider needs more than a profile.
                        </h2>
                        <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed">
                            Vaididea gives healthcare providers dedicated digital tools to manage the work behind patient care.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                        {/* Doctor */}
                        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center mb-3">
                                    <Stethoscope className="w-5 h-5" />
                                </div>
                                <h4 className="font-heading text-lg font-bold text-vd-forest mb-1">Doctor Workspace</h4>
                                <p className="text-[11px] text-stone-500 font-light mb-4">Dedicated clinical suite for individual and affiliated practitioners.</p>
                                <ul className="space-y-1.5 text-xs text-stone-700">
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> In-person & video consults</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Digital e-prescriptions</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Patient history access</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> QR-based health card scan</li>
                                </ul>
                            </div>
                            <Link href="/register/doctor" className="mt-5 text-xs font-bold text-vd-forest hover:text-vd-sage flex items-center gap-1">
                                Doctor Portal →
                            </Link>
                        </div>

                        {/* Hospital */}
                        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-3">
                                    <Hospital className="w-5 h-5" />
                                </div>
                                <h4 className="font-heading text-lg font-bold text-vd-forest mb-1">Hospital Operations</h4>
                                <p className="text-[11px] text-stone-500 font-light mb-4">Enterprise console for inpatient, emergency, and department routing.</p>
                                <ul className="space-y-1.5 text-xs text-stone-700">
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Doctor roster management</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Real-time bed occupancy</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Emergency triage queues</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Multi-department analytics</li>
                                </ul>
                            </div>
                            <Link href="/register/hospital" className="mt-5 text-xs font-bold text-vd-forest hover:text-vd-sage flex items-center gap-1">
                                Hospital Portal →
                            </Link>
                        </div>

                        {/* Clinic */}
                        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3">
                                    <Building className="w-5 h-5" />
                                </div>
                                <h4 className="font-heading text-lg font-bold text-vd-forest mb-1">Clinic Management</h4>
                                <p className="text-[11px] text-stone-500 font-light mb-4">Multi-specialty outpatient scheduling and patient intake software.</p>
                                <ul className="space-y-1.5 text-xs text-stone-700">
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Appointment scheduling</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Reception & patient queue</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Health alert broadcasts</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Multi-doctor coordination</li>
                                </ul>
                            </div>
                            <Link href="/register/clinic" className="mt-5 text-xs font-bold text-vd-forest hover:text-vd-sage flex items-center gap-1">
                                Clinic Portal →
                            </Link>
                        </div>

                        {/* Diagnostic Center */}
                        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3">
                                    <Microscope className="w-5 h-5" />
                                </div>
                                <h4 className="font-heading text-lg font-bold text-vd-forest mb-1">Diagnostic Operations</h4>
                                <p className="text-[11px] text-stone-500 font-light mb-4">Lab test catalog, sample logistics, and digital report publishing.</p>
                                <ul className="space-y-1.5 text-xs text-stone-700">
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Test catalog management</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Sample collection queue</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Digital PDF report publishing</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Doctor referral sync</li>
                                </ul>
                            </div>
                            <Link href="/register/diagnostic-center" className="mt-5 text-xs font-bold text-vd-forest hover:text-vd-sage flex items-center gap-1">
                                Diagnostic Portal →
                            </Link>
                        </div>

                        {/* Pharmacy */}
                        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center mb-3">
                                    <Pill className="w-5 h-5" />
                                </div>
                                <h4 className="font-heading text-lg font-bold text-vd-forest mb-1">Pharmacy Operations</h4>
                                <p className="text-[11px] text-stone-500 font-light mb-4">Medicine inventory, prescription verification, and POS billing.</p>
                                <ul className="space-y-1.5 text-xs text-stone-700">
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Inventory & batch tracking</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Digital prescription intake</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Retail POS checkout</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Order fulfillment</li>
                                </ul>
                            </div>
                            <Link href="/register/pharmacy" className="mt-5 text-xs font-bold text-vd-forest hover:text-vd-sage flex items-center gap-1">
                                Pharmacy Portal →
                            </Link>
                        </div>

                        {/* Ambulance / Emergency */}
                        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center mb-3">
                                    <Siren className="w-5 h-5" />
                                </div>
                                <h4 className="font-heading text-lg font-bold text-vd-forest mb-1">Emergency Network</h4>
                                <p className="text-[11px] text-stone-500 font-light mb-4">Rapid dispatch and live geolocation routing for urgent medical events.</p>
                                <ul className="space-y-1.5 text-xs text-stone-700">
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Live GPS SOS reception</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Driver dispatch tracking</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Direct hospital ER alert</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Emergency contact broadcast</li>
                                </ul>
                            </div>
                            <span className="mt-5 text-xs font-bold text-stone-400">Integrated Service</span>
                        </div>

                        {/* Delivery Operations */}
                        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="w-9 h-9 rounded-xl bg-orange-50 text-orange-700 flex items-center justify-center mb-3">
                                    <Truck className="w-5 h-5" />
                                </div>
                                <h4 className="font-heading text-lg font-bold text-vd-forest mb-1">Healthcare Delivery</h4>
                                <p className="text-[11px] text-stone-500 font-light mb-4">Secure transport workflows for essential medicines and diagnostic samples.</p>
                                <ul className="space-y-1.5 text-xs text-stone-700">
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Prescription dispatch</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Home lab sample pick-up</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Secure chain of custody</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Status tracking links</li>
                                </ul>
                            </div>
                            <span className="mt-5 text-xs font-bold text-stone-400">Integrated Service</span>
                        </div>

                        {/* Wellness & Fitness */}
                        <div className="bg-white p-6 rounded-3xl border border-stone-200 shadow-xs flex flex-col justify-between">
                            <div>
                                <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center mb-3">
                                    <Flame className="w-5 h-5" />
                                </div>
                                <h4 className="font-heading text-lg font-bold text-vd-forest mb-1">Wellness Ecosystem</h4>
                                <p className="text-[11px] text-stone-500 font-light mb-4">Preventative wellness, nutrition plans, and lifestyle management.</p>
                                <ul className="space-y-1.5 text-xs text-stone-700">
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Wellness practitioner portal</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Nutrition & diet plans</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Community engagement</li>
                                    <li className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-vd-sage shrink-0" /> Preventative lifestyle care</li>
                                </ul>
                            </div>
                            <Link href="/wellness" className="mt-5 text-xs font-bold text-vd-forest hover:text-vd-sage flex items-center gap-1">
                                Wellness Portal →
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 06. HOW THE NETWORK ACTUALLY WORKS: HORIZONTAL WORKFLOW VISUAL */}
            {/* ========================================================================= */}
            <section className="py-20 md:py-28 bg-[#FAF8F4] border-b border-stone-200/60" id="how-it-works">
                <div className="max-w-6xl mx-auto px-5 sm:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-vd-forest block mb-3">
                            05 — CONTINUOUS CARE JOURNEY
                        </span>
                        <h2 className="font-heading text-3xl sm:text-5xl font-semibold text-vd-forest tracking-tight mb-6">
                            Connected providers. One healthcare journey.
                        </h2>
                        <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed">
                            When medical providers are connected on a single infrastructure, patient care shifts from disjointed episodes to an unbroken continuum.
                        </p>
                    </div>

                    {/* Standard Care Continuum Workflow */}
                    <div className="bg-white p-7 sm:p-10 rounded-3xl border border-stone-200 shadow-sm mb-8">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-100">
                            <div>
                                <h3 className="font-heading text-xl font-bold text-vd-forest">Routine Consultation & Diagnostic Continuum</h3>
                                <p className="text-xs text-stone-500 font-light">From search to verified recovery</p>
                            </div>
                            <span className="px-3 py-1 bg-emerald-50 text-vd-forest font-mono text-xs rounded-full font-semibold">
                                Live Architecture
                            </span>
                        </div>

                        {/* Horizontal step flow (stacks on mobile) */}
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-3 relative">
                            {[
                                { step: "1. Discover", actor: "Patient", action: "Finds specialist", icon: Search },
                                { step: "2. Book", actor: "Patient/Doctor", action: "Schedules slot", icon: Calendar },
                                { step: "3. Consult", actor: "Doctor", action: "Video / Clinic visit", icon: Video },
                                { step: "4. Test", actor: "Lab", action: "Sample & Analysis", icon: Microscope },
                                { step: "5. Report", actor: "Lab/Doctor", action: "Digital PDF synced", icon: FileText },
                                { step: "6. Prescribe", actor: "Doctor/Pharmacy", action: "Digital Rx fulfillment", icon: Pill },
                                { step: "7. Follow-up", actor: "Patient Record", action: "Lifelong health history", icon: HeartPulse },
                            ].map((s, idx) => (
                                <div key={idx} className="bg-stone-50 p-4 rounded-2xl border border-stone-200/80 text-center relative group hover:border-vd-forest transition-colors">
                                    <div className="w-8 h-8 rounded-full bg-vd-forest/10 text-vd-forest flex items-center justify-center mx-auto mb-2">
                                        <s.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-vd-forest block mb-0.5">{s.step}</span>
                                    <span className="text-[10px] text-stone-500 font-medium block mb-1">{s.actor}</span>
                                    <span className="text-[11px] text-stone-700 leading-tight block">{s.action}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Emergency Network Workflow */}
                    <div className="bg-white p-7 sm:p-10 rounded-3xl border border-stone-200 shadow-sm">
                        <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-100">
                            <div>
                                <h3 className="font-heading text-xl font-bold text-red-700 flex items-center gap-2">
                                    <Siren className="w-5 h-5" />
                                    <span>Emergency Response Workflow</span>
                                </h3>
                                <p className="text-xs text-stone-500 font-light">Rapid coordination when seconds matter</p>
                            </div>
                            <span className="px-3 py-1 bg-red-50 text-red-700 font-mono text-xs rounded-full font-semibold">
                                Urgent Path
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                            {[
                                { step: "1. SOS Broadcast", detail: "Patient triggers 1-tap SOS alert with GPS", icon: Radio },
                                { step: "2. Infrastructure Sync", detail: "Vaididea platform routes critical medical data", icon: Share2 },
                                { step: "3. Ambulance Dispatch", detail: "Closest ambulance notified with coordinates", icon: Siren },
                                { step: "4. Hospital ER Alert", detail: "Emergency ward receives blood group & allergies", icon: Hospital },
                                { step: "5. Immediate Triage", detail: "Trauma team is pre-informed prior to arrival", icon: Activity },
                            ].map((em, idx) => (
                                <div key={idx} className="bg-red-50/40 p-4 rounded-2xl border border-red-100 text-center">
                                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-2">
                                        <em.icon className="w-4 h-4" />
                                    </div>
                                    <span className="text-xs font-bold text-red-900 block mb-1">{em.step}</span>
                                    <span className="text-[11px] text-stone-600 leading-tight block">{em.detail}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 07. DATA BACKBONE & PRIVACY */}
            {/* ========================================================================= */}
            <section className="py-20 md:py-28 bg-stone-100/50 border-b border-stone-200/60" id="data-backbone">
                <div className="max-w-5xl mx-auto px-5 sm:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-vd-forest block mb-3">
                            06 — SECURE DATA BACKBONE
                        </span>
                        <h2 className="font-heading text-3xl sm:text-5xl font-semibold text-vd-forest tracking-tight mb-6">
                            One connected information layer.
                        </h2>
                        <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed">
                            A connected healthcare ecosystem requires a unified information backbone so relevant clinical workflows operate harmoniously.
                        </p>
                    </div>

                    {/* Backbone visual card */}
                    <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm mb-12">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-8">
                            {["Patients", "Doctors", "Hospitals", "Clinics", "Diagnostic Labs", "Pharmacies", "Emergency Fleet", "AI Analytics"].map((node, i) => (
                                <div key={i} className="p-3 bg-stone-50 rounded-xl border border-stone-200/60 text-xs font-semibold text-stone-700">
                                    {node}
                                </div>
                            ))}
                        </div>

                        <div className="p-6 rounded-2xl bg-vd-forest text-white text-center shadow-xs">
                            <h4 className="font-heading text-xl font-bold mb-2">VAIDIDEA HEALTHCARE DATA BACKBONE</h4>
                            <p className="text-xs text-emerald-100/80 max-w-2xl mx-auto font-light leading-relaxed">
                                Encrypted health records, FHIR-aligned schema structures, verifiable audit logs, and granular consent tokens.
                            </p>
                        </div>
                    </div>

                    {/* Responsible Privacy Notice */}
                    <div className="bg-emerald-50/80 p-6 sm:p-8 rounded-3xl border border-emerald-200 text-vd-forest">
                        <div className="flex items-start gap-4">
                            <Shield className="w-6 h-6 text-vd-forest shrink-0 mt-1" />
                            <div>
                                <h4 className="font-heading text-lg font-bold mb-1">Controlled, Consent-Based Health Data Sovereignty</h4>
                                <p className="text-xs sm:text-sm text-stone-700 font-light leading-relaxed">
                                    Connection never means uncontrolled exposure. Access to patient health records remains strictly encrypted,
                                    time-limited, and accessible only upon explicit patient authorization and consent. No unauthorized provider has universal access.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 08. WHAT THE PATIENT & PROVIDER GET (SIDE-BY-SIDE JOURNEY) */}
            {/* ========================================================================= */}
            <section className="py-20 md:py-28 bg-[#FAF8F4] border-b border-stone-200/60">
                <div className="max-w-6xl mx-auto px-5 sm:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Patient side */}
                        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-vd-forest block mb-2">PATIENT EXPERIENCE</span>
                            <h3 className="font-heading text-2xl sm:text-3xl font-bold text-vd-forest mb-4">
                                One place for the healthcare journey.
                            </h3>
                            <p className="text-xs text-stone-600 font-light leading-relaxed mb-6">
                                The Vaididea patient experience preserves the complete healthcare journey from the first symptom to lifelong care:
                            </p>
                            <div className="space-y-3 text-xs text-stone-700">
                                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 font-medium">
                                    <strong className="text-vd-forest">Discover → Book → Consult:</strong> Find certified specialists across video and in-person clinic modes.
                                </div>
                                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 font-medium">
                                    <strong className="text-vd-forest">Diagnose → Prescription:</strong> Order diagnostic tests, review digital lab PDFs, and fill verified digital Rx.
                                </div>
                                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 font-medium">
                                    <strong className="text-vd-forest">Monitor → Follow-up:</strong> Track chronic vitals, schedule post-op checkups, and preserve complete family health records.
                                </div>
                                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 font-medium">
                                    <strong className="text-vd-forest">Emergency Support:</strong> SOS GPS broadcasting and immediate emergency QR medical profiles.
                                </div>
                            </div>
                        </div>

                        {/* Provider side */}
                        <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-vd-forest block mb-2">PROVIDER PLATFORM</span>
                            <h3 className="font-heading text-2xl sm:text-3xl font-bold text-vd-forest mb-4">
                                One platform for the work behind care.
                            </h3>
                            <p className="text-xs text-stone-600 font-light leading-relaxed mb-6">
                                Providers obtain specialized operational workspaces instead of relying solely on basic public directories:
                            </p>
                            <div className="space-y-3 text-xs text-stone-700">
                                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 font-medium">
                                    <strong className="text-vd-forest">Manage & Operate:</strong> Clinical schedules, appointment bookings, walk-in queues, and department rosters.
                                </div>
                                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 font-medium">
                                    <strong className="text-vd-forest">Connect & Serve:</strong> Teleconsultation video calls, secure chat, e-prescriptions, and diagnostic report publishing.
                                </div>
                                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 font-medium">
                                    <strong className="text-vd-forest">Fulfillment & Inventory:</strong> Pharmacy stock management, medicine orders, and lab sample queues.
                                </div>
                                <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 font-medium">
                                    <strong className="text-vd-forest">Analytics & Audit:</strong> Operational insights, review management, and compliance audit logs.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 09. MULTI-LAYER ECOSYSTEM */}
            {/* ========================================================================= */}
            <section className="py-20 md:py-28 bg-stone-100/50 border-b border-stone-200/60">
                <div className="max-w-6xl mx-auto px-5 sm:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-vd-forest block mb-3">
                            07 — COMPREHENSIVE CARE DEPTH
                        </span>
                        <h2 className="font-heading text-3xl sm:text-5xl font-semibold text-vd-forest tracking-tight mb-6">
                            More than finding a doctor.
                        </h2>
                        <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed">
                            Vaididea connects all layers of the medical spectrum into one continuous operating infrastructure.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[
                            { layer: "CARE", desc: "Doctors, Hospitals, Clinics, and Multi-Specialty Consultation.", icon: Stethoscope },
                            { layer: "DIAGNOSTICS", desc: "Diagnostic Centers, Pathology Labs, and Automated PDF Reports.", icon: Microscope },
                            { layer: "TREATMENT", desc: "Verified E-Prescriptions, Local Pharmacies, and Medicine Delivery.", icon: Pill },
                            { layer: "EMERGENCY", desc: "1-Tap SOS, Geolocation Dispatch, Hospital ER Alerts, and Emergency QR.", icon: Siren },
                            { layer: "PREVENTION & WELLNESS", desc: "Activity tracking, nutrition advice, wellness studios, and lifestyle health.", icon: Flame },
                            { layer: "INTELLIGENCE & COMMUNITY", desc: "AI Health Assistant, verified Health Library, community Q&A, and health awareness.", icon: Sparkles },
                        ].map((card, idx) => (
                            <div key={idx} className="bg-white p-7 rounded-3xl border border-stone-200 shadow-2xs">
                                <div className="w-10 h-10 rounded-2xl bg-vd-forest text-white flex items-center justify-center mb-4">
                                    <card.icon className="w-5 h-5" />
                                </div>
                                <h4 className="font-heading text-lg font-bold text-vd-forest mb-2">{card.layer}</h4>
                                <p className="text-xs text-stone-600 font-light leading-relaxed">{card.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 10. OFFLINE-FIRST & ACCESSIBILITY PHILOSOPHY */}
            {/* ========================================================================= */}
            <section className="py-20 md:py-28 bg-[#FAF8F4] border-b border-stone-200/60">
                <div className="max-w-5xl mx-auto px-5 sm:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-vd-forest block mb-3">
                            08 — RESILIENT ACCESS
                        </span>
                        <h2 className="font-heading text-3xl sm:text-5xl font-semibold text-vd-forest tracking-tight mb-6">
                            Healthcare should not stop because the internet does.
                        </h2>
                        <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed">
                            Millions of patients and rural clinics live in low-bandwidth or intermittent connectivity zones.
                            Our architecture is designed to maintain essential healthcare workflows regardless of signal strength.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-xs">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest text-xs font-bold mb-4">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>CURRENT CAPABILITY</span>
                            </div>
                            <h4 className="font-heading text-lg font-bold text-vd-forest mb-2">Offline Health ID & Local Caching</h4>
                            <p className="text-xs text-stone-600 font-light leading-relaxed">
                                Critical emergency profiles, blood group, allergies, and local medication logs remain accessible on the patient’s mobile device without network access via encrypted on-device storage.
                            </p>
                        </div>

                        <div className="bg-white p-7 rounded-3xl border border-stone-200 shadow-xs">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-bold mb-4">
                                <Radio className="w-3.5 h-3.5" />
                                <span>FUTURE DIRECTION / ROADMAP</span>
                            </div>
                            <h4 className="font-heading text-lg font-bold text-vd-forest mb-2">Background Sync & Mesh Sync</h4>
                            <p className="text-xs text-stone-600 font-light leading-relaxed">
                                Ongoing research into decentralized store-and-forward sync queues, enabling community healthcare workers in remote areas to batch consultations and synchronize once network returns.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 11. ASSISTIVE INTELLIGENCE (RESPONSIBLE AI) */}
            {/* ========================================================================= */}
            <section className="py-20 md:py-28 bg-stone-100/50 border-b border-stone-200/60">
                <div className="max-w-5xl mx-auto px-5 sm:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-vd-forest block mb-3">
                            09 — HUMAN-CENTERED AI
                        </span>
                        <h2 className="font-heading text-3xl sm:text-5xl font-semibold text-vd-forest tracking-tight mb-6">
                            Intelligence should support care, not replace it.
                        </h2>
                        <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed">
                            Artificial intelligence within Vaididea is built strictly as an assistive guidance layer for patients and decision support for clinicians.
                        </p>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-stone-200 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100">
                                <Sparkles className="w-6 h-6 text-vd-forest mb-3" />
                                <h4 className="text-sm font-bold text-vd-forest mb-1">AI Health Assistant</h4>
                                <p className="text-xs text-stone-600 font-light leading-relaxed">
                                    Provides conversational symptom navigation, health library summaries, and guidance on which clinical specialty to consult.
                                </p>
                            </div>

                            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100">
                                <Clock className="w-6 h-6 text-vd-forest mb-3" />
                                <h4 className="text-sm font-bold text-vd-forest mb-1">Smart Reminders</h4>
                                <p className="text-xs text-stone-600 font-light leading-relaxed">
                                    Intelligent scheduling of medication doses, follow-up consults, and diagnostic test re-checks.
                                </p>
                            </div>

                            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-100">
                                <Cpu className="w-6 h-6 text-vd-forest mb-3" />
                                <h4 className="text-sm font-bold text-vd-forest mb-1">Vision Concepts (Future)</h4>
                                <p className="text-xs text-stone-600 font-light leading-relaxed">
                                    Exploratory research into automated food nutrition logging, posture screening, and computer-vision assisted vitals.
                                </p>
                            </div>
                        </div>

                        <div className="p-4 rounded-xl bg-stone-100 text-stone-600 text-xs text-center font-medium">
                            ⚠️ Note: Vaididea AI does not diagnose illnesses or replace professional medical evaluation. It is designed to assist and streamline care decisions.
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 12. FIVE DIFFERENTIATORS */}
            {/* ========================================================================= */}
            <section className="py-20 md:py-28 bg-[#FAF8F4] border-b border-stone-200/60" id="why-vaididea">
                <div className="max-w-6xl mx-auto px-5 sm:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-vd-forest block mb-3">
                            10 — CORE ADVANTAGES
                        </span>
                        <h2 className="font-heading text-3xl sm:text-5xl font-semibold text-vd-forest tracking-tight mb-6">
                            Why Vaididea?
                        </h2>
                        <p className="text-sm sm:text-base text-stone-600 font-light leading-relaxed">
                            Five foundational pillars that set the Vaididea healthcare ecosystem apart.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                        {[
                            { num: "01", title: "Offline-First", desc: "Built for real-world connectivity with local caching and offline Health ID.", icon: WifiOff },
                            { num: "02", title: "AI-Powered", desc: "Intelligent symptom guidance and instant health library navigation.", icon: Sparkles },
                            { num: "03", title: "Connected Care", desc: "Seamless bridge between in-person clinic visits and digital teleconsultation.", icon: Stethoscope },
                            { num: "04", title: "Emergency-Ready", desc: "1-tap GPS SOS, emergency contact alerts, and critical QR medical profiles.", icon: Siren },
                            { num: "05", title: "Unified Ecosystem", desc: "One shared infrastructure uniting patients, doctors, hospitals, clinics, labs, and pharmacies.", icon: Building2 },
                        ].map((diff, idx) => (
                            <div key={idx} className="bg-white p-6 rounded-3xl border border-stone-200 shadow-2xs text-center flex flex-col justify-between">
                                <div>
                                    <span className="text-xs font-mono font-bold text-vd-forest/30 block mb-3">{diff.num}</span>
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-vd-forest flex items-center justify-center mx-auto mb-4">
                                        <diff.icon className="w-5 h-5" />
                                    </div>
                                    <h4 className="font-heading text-base font-bold text-vd-forest mb-2">{diff.title}</h4>
                                    <p className="text-xs text-stone-600 font-light leading-relaxed">{diff.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 13. LONG-TERM DIRECTION */}
            {/* ========================================================================= */}
            <section className="py-20 md:py-28 bg-stone-100/50 border-b border-stone-200/60">
                <div className="max-w-5xl mx-auto px-5 sm:px-8 text-center">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-vd-forest block mb-3">
                        11 — THE LONG-TERM ROADMAP
                    </span>
                    <h2 className="font-heading text-3xl sm:text-5xl font-semibold text-vd-forest tracking-tight mb-6">
                        Building the infrastructure for everyday healthcare.
                    </h2>
                    <p className="text-sm sm:text-base text-stone-600 font-light max-w-2xl mx-auto leading-relaxed mb-12">
                        Our long-term goal is to serve as a connected healthcare operating layer where people discover and manage care,
                        while providers collaborate and operate through dedicated digital tools.
                    </p>

                    {/* Equation visual */}
                    <div className="bg-white p-8 sm:p-10 rounded-3xl border border-stone-200 shadow-sm max-w-4xl mx-auto">
                        <div className="flex flex-wrap items-center justify-center gap-3 text-xs sm:text-sm font-semibold text-stone-800">
                            <span className="px-3 py-1.5 rounded-xl bg-stone-100">Patients</span>
                            <span className="text-vd-forest font-bold">+</span>
                            <span className="px-3 py-1.5 rounded-xl bg-stone-100">Providers</span>
                            <span className="text-vd-forest font-bold">+</span>
                            <span className="px-3 py-1.5 rounded-xl bg-stone-100">Services</span>
                            <span className="text-vd-forest font-bold">+</span>
                            <span className="px-3 py-1.5 rounded-xl bg-stone-100">Software</span>
                            <span className="text-vd-forest font-bold">+</span>
                            <span className="px-3 py-1.5 rounded-xl bg-stone-100">Data Backbone</span>
                            <span className="text-vd-forest font-bold">+</span>
                            <span className="px-3 py-1.5 rounded-xl bg-stone-100">Intelligence</span>
                        </div>
                        <div className="my-5 text-vd-forest font-bold text-lg">=</div>
                        <div className="inline-block px-6 py-2.5 rounded-full bg-vd-forest text-white font-heading text-lg font-bold tracking-wide shadow-xs">
                            VAIDIDEA HEALTHCARE ECOSYSTEM
                        </div>
                    </div>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 14. CLOSING PHILOSOPHY */}
            {/* ========================================================================= */}
            <section className="py-24 md:py-36 bg-[#FAF8F4] border-b border-stone-200/60 text-center">
                <div className="max-w-4xl mx-auto px-5 sm:px-8">
                    <p className="font-heading text-3xl sm:text-5xl md:text-6xl text-vd-forest font-semibold leading-tight tracking-tight mb-8">
                        Discover. Consult. Connect. Care.
                    </p>
                    <p className="font-heading text-xl sm:text-2xl md:text-3xl text-vd-forest-deep italic mb-10">
                        “Because healthcare should not end when the consultation ends.”
                    </p>
                    <p className="text-sm sm:text-base text-stone-600 font-light max-w-2xl mx-auto leading-relaxed">
                        Vaididea is building toward a healthcare experience where people and providers remain connected across the entire journey — from the first search to lifelong care.
                    </p>
                </div>
            </section>

            {/* ========================================================================= */}
            {/* 15. FINAL CTA (WARM OFF-WHITE #FAF8F4 BACKGROUND ABOVE FOOTER) */}
            {/* ========================================================================= */}
            <section className="py-20 sm:py-28 bg-[#FAF8F4] text-stone-900 relative overflow-hidden" id="final-cta">
                <div className="max-w-4xl mx-auto px-5 sm:px-8 text-center relative z-10">
                    <h2 className="font-heading text-3xl sm:text-5xl md:text-6xl text-vd-forest font-bold tracking-tight mb-6 leading-tight">
                        Healthcare, finally connected.
                    </h2>
                    <p className="text-stone-600 text-sm sm:text-base max-w-xl mx-auto font-light leading-relaxed mb-10">
                        For patients, providers, and everyone working toward better care.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link
                            href="/#patient-care"
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-vd-forest hover:bg-vd-forest-deep text-white text-sm font-bold tracking-wide transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                        >
                            <span>Explore Vaididea</span>
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                        <Link
                            href="/patient"
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-white hover:bg-stone-50 text-vd-forest border border-stone-200 text-sm font-bold tracking-wide transition-all shadow-xs cursor-pointer"
                        >
                            Get the Patient App
                        </Link>
                        <Link
                            href="/register/doctor"
                            className="w-full sm:w-auto px-8 py-4 rounded-full bg-white hover:bg-stone-50 text-stone-700 border border-stone-200 text-sm font-semibold tracking-wide transition-all shadow-xs cursor-pointer"
                        >
                            Join as a Provider
                        </Link>
                    </div>
                </div>
            </section>

            {/* Global Footer (Forest Green Background) */}
            <Footer />
        </div>
    );
}
