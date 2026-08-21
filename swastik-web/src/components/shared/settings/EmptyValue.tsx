import React from 'react';
import { cn } from '@/lib/utils';

interface EmptyValueProps {
    text?: string;
    className?: string;
}

export function EmptyValue({ text, className }: EmptyValueProps) {
    return (
        <span className={cn("text-gray-400 dark:text-gray-500 italic text-sm", className)}>
            {text || 'Not provided'}
        </span>
    );
}
