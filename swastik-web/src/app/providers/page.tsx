'use client';

import React from 'react';
import Link from 'next/link';
import Navbar from '@/components/landing/Navbar';
import Footer from '@/components/landing/Footer';
import {
    Stethoscope,
    Building2,
    Building,
    Activity,
    Pill,
    Dumbbell,
    Sparkles,
    ArrowRight,
    ShieldCheck,
    Users,
    TrendingUp,
    CalendarCheck,
    Lock,
    HeartPulse
} from 'lucide-react';

export default function ProvidersPage() {
    // SECTION 1: Healthcare Providers
    const healthcareProviders = [
        {
            title: 'Doctor Practice',
            role: 'Individual & Group Doctors',
            description: 'Join Vaididea as a verified physician. Accept online video consultations, manage clinic slots, and reach thousands of patients looking for specialist care.',
            icon: Stethoscope,
            href: '/register/doctor',
            badge: 'Physicians & Specialists',
            color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
            cta: 'Register as Doctor',
        },
        {
            title: 'Hospital Operations',
            role: 'Multi-Specialty & General Hospitals',
            description: 'Integrate hospital departments, manage multi-doctor OPD queues, accept patient admissions, and offer seamless digital appointments.',
            icon: Building2,
            href: '/register/hospital',
            badge: 'Hospitals & Medical Centers',
            color: 'text-blue-700 bg-blue-50 border-blue-200',
            cta: 'Register Hospital',
        },
        {
            title: 'Clinical Practice',
            role: 'Private & Poly Clinics',
            description: 'List your clinic, staff doctors, set consultation fees, and streamline patient walk-ins and scheduled appointments with automated tracking.',
            icon: Building,
            href: '/register/clinic',
            badge: 'Clinics & Polyclinics',
            color: 'text-teal-700 bg-teal-50 border-teal-200',
            cta: 'Register Clinic',
        },
        {
            title: 'Diagnostic Center',
            role: 'Pathology & Radiology Labs',
            description: 'Offer health check packages, blood tests, and scans. Receive direct patient bookings and upload reports digitally to patient profiles.',
            icon: Activity,
            href: '/register/diagnostic-center',
            badge: 'Diagnostic & Imaging Labs',
            color: 'text-purple-700 bg-purple-50 border-purple-200',
            cta: 'Register Diagnostics',
        },
        {
            title: 'Pharmacy Partner',
            role: 'Retail & Community Pharmacies',
            description: 'Fulfill local medicine orders, verify digital e-prescriptions, track doorstep deliveries, and manage pharmacy inventory seamlessly.',
            icon: Pill,
            href: '/register/pharmacy',
            badge: 'Retail Pharmacies',
            color: 'text-amber-700 bg-amber-50 border-amber-200',
            cta: 'Register Pharmacy',
        },
    ];

    // SECTION 2: Wellness & Lifestyle Partners
    const wellnessPartners = [
        {
            title: 'Gym & Fitness Center',
            role: 'Gyms, Studios & Fitness Clubs',
            description: 'List your fitness facility on the Vaididea map, showcase membership passes, publish class schedules, manage trainers, and reach active fitness seekers.',
            icon: Dumbbell,
            href: '/register/fitness-center',
            badge: 'Gyms & Studios',
            color: 'text-cyan-700 bg-cyan-50 border-cyan-200',
            cta: 'Register Fitness Center',
        },
        {
            title: 'Wellness & Health Coaches',
            role: 'Nutritionists, Yoga & Fitness Trainers',
            description: 'Offer 1-on-1 HD video & chat sessions, build custom diet and workout programs, set your consultation fees, and build a verified digital coaching practice.',
            icon: Sparkles,
            href: '/register/wellness',
            badge: 'Trainers & Nutritionists',
            color: 'text-lime-700 bg-lime-50 border-lime-200',
            cta: 'Register as Coach',
        },
    ];

    const benefits = [
        {
            title: 'Verified Provider Network',
            desc: "Get certified and gain immediate patient credibility with Vaididea's official clinical verification badge.",
            icon: ShieldCheck,
        },
        {
            title: 'Automated Scheduling',
            desc: 'Eliminate double-booking and streamline queues with real-time digital slot synchronization.',
            icon: CalendarCheck,
        },
        {
            title: 'Secure Digital Records',
            desc: 'Compliant storage for prescriptions, clinical notes, care plans, reports, and session histories.',
            icon: Lock,
        },
        {
            title: 'Expand Patient Reach',
            desc: 'Connect directly with patients and clients searching for certified healthcare & wellness services nearby.',
            icon: TrendingUp,
        },
    ];

    return (
        <div className="min-h-screen bg-[#FAF8F4] flex flex-col justify-between font-sans selection:bg-vd-forest selection:text-white">
            <Navbar />

            <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10 sm:py-14 flex-1 space-y-14">
                {/* Hero Section */}
                <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-200/60">
                        <Users className="w-3.5 h-3.5" />
                        <span>Vaididea Provider & Partner Network</span>
                    </div>
                    <h1 className="font-heading text-3xl sm:text-5xl font-bold text-vd-forest tracking-tight leading-[1.15]">
                        Grow your healthcare practice with Vaididea
                    </h1>
                    <p className="text-xs sm:text-sm md:text-base text-stone-600 mt-3 font-light leading-relaxed">
                        Join thousands of verified doctors, hospitals, polyclinics, diagnostic labs, pharmacies, fitness centers, and wellness coaches connecting directly with patients and clients across India.
                    </p>
                </div>

                {/* Benefits Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {benefits.map((b) => {
                        const Icon = b.icon;
                        return (
                            <div
                                key={b.title}
                                className="p-5 rounded-3xl bg-white border border-stone-200/80 shadow-2xs flex flex-col justify-between"
                            >
                                <div>
                                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-vd-forest flex items-center justify-center mb-3 border border-emerald-100">
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <h3 className="font-heading text-sm font-bold text-stone-900 mb-1">
                                        {b.title}
                                    </h3>
                                    <p className="text-xs text-stone-500 font-light leading-relaxed">
                                        {b.desc}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* SECTION 1: Healthcare Providers */}
                <section className="space-y-6">
                    <div className="border-b border-stone-200/80 pb-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100/70 text-vd-forest text-[11px] font-bold uppercase tracking-wider mb-2">
                            <HeartPulse className="w-3.5 h-3.5" />
                            <span>Medical & Clinical Services</span>
                        </div>
                        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                            Healthcare Providers
                        </h2>
                        <p className="text-xs sm:text-sm text-stone-600 font-light mt-1">
                            Licensed medical doctors, hospitals, polyclinics, diagnostic pathology labs, and certified pharmacies.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {healthcareProviders.map((cat) => {
                            const Icon = cat.icon;
                            return (
                                <div
                                    key={cat.title}
                                    className="bg-white p-6 rounded-3xl border border-stone-200/90 hover:border-vd-forest/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${cat.color}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                                                {cat.badge}
                                            </span>
                                        </div>

                                        <h3 className="font-heading text-lg font-bold text-stone-900 mb-0.5">
                                            {cat.title}
                                        </h3>
                                        <div className="text-xs font-semibold text-vd-forest mb-2.5">
                                            {cat.role}
                                        </div>
                                        <p className="text-xs sm:text-[13px] text-stone-600 font-light leading-relaxed mb-6">
                                            {cat.description}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-stone-100">
                                        <Link
                                            href={cat.href}
                                            className="w-full py-2.5 px-4 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                                        >
                                            <span>{cat.cta}</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* SECTION 2: Wellness & Lifestyle Partners */}
                <section className="space-y-6 pt-4">
                    <div className="border-b border-stone-200/80 pb-4">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-100/70 text-cyan-900 text-[11px] font-bold uppercase tracking-wider mb-2">
                            <Dumbbell className="w-3.5 h-3.5" />
                            <span>Fitness & Preventive Wellness</span>
                        </div>
                        <h2 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900 tracking-tight">
                            Wellness & Lifestyle Partners
                        </h2>
                        <p className="text-xs sm:text-sm text-stone-600 font-light mt-1">
                            Gyms, fitness clubs, yoga studios, personal trainers, dietitians, and holistic wellness coaches.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {wellnessPartners.map((cat) => {
                            const Icon = cat.icon;
                            return (
                                <div
                                    key={cat.title}
                                    className="bg-white p-6 rounded-3xl border border-stone-200/90 hover:border-vd-forest/50 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="flex items-center justify-between gap-2 mb-4">
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${cat.color}`}>
                                                <Icon className="w-6 h-6" />
                                            </div>
                                            <span className="text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200">
                                                {cat.badge}
                                            </span>
                                        </div>

                                        <h3 className="font-heading text-lg font-bold text-stone-900 mb-0.5">
                                            {cat.title}
                                        </h3>
                                        <div className="text-xs font-semibold text-vd-forest mb-2.5">
                                            {cat.role}
                                        </div>
                                        <p className="text-xs sm:text-[13px] text-stone-600 font-light leading-relaxed mb-6">
                                            {cat.description}
                                        </p>
                                    </div>

                                    <div className="pt-4 border-t border-stone-100">
                                        <Link
                                            href={cat.href}
                                            className="w-full py-2.5 px-4 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
                                        >
                                            <span>{cat.cta}</span>
                                            <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            );
                        })}

                        {/* Onboarding Info Card */}
                        <div className="bg-gradient-to-br from-emerald-50 via-teal-50/40 to-white p-6 rounded-3xl border border-emerald-200/70 shadow-2xs flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-white text-vd-forest flex items-center justify-center border border-emerald-200 shadow-2xs">
                                    <ShieldCheck className="w-6 h-6" />
                                </div>
                                <h3 className="font-heading text-lg font-bold text-vd-forest">
                                    Simple & Fast Onboarding
                                </h3>
                                <p className="text-xs text-stone-600 font-light leading-relaxed">
                                    Our automated digital verification process ensures your facility or coaching practice is reviewed and activated quickly with direct patient access.
                                </p>
                            </div>
                            <div className="pt-4 border-t border-emerald-200/60">
                                <div className="text-[11px] font-semibold text-emerald-800 flex items-center gap-1.5">
                                    <span>✓ Instant OTP Verification</span>
                                    <span>•</span>
                                    <span>✓ Bank Payouts</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
