'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Lock,
    ShieldCheck,
    Calendar,
    FileText,
    Sparkles,
    ArrowRight,
    X,
    UserCheck,
    Microscope,
    Pill,
    Bookmark,
    Activity,
    HeartPulse,
} from 'lucide-react';
import type { AuthGateActionType } from '@/hooks/useAuthGate';

export interface AuthGateModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    actionType?: AuthGateActionType;
    returnUrl?: string;
}

export default function AuthGateModal({
    isOpen,
    onClose,
    title = 'Account Required',
    description = 'Sign in or create a free patient account to complete this action and access your healthcare dashboard.',
    actionType = 'general',
    returnUrl,
}: AuthGateModalProps) {
    const router = useRouter();
    const pathname = usePathname();

    if (!isOpen) return null;

    const targetReturnUrl = returnUrl || pathname || '/patient';
    const loginUrl = `/login/patient?redirect=${encodeURIComponent(targetReturnUrl)}`;
    const registerUrl = `/register/patient?redirect=${encodeURIComponent(targetReturnUrl)}`;

    const handleLogin = () => {
        onClose();
        router.push(loginUrl);
    };

    const handleRegister = () => {
        onClose();
        router.push(registerUrl);
    };

    const getFeatureBadge = () => {
        switch (actionType) {
            case 'book_appointment':
                return {
                    icon: Calendar,
                    label: 'Appointment Booking',
                    sub: 'Your selected doctor, date, and time slot will be preserved.',
                };
            case 'diagnostic_booking':
                return {
                    icon: Microscope,
                    label: 'Diagnostic Lab Test',
                    sub: 'Schedule home sample collections and lab test appointments.',
                };
            case 'pharmacy_order':
                return {
                    icon: Pill,
                    label: 'Pharmacy Order',
                    sub: 'Order prescription medicines and doorstep healthcare supplies.',
                };
            case 'health_record':
                return {
                    icon: FileText,
                    label: 'Health Records & Prescriptions',
                    sub: 'Secure, 256-bit encrypted storage for your medical history.',
                };
            case 'record_vital':
                return {
                    icon: Activity,
                    label: 'Continuous Vital Metrics',
                    sub: 'Log blood pressure, glucose, SpO2, and heart rate for clinical monitoring.',
                };
            case 'community_ask':
                return {
                    icon: Sparkles,
                    label: 'Community Q&A',
                    sub: 'Ask questions and get verified answers from specialist doctors.',
                };
            case 'community_bookmark':
                return {
                    icon: Bookmark,
                    label: 'Saved Health Discussions',
                    sub: 'Save verified medical discussions to reference anytime from your profile.',
                };
            case 'health_card':
                return {
                    icon: HeartPulse,
                    label: 'Digital Health Card',
                    sub: 'Instant emergency QR check-in linked to your patient identity.',
                };
            default:
                return {
                    icon: UserCheck,
                    label: 'Personalized Healthcare',
                    sub: 'Access teleconsultations, prescriptions, and medical records.',
                };
        }
    };

    const badge = getFeatureBadge();
    const BadgeIcon = badge.icon;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-[2rem] max-w-md w-full p-6 sm:p-8 shadow-2xl border border-stone-200 relative overflow-hidden text-center space-y-6"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Background Ambient Glow */}
                <div className="absolute -top-16 -right-16 w-36 h-36 bg-emerald-100/60 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-teal-100/60 rounded-full blur-2xl pointer-events-none" />

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute right-4 top-4 p-2 text-stone-400 hover:text-stone-700 rounded-full hover:bg-stone-100 transition-colors cursor-pointer"
                    aria-label="Close modal"
                >
                    <X className="w-4 h-4" />
                </button>

                {/* Icon Header */}
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 text-vd-forest border border-emerald-200/80 flex items-center justify-center mx-auto shadow-xs">
                    <Lock className="w-7 h-7 text-vd-forest" />
                </div>

                {/* Text Content */}
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-vd-forest text-[11px] font-bold uppercase tracking-wider border border-emerald-200/70">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Sign In Required</span>
                    </div>
                    <h3 className="font-heading font-extrabold text-xl sm:text-2xl text-stone-900 leading-tight">
                        {title}
                    </h3>
                    <p className="text-xs text-stone-600 font-light leading-relaxed max-w-sm mx-auto">
                        {description}
                    </p>
                </div>

                {/* Action Context Box */}
                <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center gap-3 text-left">
                    <div className="w-9 h-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center shrink-0 shadow-2xs">
                        <BadgeIcon className="w-4 h-4 text-vd-forest" />
                    </div>
                    <div>
                        <p className="text-xs font-bold text-stone-900 leading-tight">
                            {badge.label}
                        </p>
                        <p className="text-[11px] text-stone-500 font-light leading-snug mt-0.5">
                            {badge.sub}
                        </p>
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="space-y-2.5 pt-1">
                    <button
                        onClick={handleLogin}
                        className="w-full py-3.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-2xl font-bold text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <span>Sign In to Continue</span>
                        <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="flex items-center justify-between gap-3 text-xs">
                        <button
                            onClick={handleRegister}
                            className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl font-semibold transition-all cursor-pointer"
                        >
                            Create New Account
                        </button>
                        <button
                            onClick={onClose}
                            className="flex-1 py-2.5 text-stone-500 hover:text-stone-800 font-medium transition-colors cursor-pointer"
                        >
                            Continue Exploring
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
