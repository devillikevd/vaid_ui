'use client';

import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, ChevronRight, Sparkles, ArrowRight, X } from 'lucide-react';
import { DoctorProfile } from '@/stores/doctorStore';
import Link from 'next/link';

interface OnboardingChecklistProps {
    profile: DoctorProfile;
    variant?: 'card' | 'reminder';
    className?: string;
    allowDismiss?: boolean;
}

export function getProfileCompletionTasks(profile?: DoctorProfile | null) {
    if (!profile) return { tasks: [], completedCount: 0, completion: 0, missingTasks: [], isComplete: false };

    const tasks = [
        {
            id: 'photo',
            label: 'Upload Profile Photo',
            isComplete: Boolean(profile.profile_image_url),
            href: '/doctor/settings',
        },
        {
            id: 'fees',
            label: 'Setup Consultation Fees',
            isComplete: Boolean((profile.consultation_fee && profile.consultation_fee > 0) || (profile.video_consultation_fee && profile.video_consultation_fee > 0)),
            href: '/doctor/settings',
        },
        {
            id: 'availability',
            label: 'Add Weekly Availability',
            isComplete: Boolean(
                (profile as any).available_days?.length > 0 ||
                (profile as any).available_hours ||
                (profile.clinic_affiliations && profile.clinic_affiliations.length > 0) ||
                (profile.hospital_affiliations && profile.hospital_affiliations.length > 0) ||
                profile.hospital_id
            ),
            href: '/doctor/schedule',
        },
        {
            id: 'intro_video',
            label: 'Upload Intro Video (Optional)',
            isComplete: Boolean(profile.intro_video_url),
            href: '/doctor/settings',
        }
    ];

    const completedCount = tasks.filter(t => t.isComplete).length;
    const completion = Math.round((completedCount / tasks.length) * 100);
    const missingTasks = tasks.filter(t => !t.isComplete);

    return {
        tasks,
        completedCount,
        completion,
        missingTasks,
        isComplete: completion === 100,
    };
}

export function OnboardingChecklist({
    profile,
    variant = 'card',
    className = '',
    allowDismiss = true
}: OnboardingChecklistProps) {
    const [isDismissed, setIsDismissed] = useState(false);

    useEffect(() => {
        if (typeof window !== 'undefined' && profile?.id) {
            const dismissed = sessionStorage.getItem(`doctor_profile_reminder_dismissed_${profile.id}`);
            if (dismissed === 'true') {
                setIsDismissed(true);
            }
        }
    }, [profile?.id]);

    const handleDismiss = () => {
        setIsDismissed(true);
        if (typeof window !== 'undefined' && profile?.id) {
            sessionStorage.setItem(`doctor_profile_reminder_dismissed_${profile.id}`, 'true');
        }
    };

    const { tasks, completedCount, completion } = getProfileCompletionTasks(profile);

    if (completion === 100 || (variant === 'reminder' && isDismissed)) return null;

    if (variant === 'reminder') {
        return (
            <div className={`p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-500/20 backdrop-blur-sm relative group ${className}`}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start sm:items-center gap-3.5 pr-6 sm:pr-0">
                        <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
                            <Sparkles className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-gray-900 dark:text-white">Complete Your Doctor Profile</h4>
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                    {completion}% Completed
                                </span>
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                                {tasks.length - completedCount} tasks remaining to optimize your patient visibility &amp; trust.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                        <div className="hidden md:flex flex-col w-32">
                            <div className="flex justify-between text-[11px] font-medium text-gray-500 mb-1">
                                <span>Progress</span>
                                <span>{completion}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${completion}%` }} />
                            </div>
                        </div>

                        <Link
                            href="/doctor/settings"
                            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm shadow-emerald-600/20 transition-all shrink-0"
                        >
                            Complete in Settings
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Link>

                        {allowDismiss && (
                            <button
                                type="button"
                                onClick={handleDismiss}
                                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800/80 transition-colors shrink-0"
                                title="Hide reminder for this session"
                                aria-label="Hide reminder"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden ${className}`}>
            <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/30">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-emerald-500" />
                        <h3 className="text-sm font-bold text-gray-900 dark:text-white">Profile Setup &amp; Completion</h3>
                    </div>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{completion}%</span>
                </div>
                <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2 overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${completion}%` }} />
                </div>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {tasks.map(task => (
                    <Link 
                        key={task.id} 
                        href={task.href}
                        className={`flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${task.isComplete ? 'opacity-60' : ''}`}
                    >
                        <div className="flex items-center gap-3">
                            {task.isComplete ? (
                                <CheckCircle2 className="text-emerald-500 h-5 w-5 shrink-0" />
                            ) : (
                                <Circle className="text-gray-300 dark:text-gray-600 h-5 w-5 shrink-0" />
                            )}
                            <span className={`text-sm ${task.isComplete ? 'text-gray-500 line-through' : 'text-gray-900 dark:text-gray-200 font-medium'}`}>
                                {task.label}
                            </span>
                        </div>
                        {!task.isComplete && <ChevronRight className="text-gray-400 h-4 w-4 shrink-0" />}
                    </Link>
                ))}
            </div>
        </div>
    );
}
