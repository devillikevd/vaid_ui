'use client';

import React, { useState, useEffect } from 'react';
import {
    X, Check, Plus, Trash2, ArrowUp, ArrowDown, RotateCcw,
    CreditCard, ShoppingCart, Boxes, Send, FileText, ArrowRightLeft,
    Network, Tag, Star, Film, Truck, BarChart3, Users, Bell, Settings, Store,
    SlidersHorizontal, Sparkles
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import { QuickOperationConfig } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';

export interface OperationCatalogItem {
    key: string;
    label: string;
    description: string;
    route: string;
    icon: React.ElementType;
    category: string;
    color: string;
}

export const ALL_PHARMACY_OPERATIONS: OperationCatalogItem[] = [
    {
        key: 'pos',
        label: 'POS Billing',
        description: 'Quick counter sales & receipts',
        route: '/pharmacy/pos',
        icon: CreditCard,
        category: 'Sales',
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-900/50',
    },
    {
        key: 'orders',
        label: 'Orders',
        description: 'Customer & partner fulfillment',
        route: '/pharmacy/orders',
        icon: ShoppingCart,
        category: 'Operations',
        color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-900/50',
    },
    {
        key: 'inventory',
        label: 'Inventory',
        description: 'Stock levels & batch pricing',
        route: '/pharmacy/inventory',
        icon: Boxes,
        category: 'Catalog',
        color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/50',
    },
    {
        key: 'requests',
        label: 'Requests',
        description: 'Medicine inquiries & quotes',
        route: '/pharmacy/requests',
        icon: Send,
        category: 'Sales',
        color: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-900/50',
    },
    {
        key: 'prescriptions',
        label: 'Prescriptions',
        description: 'Digital Rx verification & queue',
        route: '/pharmacy/prescriptions',
        icon: FileText,
        category: 'Operations',
        color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/60 border-cyan-200 dark:border-cyan-900/50',
    },
    {
        key: 'referrals',
        label: 'Referrals',
        description: 'Clinical & lab patient transfers',
        route: '/pharmacy/referrals',
        icon: ArrowRightLeft,
        category: 'Network',
        color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-900/50',
    },
    {
        key: 'network',
        label: 'Care Network',
        description: 'Hospitals & clinics partners',
        route: '/pharmacy/network',
        icon: Network,
        category: 'Network',
        color: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-900/50',
    },
    {
        key: 'campaigns',
        label: 'Campaigns',
        description: 'Discount promos & health deals',
        route: '/pharmacy/campaigns',
        icon: Tag,
        category: 'Marketing',
        color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-900/50',
    },
    {
        key: 'reviews',
        label: 'Reviews',
        description: 'Patient ratings & feedback',
        route: '/pharmacy/reviews',
        icon: Star,
        category: 'Marketing',
        color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-900/50',
    },
    {
        key: 'reels',
        label: 'Health Reels',
        description: 'Promotional video reels',
        route: '/pharmacy/reels',
        icon: Film,
        category: 'Marketing',
        color: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 border-pink-200 dark:border-pink-900/50',
    },
    {
        key: 'agents',
        label: 'Delivery Fleet',
        description: 'Dispatch & delivery drivers',
        route: '/pharmacy/agents',
        icon: Truck,
        category: 'Operations',
        color: 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/60 border-green-200 dark:border-green-900/50',
    },
    {
        key: 'reports',
        label: 'Reports',
        description: 'Revenue & sales analytics',
        route: '/pharmacy/reports',
        icon: BarChart3,
        category: 'Management',
        color: 'text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-900/50',
    },
    {
        key: 'staff',
        label: 'Staff & Team',
        description: 'Team permissions & roles',
        route: '/pharmacy/staff',
        icon: Users,
        category: 'Management',
        color: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/60 border-violet-200 dark:border-violet-900/50',
    },
    {
        key: 'notifications',
        label: 'Notifications',
        description: 'Store alerts & audit activity',
        route: '/pharmacy/notifications',
        icon: Bell,
        category: 'Management',
        color: 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-950/60 border-yellow-200 dark:border-yellow-900/50',
    },
    {
        key: 'settings',
        label: 'Settings',
        description: 'Store profile & delivery setup',
        route: '/pharmacy/settings',
        icon: Settings,
        category: 'Management',
        color: 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    },
    {
        key: 'profile',
        label: 'Storefront',
        description: 'Preview public store page',
        route: '/pharmacy/profile',
        icon: Store,
        category: 'Sales',
        color: 'text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-900/50',
    },
];

export const DEFAULT_PHARMACY_OPERATIONS_KEYS = [
    'orders',
    'inventory',
    'requests',
    'referrals',
];

interface CustomizeQuickOperationsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function CustomizeQuickOperationsModal({
    isOpen,
    onClose,
}: CustomizeQuickOperationsModalProps) {
    const { dashboardPreferences, updateDashboardPreferences } = usePharmacyStore();
    const toast = useToast();

    const [activeKeys, setActiveKeys] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const currentOps = dashboardPreferences?.quick_operations;
            if (Array.isArray(currentOps) && currentOps.length > 0) {
                const keys = currentOps
                    .filter((op) => op.enabled !== false)
                    .sort((a, b) => a.order - b.order)
                    .map((op) => op.key);
                setActiveKeys(keys.length > 0 ? keys : DEFAULT_PHARMACY_OPERATIONS_KEYS);
            } else {
                setActiveKeys(DEFAULT_PHARMACY_OPERATIONS_KEYS);
            }
        }
    }, [isOpen, dashboardPreferences]);

    if (!isOpen) return null;

    const activeOperations = activeKeys
        .map((key) => ALL_PHARMACY_OPERATIONS.find((op) => op.key === key))
        .filter(Boolean) as OperationCatalogItem[];

    const inactiveOperations = ALL_PHARMACY_OPERATIONS.filter(
        (op) => !activeKeys.includes(op.key)
    );

    const handleMoveUp = (index: number) => {
        if (index === 0) return;
        const copy = [...activeKeys];
        const temp = copy[index - 1];
        copy[index - 1] = copy[index];
        copy[index] = temp;
        setActiveKeys(copy);
    };

    const handleMoveDown = (index: number) => {
        if (index === activeKeys.length - 1) return;
        const copy = [...activeKeys];
        const temp = copy[index + 1];
        copy[index + 1] = copy[index];
        copy[index] = temp;
        setActiveKeys(copy);
    };

    const handleRemove = (key: string) => {
        if (activeKeys.length <= 1) {
            toast.error('Minimum Required', 'Keep at least 1 quick operation on your dashboard.');
            return;
        }
        setActiveKeys(activeKeys.filter((k) => k !== key));
    };

    const handleAdd = (key: string) => {
        if (activeKeys.includes(key)) return;
        setActiveKeys([...activeKeys, key]);
    };

    const handleRestoreDefaults = () => {
        setActiveKeys(DEFAULT_PHARMACY_OPERATIONS_KEYS);
        toast.info('Restored Defaults', 'Default operations restored. Click Save to apply.');
    };

    const handleSave = async () => {
        setSubmitting(true);
        try {
            const formatted: QuickOperationConfig[] = activeKeys.map((key, index) => ({
                key,
                enabled: true,
                order: index + 1,
            }));

            const success = await updateDashboardPreferences({
                quick_operations: formatted,
            });

            if (success) {
                toast.success('Quick Operations Updated', 'Your dashboard layout has been personalized.');
                onClose();
            } else {
                toast.error('Save Failed', 'Unable to update preferences. Please try again.');
            }
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
                className="w-full max-w-2xl bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-900/50 shrink-0">
                            <SlidersHorizontal className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-base font-extrabold text-gray-900 dark:text-gray-100">
                                Customize Quick Operations
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                                Add, remove, and reorder shortcuts displayed on your Pharmacy dashboard
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        aria-label="Close modal"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="py-4 space-y-6 overflow-y-auto flex-1 text-sm pr-1">
                    {/* Active Shortcuts Section */}
                    <div>
                        <div className="flex items-center justify-between mb-2.5">
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-extrabold text-gray-900 dark:text-gray-100">
                                    Active Shortcuts ({activeOperations.length})
                                </span>
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                    (Top to bottom matches left to right)
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleRestoreDefaults}
                                className="text-xs font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 flex items-center gap-1 hover:underline"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restore Defaults</span>
                            </button>
                        </div>

                        <div className="space-y-2">
                            {activeOperations.map((op, index) => {
                                const Icon = op.icon;
                                return (
                                    <div
                                        key={op.key}
                                        className="p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200/80 dark:border-gray-700/60 flex items-center justify-between gap-3 group transition-all"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <span className="text-xs font-black text-gray-400 dark:text-gray-500 w-4 text-center">
                                                {index + 1}
                                            </span>
                                            <div className={`p-2 rounded-xl shrink-0 border ${op.color}`}>
                                                <Icon className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100 truncate">
                                                    {op.label}
                                                </p>
                                                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                                                    {op.description}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            <button
                                                type="button"
                                                onClick={() => handleMoveUp(index)}
                                                disabled={index === 0}
                                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                                title="Move Up"
                                            >
                                                <ArrowUp className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleMoveDown(index)}
                                                disabled={index === activeOperations.length - 1}
                                                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition"
                                                title="Move Down"
                                            >
                                                <ArrowDown className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => handleRemove(op.key)}
                                                className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 transition"
                                                title="Remove Shortcut"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Available Operations to Add */}
                    {inactiveOperations.length > 0 && (
                        <div>
                            <p className="text-xs font-extrabold text-gray-900 dark:text-gray-100 mb-2.5">
                                Available Shortcuts ({inactiveOperations.length})
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {inactiveOperations.map((op) => {
                                    const Icon = op.icon;
                                    return (
                                        <div
                                            key={op.key}
                                            className="p-2.5 rounded-2xl bg-white dark:bg-[#0f172a] border border-gray-200 dark:border-gray-800 flex items-center justify-between gap-2.5 hover:border-orange-300 dark:hover:border-orange-800 transition"
                                        >
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <div className={`p-2 rounded-xl shrink-0 border ${op.color}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100 truncate">
                                                        {op.label}
                                                    </p>
                                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                                                        {op.category}
                                                    </p>
                                                </div>
                                            </div>

                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAdd(op.key)}
                                                className="text-xs font-bold rounded-xl shrink-0 hover:bg-orange-50 hover:border-orange-300 dark:hover:bg-orange-950/40"
                                            >
                                                <Plus className="w-3.5 h-3.5 mr-1" />
                                                Add
                                            </Button>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-end gap-2.5 shrink-0">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={submitting}
                        className="text-xs font-bold rounded-xl"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        isLoading={submitting}
                        disabled={submitting}
                        className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs rounded-xl shadow-md shadow-orange-600/20 px-5"
                    >
                        Save Shortcuts
                    </Button>
                </div>
            </Card>
        </div>
    );
}
