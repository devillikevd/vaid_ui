'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

/**
 * Consistent "← Provider Selection" link for all provider login pages.
 * Always navigates to /login (the canonical provider/role selection page).
 */
export function ProviderSelectionLink() {
    return (
        <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-[#A1A1AA] hover:text-white transition-colors cursor-pointer select-none"
        >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Provider Selection</span>
        </Link>
    );
}
