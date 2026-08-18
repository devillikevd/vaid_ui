import React from 'react';
import { cn } from '@/lib/utils';
import { DoctorPortalCard } from './DoctorPortalCard';

export interface MetricCardProps {
    title: string;
    value: string | number;
    icon: React.ReactNode;
    trend?: {
        value: number;
        label: string;
        direction?: 'up' | 'down' | 'neutral';
    };
    className?: string;
    iconClassName?: string;
}

export function MetricCard({
    title,
    value,
    icon,
    trend,
    className,
    iconClassName
}: MetricCardProps) {
    const trendColor = 
        trend?.direction === 'up' ? 'text-emerald-600 dark:text-emerald-400' : 
        trend?.direction === 'down' ? 'text-red-600 dark:text-red-400' : 
        'text-gray-500 dark:text-gray-400';

    const TrendIcon = trend?.direction === 'up' ? (
        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>
    ) : trend?.direction === 'down' ? (
        <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg>
    ) : null;

    return (
        <DoctorPortalCard variant="compact" className={cn("flex flex-col h-full", className)}>
            <div className="flex items-start justify-between gap-4">
                <div className={cn(
                    "p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/30 text-brand-600 dark:text-brand-400 shrink-0",
                    iconClassName
                )}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0 text-right">
                    <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider truncate mb-1">
                        {title}
                    </p>
                    <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white truncate">
                        {value}
                    </h3>
                </div>
            </div>
            
            {trend && (
                <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800/60 flex items-center justify-end">
                    <div className={cn("flex items-center text-xs font-bold", trendColor)}>
                        {TrendIcon}
                        <span>{Math.abs(trend.value)}%</span>
                        <span className="text-gray-500 dark:text-gray-500 ml-1.5 font-medium truncate">
                            {trend.label}
                        </span>
                    </div>
                </div>
            )}
        </DoctorPortalCard>
    );
}
