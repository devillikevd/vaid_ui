import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Middleware for server-side route protection.
 * Reads the `swastik-role` cookie (set by authStore on login)
 * and validates JWT expiry from the `swastik-token` cookie.
 * Enforces role-based access to protected routes.
 */

/** Decode JWT payload and check if expired (server-side, no secret needed for expiry check) */
function isJwtExpiredServer(token: string): boolean {
    try {
        const parts = token.split('.');
        if (parts.length !== 3) return true;
        const payload = JSON.parse(atob(parts[1]));
        if (!payload.exp) return false;
        return Date.now() >= payload.exp * 1000;
    } catch {
        return true;
    }
}

// Map of protected route prefixes to allowed roles
const ROUTE_ROLES: Record<string, string[]> = {
    '/admin': ['admin'],
    '/doctor': ['doctor'],
    '/hospital': ['hospital_owner'],
    '/clinic': ['clinic_owner'],
    '/diagnostic-center': ['diagnostic_center_owner'],
    '/pharmacy': ['pharmacy_owner'],
    '/patient': ['patient'],
    '/consultation': ['doctor', 'patient'],
};

// Role → login page mapping
const ROLE_LOGIN: Record<string, string> = {
    admin: '/login/admin',
    doctor: '/login/doctor',
    patient: '/login/patient',
    hospital_owner: '/login/hospital',
    clinic_owner: '/login/clinic',
    diagnostic_center_owner: '/login/diagnostic-center',
    pharmacy_owner: '/login/pharmacy',
};

// Route prefix → login slug mapping (single source of truth)
const ROUTE_TO_LOGIN_SLUG: Record<string, string> = {
    '/admin': 'admin',
    '/doctor': 'doctor',
    '/hospital': 'hospital',
    '/clinic': 'clinic',
    '/diagnostic-center': 'diagnostic-center',
    '/pharmacy': 'pharmacy',
    '/consultation': 'doctor', // Default consultation login to doctor portal
};

export function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Find which protected prefix matches
    const matchedPrefix = Object.keys(ROUTE_ROLES).find((prefix) =>
        pathname.startsWith(prefix)
    );

    // Not a protected route — allow
    if (!matchedPrefix) {
        return NextResponse.next();
    }

    const role = request.cookies.get('swastik-role')?.value;

    // No role cookie → redirect to appropriate login
    if (!role) {
        const loginSlug = ROUTE_TO_LOGIN_SLUG[matchedPrefix] || matchedPrefix.replace('/', '');

        // Patient routes → redirect to landing page (patients use mobile app)
        if (matchedPrefix === '/patient') {
            return NextResponse.redirect(new URL('/', request.url));
        }

        const loginUrl = new URL(`/login/${loginSlug}`, request.url);
        loginUrl.searchParams.set('redirect', pathname);
        return NextResponse.redirect(loginUrl);
    }

    // Check if user's role is allowed for this route
    const allowedRoles = ROUTE_ROLES[matchedPrefix];
    if (!allowedRoles.includes(role)) {
        // User is logged in but wrong role — redirect to their home
        const homeRoute = Object.entries(ROUTE_ROLES).find(([, roles]) =>
            roles.includes(role)
        );
        if (homeRoute) {
            return NextResponse.redirect(new URL(homeRoute[0], request.url));
        }
        // Unknown role — redirect to landing
        return NextResponse.redirect(new URL('/', request.url));
    }

    // Validate JWT expiry if token cookie exists (defence-in-depth)
    const token = request.cookies.get('swastik-token')?.value;
    if (token && isJwtExpiredServer(token)) {
        // Token expired — clear cookies and redirect to login
        const loginSlug = ROUTE_TO_LOGIN_SLUG[matchedPrefix] || matchedPrefix.replace('/', '');
        const loginUrl = new URL(`/login/${loginSlug}`, request.url);
        loginUrl.searchParams.set('redirect', pathname);
        loginUrl.searchParams.set('expired', '1');
        const response = NextResponse.redirect(loginUrl);
        response.cookies.set('swastik-role', '', { maxAge: 0, path: '/' });
        response.cookies.set('swastik-token', '', { maxAge: 0, path: '/' });
        return response;
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        '/admin/:path*',
        '/doctor/:path*',
        '/hospital/:path*',
        '/clinic/:path*',
        '/diagnostic-center/:path*',
        '/pharmacy/:path*',
        '/patient/:path*',
        '/consultation/:path*',
    ],
};
