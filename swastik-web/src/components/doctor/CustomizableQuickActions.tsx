'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
    SlidersHorizontal,
    X,
    Check,
    ChevronUp,
    ChevronDown,
    RotateCcw,
    Lock
} from 'lucide-react';
import {
    LOCKED_TOP_ACTION,
    LOCKED_BOTTOM_ACTION,
    CUSTOMIZABLE_ACTIONS_POOL,
    DEFAULT_CUSTOMIZABLE_ACTION_IDS,
    EXACT_CUSTOMIZABLE_COUNT,
    TOTAL_QUICK_ACTIONS_COUNT,
    loadDoctorCustomizableActions,
    saveDoctorCustomizableActions,
    type QuickActionDef
} from '@/lib/doctorQuickActions';

interface CustomizableQuickActionsProps {
    userId?: string;
    onRecordDirectVisit: () => void;
}

export function CustomizableQuickActions({
    userId,
    onRecordDirectVisit,
}: CustomizableQuickActionsProps) {
    // Exactly 4 selected customizable action IDs in user-defined order
    const [selectedActionIds, setSelectedActionIds] = useState<string[]>(() =>
        loadDoctorCustomizableActions(userId)
    );
    const [isCustomizing, setIsCustomizing] = useState(false);
    const [draftSelectedIds, setDraftSelectedIds] = useState<string[]>([]);
    const [subtleHint, setSubtleHint] = useState<string | null>(null);

    // Reload preferences when userId changes (e.g. login / account switch)
    useEffect(() => {
        setSelectedActionIds(loadDoctorCustomizableActions(userId));
    }, [userId]);

    // Map for fast metadata retrieval
    const actionsMap = useMemo(() => {
        const map = new Map<string, QuickActionDef>();
        for (const action of CUSTOMIZABLE_ACTIONS_POOL) {
            map.set(action.id, action);
        }
        return map;
    }, []);

    // Active 4 customizable actions resolved from saved state
    const activeCustomActions = useMemo(() => {
        return selectedActionIds
            .map(id => actionsMap.get(id))
            .filter((action): action is QuickActionDef => Boolean(action));
    }, [selectedActionIds, actionsMap]);

    // Open customize dialog with a cloned draft
    const openCustomizeModal = () => {
        setDraftSelectedIds([...selectedActionIds]);
        setSubtleHint(null);
        setIsCustomizing(true);
    };

    // Toggle handler: during editing 0-4 selections are allowed
    const handleToggleDraftAction = (actionId: string) => {
        setSubtleHint(null);
        const isCurrentlySelected = draftSelectedIds.includes(actionId);

        if (isCurrentlySelected) {
            // Turning OFF: ALWAYS allowed during editing
            setDraftSelectedIds(prev => prev.filter(id => id !== actionId));
        } else {
            // Turning ON: only allowed if fewer than 4 are selected
            if (draftSelectedIds.length < EXACT_CUSTOMIZABLE_COUNT) {
                setDraftSelectedIds(prev => [...prev, actionId]);
            } else {
                // Already at 4/4
                setSubtleHint('Remove one selected action first to replace it.');
            }
        }
    };

    // Reorder handler (only for active selected items)
    const handleMoveDraftAction = (index: number, direction: 'up' | 'down') => {
        setSubtleHint(null);
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= draftSelectedIds.length) return;

        setDraftSelectedIds(prev => {
            const next = [...prev];
            const [moved] = next.splice(index, 1);
            next.splice(targetIndex, 0, moved);
            return next;
        });
    };

    const handleResetDefaults = () => {
        setDraftSelectedIds([...DEFAULT_CUSTOMIZABLE_ACTION_IDS]);
        setSubtleHint(null);
    };

    const handleSaveCustomization = () => {
        // Strict assertion: exactly 4 customizable actions required to save
        if (draftSelectedIds.length !== EXACT_CUSTOMIZABLE_COUNT) {
            return;
        }

        const success = saveDoctorCustomizableActions(userId, draftSelectedIds);
        if (success) {
            setSelectedActionIds(draftSelectedIds);
            setIsCustomizing(false);
        }
    };

    const canSave = draftSelectedIds.length === EXACT_CUSTOMIZABLE_COUNT;
    const remainingToSelect = EXACT_CUSTOMIZABLE_COUNT - draftSelectedIds.length;

    const TopLockedIcon = LOCKED_TOP_ACTION.icon;
    const BottomLockedIcon = LOCKED_BOTTOM_ACTION.icon;

    return (
        <>
            {/* Quick Actions Dashboard Card (Exactly 6 Actions: 2 Locked + 4 Customizable) */}
            <div className="bg-white dark:bg-[#111c2e] rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm transition-colors">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <h3 className="font-extrabold text-gray-900 dark:text-white text-lg">Quick Actions</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                            {TOTAL_QUICK_ACTIONS_COUNT} Total
                        </span>
                    </div>
                    <button
                        type="button"
                        onClick={openCustomizeModal}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-gray-100 dark:hover:bg-gray-800/60 transition-colors"
                        aria-label="Customize Quick Actions"
                        title="Customize the 4 dashboard shortcuts"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        <span>Edit</span>
                    </button>
                </div>

                <div className="space-y-2.5">
                    {/* Row 1: Fixed / Locked Primary Action (Top) */}
                    <button
                        type="button"
                        onClick={onRecordDirectVisit}
                        className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white transition-all text-center flex items-center justify-center gap-2 shadow-sm group font-bold text-xs active:scale-[0.99]"
                    >
                        <TopLockedIcon className="h-4 w-4 group-hover:scale-110 transition-transform" />
                        <span>+ {LOCKED_TOP_ACTION.label}</span>
                    </button>

                    {/* Rows 2 & 3: Exactly 4 Customizable Actions (2x2 Grid) */}
                    <div className="grid grid-cols-2 gap-2.5">
                        {activeCustomActions.map(action => {
                            const Icon = action.icon;

                            // Color styling
                            let colorClasses = 'hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20';
                            let iconColor = 'text-emerald-600 dark:text-emerald-400';

                            if (action.color === 'blue') {
                                colorClasses = 'hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-950/20';
                                iconColor = 'text-blue-600 dark:text-blue-400';
                            } else if (action.color === 'yellow') {
                                colorClasses = 'hover:border-yellow-300 dark:hover:border-yellow-800 hover:bg-yellow-50/50 dark:hover:bg-yellow-950/20';
                                iconColor = 'text-yellow-600 dark:text-yellow-400';
                            } else if (action.color === 'purple') {
                                colorClasses = 'hover:border-purple-300 dark:hover:border-purple-800 hover:bg-purple-50/50 dark:hover:bg-purple-950/20';
                                iconColor = 'text-purple-600 dark:text-purple-400';
                            } else if (action.color === 'cyan') {
                                colorClasses = 'hover:border-cyan-300 dark:hover:border-cyan-800 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/20';
                                iconColor = 'text-cyan-600 dark:text-cyan-400';
                            } else if (action.color === 'indigo') {
                                colorClasses = 'hover:border-indigo-300 dark:hover:border-indigo-800 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20';
                                iconColor = 'text-indigo-600 dark:text-indigo-400';
                            } else if (action.color === 'gray') {
                                colorClasses = 'hover:border-gray-300 dark:hover:border-gray-700 hover:bg-gray-50/50 dark:hover:bg-gray-800/40';
                                iconColor = 'text-gray-600 dark:text-gray-400';
                            }

                            return (
                                <Link
                                    key={action.id}
                                    href={action.href || '#'}
                                    className={`p-3 rounded-2xl border border-gray-100 dark:border-gray-800 ${colorClasses} transition-all text-center group active:scale-[0.99]`}
                                >
                                    <Icon className={`h-5 w-5 ${iconColor} mx-auto mb-1.5 group-hover:scale-110 transition-transform`} />
                                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">{action.label}</p>
                                </Link>
                            );
                        })}
                    </div>

                    {/* Row 4: Fixed / Locked Secondary Action (Bottom) */}
                    <Link
                        href={LOCKED_BOTTOM_ACTION.href || '/doctor/scan-patient'}
                        className="w-full p-3 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-800 hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20 transition-all flex items-center justify-center gap-2 group text-center active:scale-[0.99]"
                    >
                        <BottomLockedIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{LOCKED_BOTTOM_ACTION.label}</p>
                    </Link>
                </div>
            </div>

            {/* Customization Modal Dialog */}
            {isCustomizing && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
                    onClick={() => setIsCustomizing(false)}
                >
                    <div
                        className="relative w-full max-w-lg bg-white dark:bg-[#111c2e] rounded-3xl shadow-2xl border border-gray-200 dark:border-gray-800 flex flex-col max-h-[88vh] overflow-hidden"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
                            <div className="flex items-center gap-2.5">
                                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    <SlidersHorizontal className="h-4 w-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-900 dark:text-white">Customize Quick Actions</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">
                                        Choose exactly 4 customizable actions for your dashboard.
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsCustomizing(false)}
                                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label="Close customization dialog"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Subtle Hint Message (if any) */}
                        {subtleHint && (
                            <div className="mx-5 mt-3 px-3 py-2 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-xs text-blue-700 dark:text-blue-300">
                                {subtleHint}
                            </div>
                        )}

                        <div className="p-5 overflow-y-auto space-y-5 flex-1">
                            {/* Section 1: Fixed / Locked Actions (2) */}
                            <div>
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                        Fixed Actions (2)
                                    </span>
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                                        <Lock className="w-2.5 h-2.5" /> Locked Positions
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {/* Locked Action 1 */}
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                <TopLockedIcon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                                        {LOCKED_TOP_ACTION.label}
                                                    </p>
                                                    <span className="text-[10px] font-semibold text-gray-400">(Top Pinned)</span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    {LOCKED_TOP_ACTION.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                                            <Lock className="w-3 h-3" /> Fixed
                                        </div>
                                    </div>

                                    {/* Locked Action 2 */}
                                    <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                                <BottomLockedIcon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-1.5">
                                                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100">
                                                        {LOCKED_BOTTOM_ACTION.label}
                                                    </p>
                                                    <span className="text-[10px] font-semibold text-gray-400">(Bottom Pinned)</span>
                                                </div>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                                                    {LOCKED_BOTTOM_ACTION.description}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 px-2 py-1 rounded-lg bg-gray-100 dark:bg-gray-800">
                                            <Lock className="w-3 h-3" /> Fixed
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Section 2: Customizable Actions Pool (Select exactly 4) */}
                            <div>
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                                        Custom Actions (Select 4)
                                    </span>
                                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                                        canSave
                                            ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                            : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                                    }`}>
                                        {canSave
                                            ? '4 of 4 selected'
                                            : `${draftSelectedIds.length} of 4 selected — choose ${remainingToSelect} more`}
                                    </span>
                                </div>

                                <div className="space-y-2">
                                    {/* 1. Render active selected customizable actions in user order */}
                                    {draftSelectedIds.map((actionId, index) => {
                                        const action = actionsMap.get(actionId);
                                        if (!action) return null;
                                        const Icon = action.icon;
                                        const isFirst = index === 0;
                                        const isLast = index === draftSelectedIds.length - 1;

                                        return (
                                            <div
                                                key={action.id}
                                                className="flex items-center gap-3 p-3 rounded-2xl border bg-white dark:bg-gray-800/40 border-gray-200 dark:border-gray-700/60 shadow-xs transition-all"
                                            >
                                                {/* Reorder Buttons */}
                                                <div className="flex flex-col gap-0.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMoveDraftAction(index, 'up')}
                                                        disabled={isFirst}
                                                        className={`p-1 rounded-md transition-colors ${
                                                            isFirst
                                                                ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                                                                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                                        }`}
                                                        aria-label={`Move ${action.label} up`}
                                                        title="Move up"
                                                    >
                                                        <ChevronUp className="h-3.5 w-3.5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleMoveDraftAction(index, 'down')}
                                                        disabled={isLast}
                                                        className={`p-1 rounded-md transition-colors ${
                                                            isLast
                                                                ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                                                                : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700/50'
                                                        }`}
                                                        aria-label={`Move ${action.label} down`}
                                                        title="Move down"
                                                    >
                                                        <ChevronDown className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>

                                                {/* Icon */}
                                                <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 shrink-0">
                                                    <Icon className="h-4 w-4" />
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate">
                                                        {action.label}
                                                    </p>
                                                    <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                        {action.description}
                                                    </p>
                                                </div>

                                                {/* Active Toggle Switch (CAN ALWAYS BE TURNED OFF DURING EDITING) */}
                                                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                                                    <input
                                                        type="checkbox"
                                                        checked={true}
                                                        onChange={() => handleToggleDraftAction(action.id)}
                                                        className="sr-only peer"
                                                        aria-label={`Uncheck ${action.label}`}
                                                    />
                                                    <div className="w-9 h-5 bg-emerald-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                                </label>
                                            </div>
                                        );
                                    })}

                                    {/* 2. Render remaining unselected customizable actions pool */}
                                    {CUSTOMIZABLE_ACTIONS_POOL.filter(a => !draftSelectedIds.includes(a.id)).map(action => {
                                        const Icon = action.icon;
                                        const canSelectThis = draftSelectedIds.length < EXACT_CUSTOMIZABLE_COUNT;

                                        return (
                                            <div
                                                key={action.id}
                                                onClick={() => {
                                                    if (!canSelectThis) {
                                                        setSubtleHint('Remove one selected action first to replace it.');
                                                    }
                                                }}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                                                    canSelectThis
                                                        ? 'bg-gray-50/80 dark:bg-gray-900/40 border-gray-100 dark:border-gray-800/60 opacity-80 hover:opacity-100 cursor-pointer'
                                                        : 'bg-gray-50/40 dark:bg-gray-900/20 border-gray-100 dark:border-gray-800/40 opacity-50 cursor-not-allowed'
                                                }`}
                                            >
                                                <div className="w-5 shrink-0" />

                                                {/* Icon */}
                                                <div className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-400 shrink-0">
                                                    <Icon className="h-4 w-4" />
                                                </div>

                                                {/* Details */}
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate">
                                                        {action.label}
                                                    </p>
                                                    <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">
                                                        {action.description}
                                                    </p>
                                                </div>

                                                {/* Inactive Toggle Switch */}
                                                <label className={`relative inline-flex items-center shrink-0 ${canSelectThis ? 'cursor-pointer' : 'cursor-not-allowed'}`}>
                                                    <input
                                                        type="checkbox"
                                                        checked={false}
                                                        onChange={() => handleToggleDraftAction(action.id)}
                                                        className="sr-only peer"
                                                        aria-label={`Select ${action.label}`}
                                                    />
                                                    <div className="w-9 h-5 bg-gray-200 dark:bg-gray-700 rounded-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                                </label>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40">
                            <button
                                type="button"
                                onClick={handleResetDefaults}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                            >
                                <RotateCcw className="h-3.5 w-3.5" /> Reset Defaults
                            </button>

                            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                <button
                                    type="button"
                                    onClick={() => setIsCustomizing(false)}
                                    className="px-3.5 py-2 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSaveCustomization}
                                    disabled={!canSave}
                                    title={!canSave ? `Select ${remainingToSelect} more action${remainingToSelect === 1 ? '' : 's'} to save.` : 'Save changes'}
                                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                                        canSave
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 cursor-pointer'
                                            : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    }`}
                                >
                                    <Check className="h-3.5 w-3.5" /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
