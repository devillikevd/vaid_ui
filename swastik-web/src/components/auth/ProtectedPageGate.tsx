'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    Lock,
    ShieldCheck,
    Calendar,
    FileText,
    ArrowRight,
    QrCode,
    CreditCard,
    Stethoscope,
    Sparkles
} from 'lucide-react';

interface ProtectedPageGateProps {
    title?: string;
    subtitle?: string;
    pageType?: 'appointments' | 'records' | 'health_card' | 'health_id' | 'assistant' | 'general';
}

export default function ProtectedPageGate({
    title,
    subtitle,
    pageType = 'general',
}: ProtectedPageGateProps) {
    const pathname = usePathname();
    const loginUrl = `/login/patient?redirect=${encodeURIComponent(pathname || '/patient')}`;
    const registerUrl = `/register/patient?redirect=${encodeURIComponent(pathname || '/patient')}`;

    const getConfig = () => {
        switch (pageType) {
            case 'appointments':
                return {
                    icon: Calendar,
                    defaultTitle: 'Sign In to View Your Appointments',
                    defaultSubtitle:
                        'Access your upcoming teleconsultations, hospital visits, and clinical doctor schedules in one secure place.',
                    badge: 'Confidential Appointments',
                };
            case 'records':
                return {
                    icon: FileText,
                    defaultTitle: 'Sign In to Access Your Health Records',
                    defaultSubtitle:
                        'View and upload your clinical prescriptions, lab results, discharge summaries, and vital metrics.',
                    badge: 'Encrypted Medical Records',
                };
            case 'health_card':
                return {
                    icon: QrCode,
                    defaultTitle: 'Sign In for Your Digital Health Card',
                    defaultSubtitle:
                        'Your Vaididea Digital Health Card and emergency QR token are linked directly to your verified patient profile.',
                    badge: 'Vaididea Health Card',
                };
            case 'health_id':
                return {
                    icon: CreditCard,
                    defaultTitle: 'Sign In to Link Your ABHA Health ID',
                    defaultSubtitle:
                        'Connect your 14-digit Ayushman Bharat Health Account (ABHA) to sync records across the ABDM ecosystem.',
                    badge: 'ABDM ABHA Health ID',
                };
            case 'assistant':
                return {
                    icon: Sparkles,
                    defaultTitle: 'Sign In for AI Health Assistant',
                    defaultSubtitle:
                        'Get personalized, evidence-based symptom triage and clinical guidance tailored to your health history.',
                    badge: 'AI Health Assistant',
                };
            default:
                return {
                    icon: Lock,
                    defaultTitle: 'Account Required',
                    defaultSubtitle:
                        'Sign in or create a patient account to access your personal healthcare information.',
                    badge: 'Protected Patient Area',
                };
        }
    };

    const config = getConfig();
    const Icon = config.icon;

    return (
        <div className="min-h-[70vh] flex items-center justify-center p-4">
            <div className="bg-white rounded-[2.5rem] p-8 sm:p-12 border border-stone-200 shadow-xl max-w-xl w-full text-center space-y-6 relative overflow-hidden">
                {/* Background Ambient Glows */}
                <div className="absolute -top-20 -right-20 w-48 h-48 bg-emerald-100/50 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-teal-100/50 rounded-full blur-3xl pointer-events-none" />

                {/* Badge */}
                <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-vd-forest text-xs font-bold uppercase tracking-wider border border-emerald-200">
                    <ShieldCheck className="w-4 h-4" />
                    <span>{config.badge}</span>
                </div>

                {/* Icon */}
                <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/50 text-vd-forest border border-emerald-200 flex items-center justify-center mx-auto shadow-sm">
                    <Icon className="w-10 h-10 text-vd-forest" />
                </div>

                {/* Headings */}
                <div className="space-y-2 max-w-md mx-auto">
                    <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-stone-900 leading-tight">
                        {title || config.defaultTitle}
                    </h2>
                    <p className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed">
                        {subtitle || config.defaultSubtitle}
                    </p>
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-3 max-w-sm mx-auto">
                    <Link
                        href={loginUrl}
                        className="w-full py-3.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-2xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                    >
                        <span>Sign In / Login</span>
                        <ArrowRight className="w-4 h-4" />
                    </Link>

                    <div className="flex items-center justify-between gap-3 text-xs">
                        <Link
                            href={registerUrl}
                            className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-semibold transition-all text-center"
                        >
                            Create Account
                        </Link>
                        <Link
                            href="/patient/doctors"
                            className="flex-1 py-2.5 text-stone-600 hover:text-vd-forest font-semibold transition-colors text-center inline-flex items-center justify-center gap-1"
                        >
                            <Stethoscope className="w-3.5 h-3.5" />
                            <span>Find Doctors</span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
