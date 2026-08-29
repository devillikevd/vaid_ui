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

const ROUTE_PORTAL_MAP: Record<string, string> = {
    '/admin': 'admin',
    '/doctor': 'doctor',
    '/hospital': 'hospital',
    '/clinic': 'clinic',
    '/diagnostic-center': 'diagnostic_center',
    '/wellness': 'wellness_coach',
    '/fitness-center': 'fitness_center_owner',
    '/pharmacy': 'pharmacy',
    '/consultation': 'doctor',
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
    '/consultation': 'doctor',
};

export async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl;

    const matchedPrefix = Object.keys(ROUTE_PORTAL_MAP).find((prefix) =>
        pathname.startsWith(prefix)
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
    ],
};
