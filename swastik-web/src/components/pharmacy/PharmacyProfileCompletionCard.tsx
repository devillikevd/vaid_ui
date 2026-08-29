'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    CheckCircle2, Circle, ArrowRight, X, AlertCircle,
    Store, FileText, Truck, Boxes, Network, Check, Settings,
    ChevronDown, ChevronUp
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { PharmacyProfileCompletion } from '@/lib/api';

interface PharmacyProfileCompletionCardProps {
    variant?: 'dashboard' | 'settings';
    className?: string;
    completionData?: PharmacyProfileCompletion | null;
}

const SECTION_ICONS: Record<string, React.ElementType> = {
    pharmacy_profile: Store,
    license_compliance: FileText,
    operations_fulfillment: Truck,
    inventory_catalog: Boxes,
    network_services: Network,
};

export function PharmacyProfileCompletionCard({
    variant = 'dashboard',
    className = '',
    completionData,
}: PharmacyProfileCompletionCardProps) {
    const {
        profileCompletion: storeCompletion,
        updateDashboardPreferences,
    } = usePharmacyStore();

    const [showHideConfirm, setShowHideConfirm] = useState(false);
    const [isHiding, setIsHiding] = useState(false);
    const [isExpanded, setIsExpanded] = useState(variant === 'settings');

    const completion = completionData || storeCompletion;

    if (!completion) return null;

    const {
        percentage = 0,
        isComplete = false,
        completedSectionsCount = 0,
        totalSectionsCount = 5,
        nextStep,
        sections = [],
    } = completion;

    const handleConfirmHide = async () => {
        setIsHiding(true);
        try {
            await updateDashboardPreferences({ show_profile_completion: false });
            setShowHideConfirm(false);
        } finally {
            setIsHiding(false);
        }
    };

    // Compact Success State for 100% completion
    if (isComplete && variant === 'dashboard') {
        return (
            <Card
                className={`overflow-hidden border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-50/80 via-white to-teal-50/80 dark:from-[#0a1f18] dark:via-[#0c1824] dark:to-[#091e1c] shadow-xs rounded-2xl ${className}`}
            >
                <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="font-extrabold text-xs text-gray-900 dark:text-gray-100">
                                    ✓ Pharmacy Profile Complete
                                </h3>
                                <span className="text-[9px] font-black px-1.5 py-0.2 rounded-md bg-emerald-100 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    100%
                                </span>
                            </div>
                            <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                                Your pharmacy is fully configured and ready to receive and fulfill orders.
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <Link href="/pharmacy/profile">
                            <Button size="sm" variant="outline" className="text-xs font-bold rounded-xl h-8 px-3">
                                View Profile
                            </Button>
                        </Link>
                    </div>
                </div>
            </Card>
        );
    }

    return (
        <div className="relative w-full">
            <Card
                className={`overflow-hidden border border-orange-200/80 dark:border-orange-900/40 bg-gradient-to-r from-orange-50/40 via-white to-orange-50/20 dark:from-[#111c2e] dark:via-[#131722] dark:to-[#0f172a] shadow-xs rounded-2xl ${className}`}
            >
                {/* Thin Full-Width Banner */}
                <div className="p-3.5 sm:p-4 space-y-2.5">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <div className="p-1.5 rounded-lg bg-orange-100 dark:bg-orange-950/80 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/60 shrink-0">
                                <Store className="w-4 h-4" />
                            </div>
                            <div className="flex items-center gap-2 min-w-0 flex-wrap">
                                <h2 className="text-xs font-extrabold text-gray-900 dark:text-gray-100">
                                    Pharmacy Profile
                                </h2>
                                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-md bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                                    {percentage}%
                                </span>
                                <span className="text-gray-300 dark:text-gray-700 hidden sm:inline">•</span>
                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate hidden sm:inline">
                                    Complete your pharmacy setup to start receiving orders
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="text-[11px] font-bold text-gray-500 hover:text-orange-600 dark:text-gray-400 dark:hover:text-orange-400 flex items-center gap-1 px-2 py-0.5 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950/40 transition"
                            >
                                <span>{isExpanded ? 'Hide Checklist' : 'View Checklist'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {variant === 'dashboard' && (
                                <button
                                    onClick={() => setShowHideConfirm(true)}
                                    className="text-[11px] font-medium text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-2 py-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                >
                                    Hide
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Inline Progress Bar Row */}
                    <div className="flex items-center gap-3">
                        <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 shrink-0">
                            {completedSectionsCount} of {totalSectionsCount} milestones completed
                        </span>
                        <div className="h-1.5 flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(percentage, 5)}%` }}
                            />
                        </div>
                        <span className="text-[11px] font-black text-orange-600 dark:text-orange-400 shrink-0">
                            {percentage}%
                        </span>
                    </div>

                    {/* Next Action Row */}
                    {nextStep && (
                        <div className="pt-2 border-t border-orange-100/60 dark:border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 shrink-0">Next:</span>
                                <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                                    {nextStep.label}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <Link href={nextStep.route}>
                                    <Button
                                        size="sm"
                                        className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl h-7 px-3 shadow-xs shadow-orange-600/20"
                                    >
                                        Continue Setup →
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Expandable Checklist Details */}
                    {isExpanded && (
                        <div className="pt-2 border-t border-gray-100 dark:border-gray-800 space-y-2 animate-in fade-in duration-200">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                                {sections.map((section) => (
                                    <div
                                        key={section.id}
                                        className={`p-2 rounded-xl border transition-all ${
                                            section.completed
                                                ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-200'
                                                : 'bg-white dark:bg-[#111c2e] border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-1">
                                            <div className="flex items-center gap-1.5 min-w-0">
                                                {section.completed ? (
                                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                ) : (
                                                    <Circle className="w-3.5 h-3.5 text-gray-300 dark:text-gray-600 shrink-0" />
                                                )}
                                                <span className="text-[11px] font-bold truncate">
                                                    {section.title}
                                                </span>
                                            </div>
                                            <span className={`text-[9px] font-black px-1 py-0.2 rounded shrink-0 ${
                                                section.completed
                                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                                            }`}>
                                                {section.percentage}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </Card>

            {/* Confirmation Modal to Hide Setup Progress */}
            {showHideConfirm && (
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                    <Card padding="lg" className="w-full max-w-sm bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-2xl shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 shrink-0">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-extrabold text-sm text-gray-900 dark:text-gray-100">
                                    Hide setup progress?
                                </h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                                    You can restore this card anytime from Pharmacy Settings.
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setShowHideConfirm(false)}
                                disabled={isHiding}
                                className="text-xs font-bold rounded-xl"
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleConfirmHide}
                                isLoading={isHiding}
                                disabled={isHiding}
                                className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl"
                            >
                                Hide Card
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
