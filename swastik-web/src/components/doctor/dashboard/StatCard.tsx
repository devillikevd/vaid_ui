'use client';

import React from 'react';
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react';
import { motion } from 'framer-motion';

export interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    trend?: {
        value: number;
        isPositive: boolean;
        label: string;
    };
    delay?: number;
    isLoading?: boolean;
}

export function StatCard({ title, value, icon: Icon, trend, delay = 0, isLoading = false }: StatCardProps) {
    if (isLoading) {
        return (
            <div className="bg-[rgba(255,255,255,0.02)] backdrop-blur-xl border border-[rgba(255,255,255,0.05)] rounded-2xl p-5 w-full flex flex-col justify-between min-h-[140px] animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="w-24 h-4 bg-white/10 rounded" />
                    <div className="w-10 h-10 bg-white/10 rounded-xl" />
                </div>
                <div className="space-y-3 mt-4">
                    <div className="w-16 h-8 bg-white/10 rounded" />
                    <div className="w-32 h-3 bg-white/10 rounded" />
                </div>
            </div>
        );
    }

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay, ease: "easeOut" }}
            className="group relative bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.03)] backdrop-blur-xl border border-[rgba(255,255,255,0.05)] rounded-2xl p-5 w-full flex flex-col justify-between transition-all duration-300 hover:shadow-[0_8px_30px_rgba(34,197,94,0.08)] overflow-hidden"
        >
            {/* Subtle Gradient Glow */}
            <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-green-500/10 rounded-full blur-[40px] group-hover:bg-green-500/20 transition-all duration-500 pointer-events-none" />

            <div className="flex items-start justify-between relative z-10">
                <h3 className="text-[#A1A1AA] text-sm font-medium tracking-wide">{title}</h3>
                <div className="w-10 h-10 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] flex items-center justify-center shadow-sm group-hover:scale-110 group-hover:border-[#22C55E]/30 group-hover:bg-[#22C55E]/10 transition-all duration-300">
                    <Icon className="w-5 h-5 text-white/70 group-hover:text-[#22C55E] transition-colors" />
                </div>
            </div>
            
            <div className="mt-4 relative z-10">
                <div className="flex items-baseline gap-2">
                    {/* If value is number, we could use framer-motion useSpring here, but standard text is fine for v1 */}
                    <span className="text-3xl font-bold text-white tracking-tight">{value}</span>
                </div>
                
                {trend && (
                    <div className="flex items-center gap-2 mt-2">
                        <div className={`flex items-center gap-1 text-[11px] font-bold px-1.5 py-0.5 rounded-md ${trend.isPositive ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                            {trend.isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {trend.value}%
                        </div>
                        <span className="text-[11px] text-[#A1A1AA]">{trend.label}</span>
                    </div>
                )}
            </div>
        </motion.div>
    );
}
