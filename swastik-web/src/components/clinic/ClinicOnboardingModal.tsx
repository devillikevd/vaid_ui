'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    Sparkles,
    Check,
    ArrowRight,
    X,
    Building2,
    Clock,
    Users,
    ShieldCheck,
    CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useClinicStore } from '@/stores/clinicStore';
import { cn } from '@/lib/utils';

interface ClinicOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    clinicName?: string;
}

export function ClinicOnboardingModal({
    isOpen,
    onClose,
    clinicName = 'Clinic'
}: ClinicOnboardingModalProps) {
    const router = useRouter();
    const {
        profileCompletion,
        updateDashboardPreferences
    } = useClinicStore();

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                handleDismiss();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen || !profileCompletion) return null;

    const {
        percentage,
        completedSectionsCount,
        totalSectionsCount,
        nextStep,
        sections,
        isComplete
    } = profileCompletion;

    const handleDismiss = async () => {
        await updateDashboardPreferences({ onboarding_completed: true });
        onClose();
    };

    const handleStartSetup = async () => {
        await updateDashboardPreferences({ onboarding_completed: true });
        onClose();
        if (nextStep) {
            router.push(nextStep.route);
        } else {
            router.push('/clinic/settings');
        }
    };

    const getSectionIcon = (sectionId: string) => {
        switch (sectionId) {
            case 'general_profile':
                return <Building2 className="w-4 h-4" />;
            case 'clinical_setup':
                return <Users className="w-4 h-4" />;
            case 'working_hours':
                return <Clock className="w-4 h-4" />;
            case 'verification_legal':
                return <ShieldCheck className="w-4 h-4" />;
            default:
                return <Sparkles className="w-4 h-4" />;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full border border-gray-100 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header Banner */}
                <div className="p-6 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-pink-500/5 dark:from-pink-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border-b border-pink-100 dark:border-pink-900/30 relative">
                    <button
                        type="button"
                        onClick={handleDismiss}
                        className="absolute top-4 right-4 p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
                        aria-label="Close onboarding modal"
                    >
                        <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-extrabold text-gray-900 dark:text-white">
                                Welcome to {clinicName} 👋
                            </h3>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Let's get your clinic ready for patients and daily operations.
                            </p>
                        </div>
                    </div>

                    {/* Progress */}
                    <div className="mt-4 space-y-1.5">
                        <div className="flex items-center justify-between text-xs font-bold text-gray-700 dark:text-gray-300">
                            <span>Setup Progress</span>
                            <span className="text-pink-600 dark:text-pink-400">{percentage}% Complete</span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Checklist Body */}
                <div className="p-6 overflow-y-auto custom-scrollbar space-y-3">
                    <p className="text-xs font-extrabold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                        Setup Milestones ({completedSectionsCount} of {totalSectionsCount} Completed)
                    </p>

                    <div className="space-y-2">
                        {sections.map(section => {
                            return (
                                <div
                                    key={section.id}
                                    className={cn(
                                        'p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all',
                                        section.completed
                                            ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
                                            : 'bg-gray-50/70 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200'
                                    )}
                                >
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={cn(
                                            'w-8 h-8 rounded-xl flex items-center justify-center shrink-0',
                                            section.completed
                                                ? 'bg-emerald-500 text-white'
                                                : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                        )}>
                                            {section.completed ? <Check className="w-4 h-4" /> : getSectionIcon(section.id)}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-xs font-extrabold leading-tight truncate">{section.label}</p>
                                            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                                {section.completed
                                                    ? 'Completed'
                                                    : section.tasks.find(t => !t.completed)?.description || 'Pending setup'}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 shrink-0">
                                        {section.percentage}% / {section.weight}%
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Action Footer */}
                <div className="p-4 bg-gray-50/80 dark:bg-gray-900/80 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between gap-3">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDismiss}
                        className="text-xs font-bold text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    >
                        Maybe Later
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleStartSetup}
                        className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl cursor-pointer shadow-sm"
                    >
                        {isComplete ? 'Go to Settings' : 'Start Setup'}
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
