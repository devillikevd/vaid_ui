'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    Sparkles,
    CheckCircle2,
    Circle,
    ArrowRight,
    MoreVertical,
    EyeOff,
    Check,
    AlertCircle,
    ChevronRight,
    Building2,
    Clock,
    Users,
    ShieldCheck
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useClinicStore } from '@/stores/clinicStore';
import { ClinicProfileCompletion } from '@/lib/api';
import { cn } from '@/lib/utils';

interface ClinicProfileCompletionCardProps {
    variant?: 'dashboard' | 'settings';
    clinicName?: string;
    className?: string;
    onSectionClick?: (sectionId: string) => void;
}

export function ClinicProfileCompletionCard({
    variant = 'dashboard',
    clinicName,
    className = '',
    onSectionClick
}: ClinicProfileCompletionCardProps) {
    const router = useRouter();
    const {
        profileCompletion,
        dashboardPreferences,
        updateDashboardPreferences
    } = useClinicStore();

    const [showMenu, setShowMenu] = useState(false);
    const [showHideModal, setShowHideModal] = useState(false);
    const [isHiding, setIsHiding] = useState(false);

    if (!profileCompletion) return null;

    const {
        percentage,
        completedSectionsCount,
        totalSectionsCount,
        isComplete,
        nextStep,
        sections,
        summary
    } = profileCompletion;

    const handleHideFromDashboard = async () => {
        setIsHiding(true);
        try {
            await updateDashboardPreferences({ show_profile_completion: false });
            setShowHideModal(false);
            setShowMenu(false);
        } finally {
            setIsHiding(false);
        }
    };

    const getSectionIcon = (sectionId: string) => {
        switch (sectionId) {
            case 'general_profile':
                return <Building2 className="w-3.5 h-3.5" />;
            case 'clinical_setup':
                return <Users className="w-3.5 h-3.5" />;
            case 'working_hours':
                return <Clock className="w-3.5 h-3.5" />;
            case 'verification_legal':
                return <ShieldCheck className="w-3.5 h-3.5" />;
            default:
                return <Sparkles className="w-3.5 h-3.5" />;
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // VARIANT: DASHBOARD COMPACT CARD
    // ──────────────────────────────────────────────────────────────────────────
    if (variant === 'dashboard') {
        // If 100% complete, show a celebratory state
        if (isComplete) {
            return (
                <div className={cn('p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 backdrop-blur-sm relative', className)}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                                <Check className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h4 className="text-xs font-extrabold text-gray-900 dark:text-white">Clinic setup complete 🎉</h4>
                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                                        100%
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                                    Your clinic profile and clinical operations are fully configured and ready for patients.
                                </p>
                            </div>
                        </div>
                        <Link href="/clinic/settings">
                            <Button size="sm" variant="outline" className="text-xs font-bold rounded-xl shrink-0">
                                View Settings
                            </Button>
                        </Link>
                    </div>
                </div>
            );
        }

        return (
            <>
                <div className={cn('p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-pink-500/10 via-purple-500/5 to-transparent border border-pink-500/20 dark:border-pink-500/25 backdrop-blur-sm relative group', className)}>
                    <div className="flex flex-col gap-3.5">
                        {/* Header Row */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                                <div className="flex items-center justify-center h-8 w-8 rounded-xl bg-pink-500/15 text-pink-600 dark:text-pink-400 shrink-0">
                                    <Sparkles className="h-4 w-4" />
                                </div>
                                <div>
                                    <h4 className="text-xs font-extrabold text-gray-900 dark:text-white">Clinic Setup</h4>
                                    <p className="text-[11px] text-gray-500 dark:text-gray-400">{summary}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 px-2.5 py-1 rounded-full border border-pink-200 dark:border-pink-800/60">
                                    {percentage}% Complete
                                </span>

                                {/* Options Menu */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        aria-label="Setup widget options"
                                        onClick={() => setShowMenu(!showMenu)}
                                        className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                    >
                                        <MoreVertical className="w-4 h-4" />
                                    </button>

                                    {showMenu && (
                                        <>
                                            <div className="fixed inset-0 z-20" onClick={() => setShowMenu(false)} />
                                            <div className="absolute right-0 mt-1 w-48 rounded-xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-lg py-1 z-30 text-xs">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setShowMenu(false);
                                                        setShowHideModal(true);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                                >
                                                    <EyeOff className="w-3.5 h-3.5 text-gray-400" />
                                                    Hide setup progress
                                                </button>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full bg-gray-200 dark:bg-gray-800 h-2 rounded-full overflow-hidden" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100} aria-label={`Clinic setup ${percentage}% complete`}>
                            <div
                                className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${percentage}%` }}
                            />
                        </div>

                        {/* Next Action & CTA */}
                        {nextStep && (
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                    <span className="font-bold text-gray-900 dark:text-white">Next: </span>
                                    {nextStep.label}
                                </div>
                                <Button
                                    size="sm"
                                    onClick={() => router.push(nextStep.route)}
                                    className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl self-start sm:self-auto cursor-pointer"
                                >
                                    Continue Setup
                                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Hide Confirmation Modal */}
                {showHideModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
                        <div className="bg-white dark:bg-gray-900 rounded-2xl max-w-sm w-full p-6 border border-gray-100 dark:border-gray-800 shadow-2xl space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
                                    <EyeOff className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Hide setup progress?</h4>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                        You can re-enable this anytime from Settings &gt; General.
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowHideModal(false)}
                                    className="rounded-xl text-xs font-bold"
                                    disabled={isHiding}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleHideFromDashboard}
                                    className="bg-gray-900 hover:bg-black dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-xl text-xs font-bold"
                                    disabled={isHiding}
                                >
                                    {isHiding ? 'Hiding...' : 'Hide'}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </>
        );
    }

    // ──────────────────────────────────────────────────────────────────────────
    // VARIANT: SETTINGS OVERVIEW BANNER
    // ──────────────────────────────────────────────────────────────────────────
    return (
        <div className={cn('p-5 rounded-2xl bg-gradient-to-r from-pink-50 via-purple-50 to-pink-50/50 dark:from-pink-950/20 dark:via-purple-950/20 dark:to-pink-950/10 border border-pink-100 dark:border-pink-900/30 space-y-4', className)}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <h2 className="text-base font-extrabold text-gray-900 dark:text-white flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                            Clinic Profile
                        </h2>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-pink-100 dark:bg-pink-900/50 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/40">
                            {percentage}% Complete
                        </span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                        {isComplete
                            ? 'Your clinic profile is 100% complete and fully operational.'
                            : 'Complete your clinic setup to get the most out of Vaididea.'}
                    </p>
                </div>
                {clinicName && (
                    <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-800/40 shadow-xs self-start sm:self-auto">
                        {clinicName}
                    </span>
                )}
            </div>

            {/* Progress Bar */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400">
                    <span>{summary}</span>
                    <span>{completedSectionsCount} of {totalSectionsCount} milestones</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden" role="progressbar" aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}>
                    <div
                        className="h-full bg-gradient-to-r from-pink-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>

            {/* Milestone Checklist Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                {sections.map(section => {
                    const isClickable = !section.completed;
                    return (
                        <div
                            key={section.id}
                            onClick={() => {
                                if (onSectionClick) {
                                    onSectionClick(section.id);
                                } else {
                                    router.push(section.route);
                                }
                            }}
                            className={cn(
                                'p-3 rounded-xl border flex items-center justify-between gap-2 transition-all',
                                section.completed
                                    ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-300'
                                    : 'bg-white/80 dark:bg-gray-800/80 border-gray-200 dark:border-gray-700/60 hover:border-pink-300 dark:hover:border-pink-700 cursor-pointer text-gray-800 dark:text-gray-200 shadow-2xs'
                            )}
                        >
                            <div className="flex items-center gap-2.5 min-w-0">
                                <div className={cn(
                                    'w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs',
                                    section.completed
                                        ? 'bg-emerald-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                )}>
                                    {section.completed ? <Check className="w-3.5 h-3.5" /> : getSectionIcon(section.id)}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-extrabold truncate">{section.label}</p>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                        {section.completed ? 'Completed' : `${section.percentage}% / ${section.weight}%`}
                                    </p>
                                </div>
                            </div>
                            {!section.completed && (
                                <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Next Recommended Step CTA */}
            {nextStep && !isComplete && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-white/70 dark:bg-gray-900/70 border border-pink-200 dark:border-pink-900/40">
                    <div className="space-y-0.5">
                        <p className="text-xs font-extrabold text-gray-900 dark:text-white flex items-center gap-1.5">
                            <span className="inline-block w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
                            Next Recommended: {nextStep.label}
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400">{nextStep.description}</p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => router.push(nextStep.route)}
                        className="bg-pink-600 hover:bg-pink-700 text-white font-extrabold text-xs rounded-xl shrink-0 cursor-pointer"
                    >
                        Continue Setup
                        <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                </div>
            )}
        </div>
    );
}
