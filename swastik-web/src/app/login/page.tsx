'use client';

import React from 'react';
import Link from 'next/link';
import {
    Stethoscope,
    Building2,
    Pill,
    Building,
    Microscope,
    Dumbbell,
    ArrowLeft
} from 'lucide-react';

const ROLES = [
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
        <div className="min-h-screen relative flex flex-col items-center justify-center bg-[#050505] overflow-hidden font-sans text-slate-200 py-12 px-4">
            {/* Dynamic Animated Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-vd-forest/20 blur-[120px] mix-blend-screen animate-pulse duration-10000" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-teal-900/20 blur-[150px] mix-blend-screen animate-pulse duration-7000 delay-1000" />
            </div>

            <div className="w-full max-w-4xl z-10">
                {/* Back to Home */}
                <Link
                    href="/"
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white mb-8 transition-colors font-medium text-sm mx-auto w-full justify-center"
                >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Return to Ecosystem</span>
                </Link>

                <div className="text-center mb-10">
                    <h1 className="text-3xl md:text-4xl font-semibold text-white tracking-tight mb-2">Select Your Role</h1>
                    <p className="text-white/50 text-sm md:text-base font-light">Choose your provider portal to continue</p>
                </div>

                {/* Role Tabs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
                    {ROLES.map((r) => {
                        const Icon = r.icon;
                        
                        return (
                            <Link
                                key={r.id}
                                href={`/login/${r.id}`}
                                className="flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-white/20 transition-all duration-300 group"
                            >
                                <div className="p-4 rounded-xl bg-white/5 text-white/50 group-hover:bg-gradient-to-br group-hover:from-gray-200 group-hover:to-white group-hover:text-black group-hover:shadow-lg transition-all duration-300">
                                    <Icon className="h-8 w-8" />
                                </div>
                                <span className="text-sm font-medium tracking-wide text-white/60 group-hover:text-white transition-colors text-center">
                                    {r.title}
                                </span>
                            </Link>
                        );
                    })}
                </div>

                {/* Footer */}
                <p className="text-center text-white/30 text-sm mt-12 font-light">
                    © {new Date().getFullYear()} VAIDIDEA Healthcare. All rights reserved.
                </p>
            </div>
        </div>
    );
}
