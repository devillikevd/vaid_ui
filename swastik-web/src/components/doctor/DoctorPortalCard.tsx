import React from 'react';
import { cn } from '@/lib/utils';

export interface DoctorPortalCardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'compact' | 'standard' | 'detailed' | 'empty';
    children: React.ReactNode;
    hoverEffect?: boolean;
}

export function DoctorPortalCard({ 
    variant = 'standard', 
    children, 
    hoverEffect = false,
    className, 
    ...props 
}: DoctorPortalCardProps) {
    const variants = {
        compact: 'p-4 sm:p-5',
        standard: 'p-5 sm:p-6',
        detailed: 'p-6 sm:p-8',
        empty: 'p-8 sm:p-12 flex flex-col items-center justify-center text-center',
    };

    const isInteractive = hoverEffect || !!props.onClick;

    return (
        <div 
            className={cn(
                'bg-white dark:bg-[#111c2e] border border-gray-200 dark:border-gray-800 rounded-3xl transition-all duration-200',
                variants[variant],
                isInteractive && 'cursor-pointer hover:-translate-y-0.5 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-700 dark:hover:shadow-black/40 hover:bg-gray-50/50 dark:hover:bg-[#152336]',
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
}
