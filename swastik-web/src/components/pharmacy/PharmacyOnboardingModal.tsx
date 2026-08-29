'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Store, CheckCircle2, Circle, ArrowRight, X,
    Sparkles, ShieldCheck, Truck, Boxes, Network, Clock
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePharmacyStore } from '@/stores/pharmacyStore';

interface PharmacyOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PharmacyOnboardingModal({
    isOpen,
    onClose,
}: PharmacyOnboardingModalProps) {
    const router = useRouter();
    const {
        profileCompletion,
        updateDashboardPreferences,
    } = usePharmacyStore();

    const [submitting, setSubmitting] = useState(false);

    if (!isOpen || !profileCompletion) return null;

    const {
        percentage = 0,
        nextStep,
        sections = [],
    } = profileCompletion;

    const handleStartSetup = async () => {
        setSubmitting(true);
        try {
            await updateDashboardPreferences({ onboarding_completed: true });
            onClose();
            if (nextStep?.route) {
                router.push(nextStep.route);
            } else {
                router.push('/pharmacy/settings?category=profile');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDismiss = async () => {
        setSubmitting(true);
        try {
            if (typeof window !== 'undefined') {
                localStorage.setItem('swastik_pharmacy_onboarding_dismissed', 'true');
            }
            await updateDashboardPreferences({
                onboarding_completed: true,
                show_profile_completion: false,
            });
            onClose();
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
        >
            <Card
                padding="lg"
                className="w-full max-w-xl bg-white dark:bg-[#111c2e] border border-orange-200/80 dark:border-orange-900/60 shadow-2xl rounded-3xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            >
                {/* Header with warm orange gradient */}
                <div className="relative -mx-6 -mt-6 p-6 bg-gradient-to-r from-orange-600 via-orange-500 to-amber-600 text-white flex items-start justify-between">
                    <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-inner shrink-0">
                            <Store className="w-6 h-6" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-lg font-black text-white">
                                    Welcome to Your Pharmacy Portal
                                </h2>
                                <span className="p-1 rounded-full bg-white/20 text-white">
                                    <Sparkles className="w-3.5 h-3.5" />
                                </span>
                            </div>
                            <p className="text-xs text-orange-100 font-medium mt-0.5">
                                Let&apos;s get your pharmacy ready to receive and fulfill orders.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleDismiss}
                        disabled={submitting}
                        className="p-1.5 rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition"
                        aria-label="Close modal"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="py-5 space-y-5">
                    {/* Setup Progress */}
                    <div className="p-4 rounded-2xl bg-orange-50/60 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-gray-900 dark:text-gray-100">Setup Completion</span>
                            <span className="text-orange-600 dark:text-orange-400 font-extrabold">{percentage}% Complete</span>
                        </div>
                        <div className="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(percentage, 8)}%` }}
                            />
                        </div>
                    </div>

                    {/* Step-by-Step Milestones */}
                    <div className="space-y-2.5">
                        <p className="text-xs font-extrabold text-gray-900 dark:text-gray-100">
                            Recommended Setup Milestones:
                        </p>
                        <div className="space-y-2">
                            {sections.map((section, idx) => (
                                <div
                                    key={section.id}
                                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                                        section.completed
                                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                                            : 'bg-gray-50 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center gap-2.5 min-w-0">
                                        <span className="text-[11px] font-bold text-gray-400 w-4 text-center">
                                            {idx + 1}.
                                        </span>
                                        {section.completed ? (
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                        ) : (
                                            <Circle className="w-4 h-4 text-gray-300 dark:text-gray-600 shrink-0" />
                                        )}
                                        <span className="font-bold truncate">{section.title}</span>
                                    </div>
                                    <span className="text-[10px] font-semibold text-gray-400 shrink-0">
                                        {section.completed ? 'Complete' : 'Pending'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                    <Button
                        variant="ghost"
                        onClick={handleDismiss}
                        disabled={submitting}
                        className="text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                        Maybe Later
                    </Button>

                    <Button
                        onClick={handleStartSetup}
                        isLoading={submitting}
                        disabled={submitting}
                        rightIcon={<ArrowRight className="w-4 h-4" />}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-orange-600/20 px-5"
                    >
                        Start Setup →
                    </Button>
                </div>
            </Card>
        </div>
    );
}
