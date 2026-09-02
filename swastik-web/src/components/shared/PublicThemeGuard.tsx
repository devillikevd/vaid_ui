'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

const PORTAL_PREFIXES = [
    '/patient',
    '/doctor',
    '/clinic',
    '/hospital',
    '/pharmacy',
    '/diagnostic-center',
    '/wellness',
    '/fitness-center',
    '/admin',
];

export function isPortalPath(pathname: string | null): boolean {
    if (!pathname) return false;
    // Login, register, and auth routes under any prefix are always public
    if (
        pathname.startsWith('/login') ||
        pathname.startsWith('/register') ||
        pathname.startsWith('/forgot-password') ||
        pathname.startsWith('/reset-password') ||
        pathname.startsWith('/verify-email') ||
        pathname === '/admin/login' ||
        pathname.startsWith('/admin/login')
    ) {
        return false;
    }
    return PORTAL_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function PublicThemeGuard() {
    const pathname = usePathname();

    useEffect(() => {
        if (!isPortalPath(pathname)) {
            const root = document.documentElement;
            root.classList.remove('dark');
            root.classList.add('light');
            root.style.colorScheme = 'light';
        }
    }, [pathname]);

    return null;
}
