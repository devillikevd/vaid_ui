/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';

/**
 * Computes standardized doctor initials:
 * - "Dr. Divyanshu Singh Chauhan" -> "DC" (first word initial + last word initial)
 * - "Dr. Ashish Kumar" -> "AK"
 * - "Dr. Divyanshu" -> "DI" (single word -> first 2 characters)
 * - null/empty -> "DR"
 */
export function getDoctorInitials(name?: string | null): string {
    if (!name || typeof name !== 'string') return 'DR';
    const cleaned = name.trim().replace(/^(dr\.?|doctor)\s+/i, '').trim();
    if (!cleaned) return 'DR';
    const words = cleaned.split(/\s+/).filter(Boolean);
    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }
    const firstInitial = words[0].charAt(0);
    const lastInitial = words[words.length - 1].charAt(0);
    return `${firstInitial}${lastInitial}`.toUpperCase();
}

interface DoctorAvatarProps {
    src?: string | null;
    name?: string | null;
    className?: string;
    fallbackClassName?: string;
    alt?: string;
}

export function DoctorAvatar({
    src,
    name,
    className = 'w-14 h-14 rounded-2xl object-cover border border-gray-200 dark:border-gray-700 shadow-sm shrink-0',
    fallbackClassName = 'w-14 h-14 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-extrabold text-lg flex items-center justify-center border border-emerald-200 dark:border-emerald-800 shadow-sm shrink-0',
    alt,
}: DoctorAvatarProps) {
    const [hasError, setHasError] = useState(false);

    // Reset error state if src changes
    useEffect(() => {
        setHasError(false);
    }, [src]);

    const initials = getDoctorInitials(name);

    if (src && !hasError) {
        return (
            <img
                src={src}
                alt={alt || name || 'Doctor avatar'}
                onError={() => setHasError(true)}
                className={className}
            />
        );
    }

    return (
        <div className={fallbackClassName} aria-label={alt || name || 'Doctor avatar'}>
            {initials}
        </div>
    );
}
