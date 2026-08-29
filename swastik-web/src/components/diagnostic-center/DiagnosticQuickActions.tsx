'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
    SlidersHorizontal,
    X,
    Check,
    ArrowUp,
    ArrowDown,
    RotateCcw,
    Sparkles,
    GripVertical
} from 'lucide-react';
import {
    DIAGNOSTIC_ACTIONS_CATALOG,
    DEFAULT_DIAGNOSTIC_ACTION_CONFIG,
    loadDiagnosticQuickActions,
    saveDiagnosticQuickActions,
    type DiagnosticQuickActionDef,
    type QuickActionConfigItem
} from '@/lib/diagnosticQuickActions';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/components/ui/Toast';

interface DiagnosticQuickActionsProps {
    className?: string;
}

export function DiagnosticQuickActions({ className = '' }: DiagnosticQuickActionsProps) {
    const { user } = useAuthStore();
    const toast = useToast();

    // Stored config: list of { id, enabled } items in current order
    const [actionConfig, setActionConfig] = useState<QuickActionConfigItem[]>(() =>
        loadDiagnosticQuickActions(user?.id)
    );

    // Modal states
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [draftConfig, setDraftConfig] = useState<QuickActionConfigItem[]>([]);

    // Reload when user changes
    useEffect(() => {
        setActionConfig(loadDiagnosticQuickActions(user?.id));
    }, [user?.id]);

    // Map for fast catalog lookup
    const catalogMap = useMemo(() => {
        const map = new Map<string, DiagnosticQuickActionDef>();
        for (const action of DIAGNOSTIC_ACTIONS_CATALOG) {
            map.set(action.id, action);
        }
        return map;
    }, []);

    // Enabled actions in order
    const enabledActions = useMemo(() => {
        return actionConfig
            .filter((item) => item.enabled)
            .map((item) => catalogMap.get(item.id))
            .filter((action): action is DiagnosticQuickActionDef => Boolean(action));
    }, [actionConfig, catalogMap]);

    // Separate primary action (e.g. New Booking) if enabled
    const primaryAction = useMemo(() => {
        return enabledActions.find((a) => a.isPrimary);
    }, [enabledActions]);

    const secondaryActions = useMemo(() => {
        return enabledActions.filter((a) => !a.isPrimary);
    }, [enabledActions]);

    // Open Modal
    const handleOpenCustomize = () => {
        setDraftConfig(actionConfig.map((item) => ({ ...item })));
        setIsCustomizing(true);
    };

    // Toggle enabled state in draft
    const handleToggleDraftItem = (id: string) => {
        setDraftConfig((prev) =>
            prev.map((item) => (item.id === id ? { ...item, enabled: !item.enabled } : item))
        );
    };

    // Reorder draft items
    const handleMoveItem = (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= draftConfig.length) return;

        setDraftConfig((prev) => {
            const next = [...prev];
            const [moved] = next.splice(index, 1);
            next.splice(targetIndex, 0, moved);
            return next;
        });
    };

    // Reset to default
    const handleResetDefaults = () => {
        setDraftConfig(DEFAULT_DIAGNOSTIC_ACTION_CONFIG.map((item) => ({ ...item })));
        toast.info('Defaults Restored', 'Default shortcuts restored. Click Save to apply.');
    };

    // Save changes
    const handleSave = () => {
        const success = saveDiagnosticQuickActions(user?.id, draftConfig);
        if (success) {
            setActionConfig(draftConfig);
            setIsCustomizing(false);
            toast.success('Quick Actions Saved', 'Your dashboard shortcuts have been updated.');
        } else {
            toast.error('Save Failed', 'Unable to save preferences. Please try again.');
        }
    };

    const hasAnyDraftEnabled = draftConfig.some((item) => item.enabled);

    return (
        <>
            {/* Dashboard Card Container */}
            <div className={`bg-white dark:bg-slate-900 rounded-[18px] border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-200 ease-out hover:-translate-y-[2px] hover:shadow-md ${className}`}>
                {/* Header */}
                <div className="flex items-center justify-between mb-4 px-5 pt-5 pb-0">
                    <h3 className="text-[15px] font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Quick Actions
                    </h3>
                    <button
                        type="button"
                        onClick={handleOpenCustomize}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20 border border-transparent hover:border-purple-200 dark:hover:border-purple-800/40 transition-colors"
                        aria-label="Customize Quick Actions"
                        title="Customize dashboard shortcuts"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Customize</span>
                    </button>
                </div>

                {/* Body Content */}
                <div className="px-5 pb-5">
                    {enabledActions.length === 0 ? (
                        <div className="py-8 px-4 flex flex-col items-center justify-center text-center">
                            <div className="p-3 rounded-2xl bg-purple-50 dark:bg-purple-900/20 text-purple-600 mb-2.5">
                                <SlidersHorizontal className="h-6 w-6" strokeWidth={1.5} />
                            </div>
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-200">
                                No Quick Actions Selected
                            </p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
                                Customize shortcuts to pin your favorite actions to the dashboard.
                            </p>
                            <button
                                type="button"
                                onClick={handleOpenCustomize}
                                className="mt-3 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold transition-colors"
                            >
                                Add Shortcuts
                            </button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                            {/* Primary Prominent Action (e.g. New Booking) */}
                            {primaryAction && (
                                <Link
                                    href={primaryAction.href}
                                    className="col-span-2 px-4 py-3.5 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-all duration-200 hover:-translate-y-[1px] hover:shadow-md text-[14px] font-semibold flex items-center justify-center gap-2"
                                >
                                    <primaryAction.icon className="h-[18px] w-[18px]" strokeWidth={2.5} />
                                    <span>{primaryAction.label}</span>
                                </Link>
                            )}

                            {/* Secondary Actions in 2-Column Responsive Grid */}
                            {secondaryActions.map((action) => {
                                const Icon = action.icon;
                                return (
                                    <Link
                                        key={action.id}
                                        href={action.href}
                                        className="group px-3 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-all duration-200 hover:-translate-y-px hover:border-purple-300 hover:shadow-sm text-[12px] font-semibold flex flex-col items-center justify-center gap-2 text-slate-700 dark:text-slate-300"
                                    >
                                        <div className="p-2 rounded-lg bg-purple-50 dark:bg-slate-700 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                            <Icon className="h-4 w-4" strokeWidth={2} />
                                        </div>
                                        <span className="group-hover:text-purple-700 transition-colors text-center truncate max-w-full">
                                            {action.label}
                                        </span>
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Customization Modal */}
            {isCustomizing && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsCustomizing(false)}
                    role="dialog"
                    aria-modal="true"
                >
                    <div
                        className="relative w-full max-w-xl bg-white dark:bg-[#111c2e] rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[88vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-purple-600/10 text-purple-600 dark:text-purple-400">
                                    <SlidersHorizontal className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                        Customize Quick Actions
                                    </h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Customize which shortcuts appear on your dashboard.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCustomizing(false)}
                                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                aria-label="Close customization dialog"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Modal Scrollable Body */}
                        <div className="p-5 overflow-y-auto space-y-2.5 flex-1">
                            <div className="flex items-center justify-between px-1 mb-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                    Shortcuts ({draftConfig.filter((i) => i.enabled).length} Enabled)
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    Toggle checkbox to show/hide • Use arrows to reorder
                                </span>
                            </div>

                            {draftConfig.map((item, index) => {
                                const action = catalogMap.get(item.id);
                                if (!action) return null;
                                const Icon = action.icon;
                                const isFirst = index === 0;
                                const isLast = index === draftConfig.length - 1;

                                return (
                                    <div
                                        key={action.id}
                                        className={`flex items-center gap-3 p-3 rounded-2xl border transition-all duration-150 ${
                                            item.enabled
                                                ? 'bg-white dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 shadow-xs'
                                                : 'bg-slate-50/60 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/60 opacity-60'
                                        }`}
                                    >
                                        {/* Reorder Buttons */}
                                        <div className="flex flex-col gap-0.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleMoveItem(index, 'up')}
                                                disabled={isFirst}
                                                className={`p-1 rounded-md transition-colors ${
                                                    isFirst
                                                        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                                }`}
                                                aria-label={`Move ${action.label} up`}
                                                title="Move up"
                                            >
                                                <ArrowUp className="h-3.5 w-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMoveItem(index, 'down')}
                                                disabled={isLast}
                                                className={`p-1 rounded-md transition-colors ${
                                                    isLast
                                                        ? 'text-slate-300 dark:text-slate-700 cursor-not-allowed'
                                                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50'
                                                }`}
                                                aria-label={`Move ${action.label} down`}
                                                title="Move down"
                                            >
                                                <ArrowDown className="h-3.5 w-3.5" />
                                            </button>
                                        </div>

                                        {/* Icon Container */}
                                        <div
                                            className={`p-2 rounded-xl shrink-0 ${
                                                item.enabled
                                                    ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                            }`}
                                        >
                                            <Icon className="h-4 w-4" />
                                        </div>

                                        {/* Action Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <p className={`text-xs font-bold truncate ${item.enabled ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}>
                                                    {action.label}
                                                </p>
                                                {action.isPrimary && (
                                                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                                                        Primary
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                {action.description}
                                            </p>
                                        </div>

                                        {/* Checkbox / Toggle Switch */}
                                        <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                            <input
                                                type="checkbox"
                                                checked={item.enabled}
                                                onChange={() => handleToggleDraftItem(item.id)}
                                                className="sr-only peer"
                                                aria-label={`Toggle ${action.label}`}
                                            />
                                            <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                        </label>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Modal Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 shrink-0">
                            <button
                                type="button"
                                onClick={handleResetDefaults}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                <span>Reset to Default</span>
                            </button>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsCustomizing(false)}
                                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm shadow-purple-600/20 transition-colors cursor-pointer"
                                >
                                    <Check className="h-3.5 w-3.5" />
                                    <span>Save</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
