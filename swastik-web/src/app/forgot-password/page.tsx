import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import {
    User,
    Stethoscope,
    Building2,
    Pill,
    Building,
    Microscope,
    Dumbbell,
    ArrowLeft,
    KeyRound
} from 'lucide-react';

export const metadata: Metadata = {
    title: 'Forgot Password — Select Account Type | Vaididea',
    description: 'Select your account role to reset your password on the Vaididea healthcare platform.',
    robots: {
        index: false,
        follow: false,
    },
};

const ROLES = [
    { id: 'patient', title: 'Patient', subtitle: 'Personal healthcare account', icon: User },
    { id: 'doctor', title: 'Doctor', subtitle: 'Medical specialist portal', icon: Stethoscope },
    { id: 'hospital', title: 'Hospital', subtitle: 'Hospital administrator', icon: Building2 },
    { id: 'clinic', title: 'Clinic', subtitle: 'Clinical practice manager', icon: Building },
    { id: 'pharmacy', title: 'Pharmacy', subtitle: 'Pharmacy operations', icon: Pill },
    { id: 'diagnostic-center', title: 'Diagnostic Lab', subtitle: 'Pathology & testing center', icon: Microscope },
    { id: 'wellness', title: 'Wellness Coach', subtitle: 'Dietitian & lifestyle coach', icon: Dumbbell },
    { id: 'fitness-center', title: 'Gym & Studio', subtitle: 'Fitness center manager', icon: Building2 },
] as const;

export default function ForgotPasswordRoleSelectorPage() {
    return (
        <div className="min-h-screen relative flex flex-col items-center justify-center bg-[#FAF8F4] overflow-hidden font-sans text-stone-800 py-10 px-4 sm:px-6">
            {/* Background Accents */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-vd-forest/5 blur-3xl" />
                <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-emerald-500/5 blur-3xl" />
            </div>

            <div className="w-full max-w-4xl z-10 flex flex-col items-center">
                {/* Back to Login */}
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-stone-500 hover:text-vd-forest mb-6 transition-colors font-medium text-xs sm:text-sm group cursor-pointer"
                >
                    <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                    <span>Back to Sign In</span>
                </Link>

                {/* Heading */}
                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-vd-forest mx-auto mb-3 shadow-2xs">
                        <KeyRound className="w-6 h-6" />
                    </div>
                    <h1 className="font-heading text-2xl sm:text-3xl md:text-4xl font-bold text-vd-forest tracking-tight mb-1.5">
                        Reset Your Password
                    </h1>
                    <p className="text-stone-500 text-xs sm:text-sm font-normal max-w-md mx-auto">
                        Select the account portal you need to access to receive a recovery OTP.
                    </p>
                </div>

                {/* 4 × 2 Role Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-4 w-full max-w-3xl">
                    {ROLES.map((r) => {
                        const Icon = r.icon;

                        return (
                            <Link
                                key={r.id}
                                href={`/forgot-password/${r.id}`}
                                className="group relative bg-white/95 backdrop-blur-xs rounded-2xl border border-stone-200/80 p-5 flex flex-col items-center text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-md hover:border-vd-forest/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vd-forest cursor-pointer"
                            >
                                <div className="w-12 h-12 rounded-xl bg-stone-100/80 group-hover:bg-emerald-50 text-stone-700 group-hover:text-vd-forest flex items-center justify-center mb-3 transition-colors">
                                    <Icon className="w-6 h-6" />
                                </div>
                                <h2 className="font-bold text-sm text-stone-900 group-hover:text-vd-forest transition-colors mb-0.5">
                                    {r.title}
                                </h2>
                                <p className="text-[11px] text-stone-400 font-light leading-snug">
                                    {r.subtitle}
                                </p>
                            </Link>
                        );
                    })}
                </div>

                {/* Primary Patient Quick CTA */}
                <div className="mt-8 text-center">
                    <p className="text-xs text-stone-500 mb-2">
                        Looking for patient account recovery?
                    </p>
                    <Link
                        href="/forgot-password/patient"
                        className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-vd-forest text-white text-xs font-bold hover:bg-vd-forest-deep transition-all shadow-2xs"
                    >
                        <span>Reset Patient Password</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}
