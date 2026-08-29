'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { SlidersHorizontal, ArrowUpRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { usePharmacyStore } from '@/stores/pharmacyStore';
import {
    ALL_PHARMACY_OPERATIONS,
    CustomizeQuickOperationsModal,
    OperationCatalogItem,
} from './CustomizeQuickOperationsModal';

interface PharmacyQuickActionsProps {
    className?: string;
}

export function PharmacyQuickActions({ className = '' }: PharmacyQuickActionsProps) {
    const {
        dashboardPreferences,
        stats,
        orderSummary,
        lowStockItems,
    } = usePharmacyStore();

    const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

    // Derive active 4 operations from preferences (defaults to orders, inventory, requests, referrals)
    const activeKeys = (() => {
        const saved = dashboardPreferences?.quick_operations;
        if (Array.isArray(saved) && saved.length > 0) {
            const enabled = saved
                .filter((op) => op.enabled !== false)
                .sort((a, b) => a.order - b.order)
                .map((op) => op.key);
            if (enabled.length > 0) return enabled.slice(0, 4);
        }
        return ['orders', 'inventory', 'requests', 'referrals'];
    })();

    const operations = activeKeys
        .map((key) => ALL_PHARMACY_OPERATIONS.find((op) => op.key === key))
        .filter(Boolean) as OperationCatalogItem[];

    // Calculate dynamic live badges
    const getBadgeCount = (key: string): { count: number; color: string } | null => {
        if (key === 'orders') {
            const pending = orderSummary?.pending ?? stats?.pendingOrders ?? 0;
            if (pending > 0) {
                return {
                    count: pending,
                    color: 'bg-orange-100 dark:bg-orange-950/80 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
                };
            }
        }

        if (key === 'inventory') {
            const low = stats?.lowStockItems ?? lowStockItems?.length ?? 0;
            if (low > 0) {
                return {
                    count: low,
                    color: 'bg-red-100 dark:bg-red-950/80 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
                };
            }
        }

        return null;
    };

    return (
        <Card className={`p-3.5 border-gray-200/80 dark:border-gray-800 bg-white dark:bg-[#111c2e] shadow-xs rounded-2xl ${className}`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-gray-100 dark:border-gray-800/80">
                <div>
                    <h2 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-gray-100">
                        Quick Actions
                    </h2>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                        Operational shortcuts
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setIsCustomizeOpen(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-orange-600 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/40 border border-transparent hover:border-orange-200 dark:hover:border-orange-900/50 transition-all"
                    aria-label="Customize Quick Actions"
                >
                    <SlidersHorizontal className="w-3 h-3" />
                    <span>Customize</span>
                </button>
            </div>

            {/* 2x2 Grid with Exactly 4 Cards: Orders, Inventory, Requests, Referrals */}
            <div className="grid grid-cols-2 gap-2">
                {operations.slice(0, 4).map((op) => {
                    const Icon = op.icon;
                    const badge = getBadgeCount(op.key);

                    return (
                        <Link
                            key={op.key}
                            href={op.route}
                            className="group flex flex-col justify-between p-2.5 rounded-xl bg-gray-50/80 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 hover:border-orange-200 dark:hover:border-orange-900/60 hover:shadow-xs transition-all duration-150 min-h-[72px]"
                        >
                            <div className="flex items-start justify-between">
                                <div className={`p-1.5 rounded-lg border ${op.color} group-hover:scale-105 transition-transform shrink-0`}>
                                    <Icon className="w-3.5 h-3.5" />
                                </div>
                                {badge ? (
                                    <span className={`text-[9px] font-black px-1.5 py-0.2 rounded-md border ${badge.color}`}>
                                        {badge.count}
                                    </span>
                                ) : (
                                    <ArrowUpRight className="w-3 h-3 text-gray-300 dark:text-gray-600 group-hover:text-orange-500 dark:group-hover:text-orange-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
                                )}
                            </div>

                            <div className="mt-1.5">
                                <p className="font-extrabold text-xs text-gray-900 dark:text-gray-100 group-hover:text-orange-600 dark:group-hover:text-orange-400 transition-colors truncate">
                                    {op.label}
                                </p>
                            </div>
                        </Link>
                    );
                })}
            </div>

            {/* Customizer Modal */}
            <CustomizeQuickOperationsModal
                isOpen={isCustomizeOpen}
                onClose={() => setIsCustomizeOpen(false)}
            />
        </Card>
    );
}
