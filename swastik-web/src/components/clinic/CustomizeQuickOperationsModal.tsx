'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    Check,
    ArrowUp,
    ArrowDown,
    RotateCcw,
    Plus,
    Trash2,
    GripVertical,
    Sliders,
    Sparkles,
    UserPlus,
    Network,
    Calendar,
    Building2,
    Pill,
    Users,
    HeartPulse,
    Clock,
    UserCheck,
    TrendingUp,
    AlertTriangle,
    LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface QuickActionItem {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    category: string;
    href?: string;
    isModal?: boolean;
    colorTheme: {
        bg: string;
        text: string;
        border: string;
        badge: string;
    };
}

export const QUICK_ACTION_REGISTRY: Record<string, QuickActionItem> = {
    invite_doctor: {
        id: 'invite_doctor',
        title: 'Invite Doctor',
        description: 'Add a doctor to your clinic roster',
        icon: UserPlus,
        category: 'Team',
        isModal: true,
        colorTheme: {
            bg: 'bg-pink-50 dark:bg-pink-950/40',
            text: 'text-pink-600 dark:text-pink-400',
            border: 'border-pink-200 dark:border-pink-800/60',
            badge: 'bg-pink-100 text-pink-700 dark:bg-pink-900/50 dark:text-pink-300',
        },
    },
    my_network: {
        id: 'my_network',
        title: 'My Network',
        description: 'Manage doctors and care partners',
        icon: Network,
        category: 'Partners',
        href: '/clinic/network',
        colorTheme: {
            bg: 'bg-purple-50 dark:bg-purple-950/40',
            text: 'text-purple-600 dark:text-purple-400',
            border: 'border-purple-200 dark:border-purple-800/60',
            badge: 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300',
        },
    },
    schedule: {
        id: 'schedule',
        title: 'Schedule',
        description: 'Manage OPD hours & doctor availability',
        icon: Calendar,
        category: 'Clinical Ops',
        href: '/clinic/schedule',
        colorTheme: {
            bg: 'bg-teal-50 dark:bg-teal-950/40',
            text: 'text-teal-600 dark:text-teal-400',
            border: 'border-teal-200 dark:border-teal-800/60',
            badge: 'bg-teal-100 text-teal-700 dark:bg-teal-900/50 dark:text-teal-300',
        },
    },
    referrals: {
        id: 'referrals',
        title: 'Referrals',
        description: 'Coordinate hospital & partner care',
        icon: Building2,
        category: 'Operations',
        href: '/clinic/referrals',
        colorTheme: {
            bg: 'bg-blue-50 dark:bg-blue-950/40',
            text: 'text-blue-600 dark:text-blue-400',
            border: 'border-blue-200 dark:border-blue-800/60',
            badge: 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
        },
    },
    new_prescription: {
        id: 'new_prescription',
        title: 'New Prescription',
        description: 'Create a prescription for a patient',
        icon: Pill,
        category: 'Clinical Ops',
        href: '/clinic/consultations',
        colorTheme: {
            bg: 'bg-emerald-50 dark:bg-emerald-950/40',
            text: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-200 dark:border-emerald-800/60',
            badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
        },
    },
    patients: {
        id: 'patients',
        title: 'Patients',
        description: 'View directory & medical records',
        icon: Users,
        category: 'Clinical Ops',
        href: '/clinic/patients',
        colorTheme: {
            bg: 'bg-indigo-50 dark:bg-indigo-950/40',
            text: 'text-indigo-600 dark:text-indigo-400',
            border: 'border-indigo-200 dark:border-indigo-800/60',
            badge: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300',
        },
    },
    consultations: {
        id: 'consultations',
        title: 'Consultations',
        description: 'Start or review clinic consultations',
        icon: HeartPulse,
        category: 'General',
        href: '/clinic/consultations',
        colorTheme: {
            bg: 'bg-rose-50 dark:bg-rose-950/40',
            text: 'text-rose-600 dark:text-rose-400',
            border: 'border-rose-200 dark:border-rose-800/60',
            badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
        },
    },
    appointments: {
        id: 'appointments',
        title: 'Appointments',
        description: 'Manage live queue & booked slots',
        icon: Clock,
        category: 'General',
        href: '/clinic/appointments',
        colorTheme: {
            bg: 'bg-amber-50 dark:bg-amber-950/40',
            text: 'text-amber-600 dark:text-amber-400',
            border: 'border-amber-200 dark:border-amber-800/60',
            badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
        },
    },
    departments: {
        id: 'departments',
        title: 'Departments',
        description: 'Manage clinic medical departments',
        icon: Building2,
        category: 'Clinical Ops',
        href: '/clinic/departments',
        colorTheme: {
            bg: 'bg-cyan-50 dark:bg-cyan-950/40',
            text: 'text-cyan-600 dark:text-cyan-400',
            border: 'border-cyan-200 dark:border-cyan-800/60',
            badge: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300',
        },
    },
    team: {
        id: 'team',
        title: 'Staff & Team',
        description: 'Manage clinic staff members & access',
        icon: UserCheck,
        category: 'General',
        href: '/clinic/staff',
        colorTheme: {
            bg: 'bg-violet-50 dark:bg-violet-950/40',
            text: 'text-violet-600 dark:text-violet-400',
            border: 'border-violet-200 dark:border-violet-800/60',
            badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300',
        },
    },
    reports: {
        id: 'reports',
        title: 'Reports',
        description: 'View clinic revenue & analytics',
        icon: TrendingUp,
        category: 'Operations',
        href: '/clinic/reports',
        colorTheme: {
            bg: 'bg-emerald-50 dark:bg-emerald-950/40',
            text: 'text-emerald-600 dark:text-emerald-400',
            border: 'border-emerald-200 dark:border-emerald-800/60',
            badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
        },
    },
    health_alerts: {
        id: 'health_alerts',
        title: 'Health Alerts',
        description: 'Monitor outbreaks & regional health alerts',
        icon: AlertTriangle,
        category: 'Operations',
        href: '/clinic/health-alerts',
        colorTheme: {
            bg: 'bg-orange-50 dark:bg-orange-950/40',
            text: 'text-orange-600 dark:text-orange-400',
            border: 'border-orange-200 dark:border-orange-800/60',
            badge: 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300',
        },
    },
};

