import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { doesRoleMatchPortal } from './lib/roles';

async function verifyJwt(token: string): Promise<{ valid: boolean; role?: string; expired?: boolean }> {
    try {
        const secretStr = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;
        if (!secretStr) {
            console.error('[swastik-web] JWT_ACCESS_SECRET is required for route protection.');
            return { valid: false };
        }

        const jwtSecret = new TextEncoder().encode(secretStr);
        const { payload } = await jwtVerify(token, jwtSecret);
        return { valid: true, role: payload.role as string };
    } catch (error: unknown) {
        const isExpired = error instanceof Error && error.message.includes('expired');
        return { valid: false, expired: isExpired };
    }
}

const ROUTE_PORTAL_MAP: Record<string, string | string[]> = {
    '/admin': 'admin',
    '/doctor': 'doctor',
    '/hospital': 'hospital',
    '/clinic': 'clinic',
    '/diagnostic-center': 'diagnostic_center',
    '/wellness': 'wellness_coach',
    '/fitness-center': 'fitness_center_owner',
    '/pharmacy': 'pharmacy',
    '/consultation': ['patient', 'doctor', 'clinic', 'hospital', 'wellness_coach', 'fitness_center_owner', 'admin'],
    '/patient/appointments': 'patient',
    '/patient/records': 'patient',
    '/patient/digital-health-card': 'patient',
    '/patient/health-id': 'patient',
    '/patient/assistant': 'patient',
};

const ROUTE_TO_LOGIN_SLUG: Record<string, string> = {
    '/admin': 'admin',
    '/doctor': 'doctor',
    '/hospital': 'hospital',
    '/clinic': 'clinic',
    '/diagnostic-center': 'diagnostic-center',
    '/wellness': 'wellness',
    '/fitness-center': 'fitness-center',
    '/pharmacy': 'pharmacy',
    '/consultation': 'patient',
    '/patient/appointments': 'patient',
    '/patient/records': 'patient',
    '/patient/digital-health-card': 'patient',
    '/patient/health-id': 'patient',
    '/patient/assistant': 'patient',
};

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // Match longest matching prefix first to properly separate private patient sub-routes
    const sortedPrefixes = Object.keys(ROUTE_PORTAL_MAP).sort((a, b) => b.length - a.length);
    const matchedPrefix = sortedPrefixes.find((prefix) =>
        pathname === prefix || pathname.startsWith(`${prefix}/`)
    );

    if (!matchedPrefix) {
        return NextResponse.next();
    }

    if (pathname === '/admin/login') {
        return NextResponse.next();
    }

    const token = request.cookies.get('swastik-token')?.value || request.cookies.get('accessToken')?.value;
    const cookieRole = request.cookies.get('swastik-role')?.value;

    const redirectToLogin = (expired = false) => {
        let loginUrlPath = '';
        if (matchedPrefix === '/admin') {
            loginUrlPath = '/admin/login';
        } else if (matchedPrefix === '/consultation') {
            const effectiveRole = cookieRole || 'patient';
            const loginSlug = effectiveRole === 'doctor' ? 'doctor' : 'patient';
            loginUrlPath = `/login/${loginSlug}`;
        } else {
            const loginSlug = ROUTE_TO_LOGIN_SLUG[matchedPrefix] || matchedPrefix.replace('/', '');
            loginUrlPath = `/login/${loginSlug}`;
        }
        
        const loginUrl = new URL(loginUrlPath, request.url);
        loginUrl.searchParams.set('redirect', pathname);
        if (expired) loginUrl.searchParams.set('expired', '1');
        const response = NextResponse.redirect(loginUrl);
        if (expired) {
            response.cookies.set('swastik-role', '', { maxAge: 0, path: '/' });
            response.cookies.set('swastik-token', '', { maxAge: 0, path: '/' });
            response.cookies.set('accessToken', '', { maxAge: 0, path: '/' });
        }
        return response;
    };

    if (!token) {
        return redirectToLogin();
    }

    const verification = await verifyJwt(token);

    if (!verification.valid) {
        return redirectToLogin(verification.expired);
    }

    const role = verification.role || cookieRole;

    if (!role) {
        return redirectToLogin();
    }

    const targetPortal = ROUTE_PORTAL_MAP[matchedPrefix];
    const isAllowed = doesRoleMatchPortal(role, targetPortal);

    if (!isAllowed) {
        return redirectToLogin();
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
        '/wellness/:path*',
        '/fitness-center/:path*',
        '/pharmacy/:path*',
        '/consultation/:path*',
        '/patient/appointments/:path*',
        '/patient/appointments',
        '/patient/records/:path*',
        '/patient/records',
        '/patient/digital-health-card/:path*',
        '/patient/digital-health-card',
        '/patient/health-id/:path*',
        '/patient/health-id',
        '/patient/assistant/:path*',
        '/patient/assistant',
    ],
};

