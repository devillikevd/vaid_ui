'use client';

import React from 'react';
import Link from 'next/link';
import {
    User,
    Stethoscope,
    Building2,
    Pill,
    Building,
    Microscope,
    Dumbbell,
    ArrowLeft
} from 'lucide-react';

const ROLES = [
    { id: 'patient', title: 'Patient', icon: User },
    { id: 'doctor', title: 'Doctor', icon: Stethoscope },
    { id: 'hospital', title: 'Hospital', icon: Building2 },
    { id: 'clinic', title: 'Clinic', icon: Building },
    { id: 'pharmacy', title: 'Pharmacy', icon: Pill },
    { id: 'diagnostic-center', title: 'Diagnostic Lab', icon: Microscope },
    { id: 'wellness', title: 'Wellness Coach', icon: Dumbbell },
    { id: 'fitness-center', title: 'Gym & Studio', icon: Building2 },
] as const;

export default function RoleSelectorPage() {
    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center bg-[#FAF8F4] overflow-hidden font-sans text-stone-800 py-10 px-4 sm:px-6">
            {/* Subtle Warm Background Accent */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-vd-forest/5 blur-3xl" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
            </div>

            <div className="w-full max-w-4xl z-10 flex flex-col items-center">
                {/* Back to Ecosystem Navigation */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-stone-500 hover:text-vd-forest mb-6 transition-colors font-medium text-xs sm:text-sm group cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    <span>Return to Ecosystem</span>
                </Link>

                {/* Heading */}
                <div className="text-center mb-8">
                    <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-vd-forest tracking-tight mb-1.5">
                        Select Your Role
                    </h1>
                    <p className="text-stone-500 text-xs sm:text-sm font-normal max-w-md mx-auto">
                        Choose your provider portal to continue
                    </p>
                </div>

                {/* 4 × 2 Role Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 w-full max-w-3xl">
                    {ROLES.map((r) => {
                        const Icon = r.icon;

                        return (
                            <Link
                                key={r.id}
                                href={`/login/${r.id}`}
                                className="flex flex-col items-center justify-center gap-3 p-5 sm:p-5.5 rounded-2xl bg-white border border-stone-200/80 shadow-2xs hover:border-vd-forest/50 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group cursor-pointer min-h-[140px]"
                            >
                                <div className="w-12 h-12 rounded-xl bg-stone-100/90 text-vd-forest flex items-center justify-center group-hover:bg-vd-forest/10 group-hover:scale-105 transition-all duration-200">
                                    <Icon className="h-6 w-6" />
                                </div>
                                <span className="text-xs sm:text-sm font-semibold tracking-tight text-stone-800 group-hover:text-vd-forest transition-colors text-center">
                                    {r.title}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Compact Footer */}
                <p className="text-center text-stone-400 text-xs mt-8 sm:mt-10 font-normal">
                    © {new Date().getFullYear()} VAIDIDEA Healthcare. All rights reserved.
                </p>
            </div>
        </div>
    );
}
