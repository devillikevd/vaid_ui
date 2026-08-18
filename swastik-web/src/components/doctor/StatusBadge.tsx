import React from 'react';
import { cn } from '@/lib/utils';

export type StatusType = 
    | 'active' | 'accepted' | 'completed' 
    | 'pending' | 'invitation' | 'join_request' | 'requested'
    | 'rejected' | 'declined' | 'cancelled' | 'expired'
    | 'changes_requested' | 'in_progress';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    status: StatusType | string;
    label?: string;
    size?: 'sm' | 'md';
    animatePulse?: boolean;
}

const statusConfig: Record<string, { color: string; dot: string; defaultLabel: string }> = {
    active:    { color: 'text-emerald-800 bg-emerald-100/90 dark:text-emerald-300 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-500', defaultLabel: 'Active' },
    accepted:  { color: 'text-emerald-800 bg-emerald-100/90 dark:text-emerald-300 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-500', defaultLabel: 'Accepted' },
    completed: { color: 'text-emerald-800 bg-emerald-100/90 dark:text-emerald-300 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800', dot: 'bg-emerald-500', defaultLabel: 'Completed' },
    
    pending:   { color: 'text-amber-900 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800', dot: 'bg-amber-500', defaultLabel: 'Pending Review' },
    invitation:{ color: 'text-amber-900 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800', dot: 'bg-amber-500', defaultLabel: 'Invitation' },
    join_request:{ color: 'text-purple-800 bg-purple-100 dark:text-purple-300 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800', dot: 'bg-purple-500', defaultLabel: 'Join Request' },
    requested: { color: 'text-amber-900 bg-amber-100 dark:text-amber-300 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800', dot: 'bg-amber-500', defaultLabel: 'Requested' },
    
    rejected:  { color: 'text-red-800 bg-red-100 dark:text-red-300 dark:bg-red-950/60 border-red-300 dark:border-red-800', dot: 'bg-red-500', defaultLabel: 'Declined' },
    declined:  { color: 'text-red-800 bg-red-100 dark:text-red-300 dark:bg-red-950/60 border-red-300 dark:border-red-800', dot: 'bg-red-500', defaultLabel: 'Declined' },
    cancelled: { color: 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800/80 border-gray-300 dark:border-gray-700', dot: 'bg-gray-500', defaultLabel: 'Cancelled' },
    expired:   { color: 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800/80 border-gray-300 dark:border-gray-700', dot: 'bg-gray-500', defaultLabel: 'Expired' },
    
    changes_requested: { color: 'text-purple-900 bg-purple-100 dark:text-purple-300 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800', dot: 'bg-purple-500', defaultLabel: 'Changes Proposed' },
    in_progress: { color: 'text-blue-800 bg-blue-100 dark:text-blue-300 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800', dot: 'bg-blue-500', defaultLabel: 'In Progress' },
};

export function StatusBadge({ 
    status, 
    label, 
    size = 'sm', 
    animatePulse,
    className,
    ...props 
}: StatusBadgeProps) {
    const normalizedStatus = status.toLowerCase();
    const config = statusConfig[normalizedStatus] || { 
        color: 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800/80 border-gray-300 dark:border-gray-700', 
        dot: 'bg-gray-500', 
        defaultLabel: status 
    };
    
    const displayLabel = label || config.defaultLabel;
    
    // Check if we should auto-animate pulse for active states if not explicitly provided
    const shouldPulse = animatePulse !== undefined ? animatePulse : ['active', 'accepted', 'in_progress'].includes(normalizedStatus);

    const sizes = {
        sm: 'text-[10px] px-2 py-0.5',
        md: 'text-[11px] px-2.5 py-1',
    };

    return (
        <span 
            className={cn(
                'flex items-center gap-1.5 font-extrabold rounded-full border shrink-0',
                sizes[size],
                config.color,
                className
            )}
            {...props}
        >
            <span className={cn(
                'rounded-full',
                size === 'sm' ? 'w-1.5 h-1.5' : 'w-1.5 h-1.5',
                config.dot,
                shouldPulse ? 'animate-pulse' : ''
            )}/>
            {displayLabel}
        </span>
    );
}