export const DEFAULT_QUICK_ACTIONS = [
    'invite_doctor',
    'my_network',
    'schedule',
    'referrals',
    'new_prescription',
    'patients',
];

interface CustomizeQuickOperationsModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentActionIds: string[];
    onSave: (newActionIds: string[]) => void;
}

export function CustomizeQuickOperationsModal({
    isOpen,
    onClose,
    currentActionIds,
    onSave,
}: CustomizeQuickOperationsModalProps) {
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [showResetConfirm, setShowResetConfirm] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setSelectedIds(currentActionIds.length ? currentActionIds : DEFAULT_QUICK_ACTIONS);
            setShowResetConfirm(false);
        }
    }, [isOpen, currentActionIds]);

    if (!isOpen) return null;

    const availableIds = Object.keys(QUICK_ACTION_REGISTRY).filter(
        (id) => !selectedIds.includes(id)
    );

    const isMinMet = selectedIds.length >= 4;
    const isMaxReached = selectedIds.length >= 6;

    const handleMoveUp = (index: number) => {
        if (index <= 0) return;
        const newIds = [...selectedIds];
        const temp = newIds[index - 1];
        newIds[index - 1] = newIds[index];
        newIds[index] = temp;
        setSelectedIds(newIds);
    };

    const handleMoveDown = (index: number) => {
        if (index >= selectedIds.length - 1) return;
        const newIds = [...selectedIds];
        const temp = newIds[index + 1];
        newIds[index + 1] = newIds[index];
        newIds[index] = temp;
        setSelectedIds(newIds);
    };

    const handleRemove = (idToRemove: string) => {
        setSelectedIds((prev) => prev.filter((id) => id !== idToRemove));
    };

    const handleAdd = (idToAdd: string) => {
        if (selectedIds.length >= 6) return;
        setSelectedIds((prev) => [...prev, idToAdd]);
    };

    const handleReset = () => {
        setSelectedIds(DEFAULT_QUICK_ACTIONS);
        setShowResetConfirm(false);
    };

    const handleSave = () => {
        if (!isMinMet || selectedIds.length > 6) return;
        onSave(selectedIds);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
            <div
                className="relative w-full max-w-2xl bg-white dark:bg-[#0B1020] rounded-2xl border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="customize-modal-title"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800/80 bg-gradient-to-r from-gray-50 via-white to-pink-50/30 dark:from-[#0f172a] dark:via-[#0B1020] dark:to-pink-950/20">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-pink-100 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 border border-pink-200 dark:border-pink-800/50">
                            <Sliders className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 id="customize-modal-title" className="text-base font-bold text-gray-900 dark:text-white">
                                Customize Quick Operations
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Arrange and pick 4 to 6 shortcuts to tailor your clinic command center.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        aria-label="Close dialog"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Body Content */}
                <div className="p-5 overflow-y-auto space-y-6 flex-1">
                    {/* Selection Counter & Instructions */}
                    <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200/80 dark:border-gray-700/60">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-pink-600" />
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                                Active Dashboard Slots:
                            </span>
                            <span
                                className={cn(
                                    'px-2 py-0.5 rounded-full text-xs font-bold font-mono',
                                    selectedIds.length >= 4 && selectedIds.length <= 6
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                )}
                            >
                                {selectedIds.length} / 6 selected
                            </span>
                        </div>

                        <div className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                            {selectedIds.length < 4 && (
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">
                                    Need {4 - selectedIds.length} more action{4 - selectedIds.length > 1 ? 's' : ''} (min 4)
                                </span>
                            )}
                            {selectedIds.length >= 4 && selectedIds.length < 6 && (
                                <span className="text-gray-500">Can add {6 - selectedIds.length} more</span>
                            )}
                            {selectedIds.length === 6 && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                    Maximum capacity reached (6/6)
                                </span>
                            )}
                        </div>
                    </div>

                    {/* SECTION 1: Active & Ordered Actions */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                                Active Actions (Renders in this exact order)
                            </label>
                            <span className="text-[11px] text-gray-400">Use arrows to reorder</span>
                        </div>

                        <div className="space-y-2">
                            {selectedIds.map((id, index) => {
                                const action = QUICK_ACTION_REGISTRY[id];
                                if (!action) return null;
                                const Icon = action.icon;

                                return (
                                    <div
                                        key={id}
                                        className="group flex items-center justify-between gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-[#0f172a] shadow-2xs hover:border-pink-300 dark:hover:border-pink-800/80 transition-all"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="flex items-center gap-1.5 text-gray-400 shrink-0">
                                                <GripVertical className="h-4 w-4" />
                                                <span className="text-xs font-mono font-bold text-gray-400 w-4 text-center">
                                                    {index + 1}
                                                </span>
                                            </div>

                                            <div
                                                className={cn(
                                                    'p-2 rounded-lg border shrink-0',
                                                    action.colorTheme.bg,
                                                    action.colorTheme.text,
                                                    action.colorTheme.border
                                                )}
                                            >
                                                <Icon className="h-4 w-4" />
                                            </div>

                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                                                        {action.title}
                                                    </span>
                                                    <span
                                                        className={cn(
                                                            'px-1.5 py-0.5 rounded text-[10px] font-medium shrink-0',
                                                            action.colorTheme.badge
                                                        )}
                                                    >
                                                        {action.category}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                    {action.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1 shrink-0">
                                            {/* Reorder Buttons */}
                                            <button
                                                type="button"
                                                onClick={() => handleMoveUp(index)}
                                                disabled={index === 0}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title="Move Up"
                                            >
                                                <ArrowUp className="h-4 w-4" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMoveDown(index)}
                                                disabled={index === selectedIds.length - 1}
                                                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                title="Move Down"
                                            >
                                                <ArrowDown className="h-4 w-4" />
                                            </button>

                                            {/* Remove Button */}
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(id)}
                                                className="p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors ml-1"
                                                title="Remove from quick operations"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* SECTION 2: Available / Unselected Actions */}
                    {availableIds.length > 0 && (
                        <div className="space-y-3 pt-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 block">
                                Available Actions ({availableIds.length})
                            </label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                {availableIds.map((id) => {
                                    const action = QUICK_ACTION_REGISTRY[id];
                                    if (!action) return null;
                                    const Icon = action.icon;

                                    return (
                                        <div
                                            key={id}
                                            className="flex items-center justify-between gap-2 p-2.5 rounded-xl border border-dashed border-gray-200 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700 bg-gray-50/50 dark:bg-gray-900/30 transition-all"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div
                                                    className={cn(
                                                        'p-1.5 rounded-lg border shrink-0',
                                                        action.colorTheme.bg,
                                                        action.colorTheme.text,
                                                        action.colorTheme.border
                                                    )}
                                                >
                                                    <Icon className="h-3.5 w-3.5" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                                                        {action.title}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 truncate">
                                                        {action.description}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAdd(id)}
                                                disabled={isMaxReached}
                                                className="h-7 px-2 text-[11px] shrink-0 hover:border-pink-400 hover:text-pink-600"
                                            >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Add
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Controls */}
                <div className="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-[#0f172a]/60 gap-3">
                    <div>
                        {showResetConfirm ? (
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-red-600 font-semibold">Restore default 6?</span>
                                <Button size="sm" variant="danger" onClick={handleReset} className="h-7 px-2 text-xs">
                                    Yes, Reset
                                </Button>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setShowResetConfirm(false)}
                                    className="h-7 px-2 text-xs"
                                >
                                    Cancel
                                </Button>
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setShowResetConfirm(true)}
                                className="text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
                            >
                                Reset Defaults
                            </Button>
                        )}
                    </div>

                    <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={onClose} className="text-xs">
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            disabled={!isMinMet || selectedIds.length > 6}
                            leftIcon={<Check className="h-4 w-4" />}
                            className="text-xs bg-pink-600 hover:bg-pink-700 text-white font-bold"
                        >
                            Save Changes ({selectedIds.length})
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
