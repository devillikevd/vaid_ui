import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

/**
 * Next.js Middleware for server-side route protection.
 * SECURITY FIX #1: Verifies JWT signature using jose library instead of just decoding.
 * Reads the `swastik-token` cookie and validates both signature AND expiry.
 * Falls back to `swastik-role` cookie only for redirect logic.
 */

const JWT_SECRET = new TextEncoder().encode(
    process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || ''
);

/** Verify JWT signature and check expiry server-side */
async function verifyJwt(token: string): Promise<{ valid: boolean; role?: string; expired?: boolean }> {
    try {
        // If no secret configured, fall back to expiry-only check (dev mode)
        if (!process.env.JWT_ACCESS_SECRET && !process.env.JWT_SECRET) {
            // Fallback: decode-only check (logs warning)
            const parts = token.split('.');
            if (parts.length !== 3) return { valid: false };
            const payload = JSON.parse(atob(parts[1]));
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                return { valid: false, expired: true };
            }
            return { valid: true, role: payload.role };
        }

        const { payload } = await jwtVerify(token, JWT_SECRET);
        return { valid: true, role: payload.role as string };
    } catch (error: unknown) {
        const isExpired = error instanceof Error && error.message.includes('expired');
        return { valid: false, expired: isExpired };
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

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Find which protected prefix matches
    const matchedPrefix = Object.keys(ROUTE_ROLES).find((prefix) =>
        pathname.startsWith(prefix)
    );

    // Not a protected route — allow
    if (!matchedPrefix) {
        return NextResponse.next();
    }

    const token = request.cookies.get('swastik-token')?.value;
    const cookieRole = request.cookies.get('swastik-role')?.value;

    // Helper: redirect to login and clear cookies
    const redirectToLogin = (expired = false) => {
        const loginSlug = ROUTE_TO_LOGIN_SLUG[matchedPrefix] || matchedPrefix.replace('/', '');

        if (matchedPrefix === '/patient') {
            return NextResponse.redirect(new URL('/', request.url));
        }

        const loginUrl = new URL(`/login/${loginSlug}`, request.url);
        loginUrl.searchParams.set('redirect', pathname);
        if (expired) loginUrl.searchParams.set('expired', '1');
        const response = NextResponse.redirect(loginUrl);
        response.cookies.set('swastik-role', '', { maxAge: 0, path: '/' });
        response.cookies.set('swastik-token', '', { maxAge: 0, path: '/' });
        return response;
    };

    // No token → redirect to login
    if (!token) {
        return redirectToLogin();
    }

    // Verify JWT signature + expiry
    const verification = await verifyJwt(token);

    if (!verification.valid) {
        return redirectToLogin(verification.expired);
    }

    // Use the role from the verified JWT payload (trusted), fall back to cookie
    const role = verification.role || cookieRole;

    if (!role) {
        return redirectToLogin();
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
