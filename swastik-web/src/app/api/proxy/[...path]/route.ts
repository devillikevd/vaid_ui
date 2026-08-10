import { NextRequest, NextResponse } from 'next/server';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';

async function proxyHandler(req: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
    // Next.js 15+ passes params as a Promise, handle both Promise and object for compatibility
    const resolvedParams = await params;
    const path = resolvedParams.path.join('/');
    const targetUrl = new URL(`/api/${path}`, API_BASE_URL);
    
    // Copy search params
    req.nextUrl.searchParams.forEach((value, key) => {
        targetUrl.searchParams.append(key, value);
    });

    const headers = new Headers();
    // Forward relevant headers
    const contentType = req.headers.get('content-type');
    if (contentType) headers.set('content-type', contentType);
    
    // Extract tokens from HttpOnly cookies
    const accessToken = req.cookies.get('accessToken')?.value;
    if (accessToken) {
        headers.set('authorization', `Bearer ${accessToken}`);
    }

    try {
        const fetchOptions: RequestInit = {
            method: req.method,
            headers,
            // Next.js requires body to be null for GET/HEAD
            body: ['GET', 'HEAD'].includes(req.method) ? null : await req.arrayBuffer(),
        };

        const response = await fetch(targetUrl.toString(), fetchOptions);
        
        // Handle response
        const responseHeaders = new Headers(response.headers);
        // Remove backend cookies if any to prevent conflicts, or we can handle auth cookies specifically
        responseHeaders.delete('set-cookie');

        let responseBody: any = response.body;
        let data: any = null;

        // If the route was an auth route (login/refresh), intercept the JSON to set the HttpOnly cookies
        if (path.includes('auth/login') || path.includes('auth/refresh') || path.includes('auth/register')) {
            const dataText = await response.text();
            responseBody = dataText;
            try {
                data = JSON.parse(dataText);
            } catch (e) {}
        }

        // Create the Next.js response
        const nextResponse = new NextResponse(responseBody, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });

        if (data && data.success && data.accessToken && data.refreshToken) {
            // Set HttpOnly cookies
            nextResponse.cookies.set('accessToken', data.accessToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 // 30 days
            });
            nextResponse.cookies.set('refreshToken', data.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 // 30 days
            });
            if (data.aiServiceToken) {
                nextResponse.cookies.set('aiServiceToken', data.aiServiceToken, {
                    httpOnly: true,
                    secure: process.env.NODE_ENV === 'production',
                    sameSite: 'lax',
                    path: '/',
                    maxAge: 15 * 60 // 15 mins
                });
            }
            
            // Set a readable cookie for frontend state
            nextResponse.cookies.set('isAuthenticated', 'true', {
                httpOnly: false,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                path: '/',
                maxAge: 30 * 24 * 60 * 60 // 30 days
            });
        }

        // Handle logout
        if (path.includes('auth/logout')) {
            nextResponse.cookies.set('accessToken', '', { maxAge: 0, path: '/' });
            nextResponse.cookies.set('refreshToken', '', { maxAge: 0, path: '/' });
            nextResponse.cookies.set('aiServiceToken', '', { maxAge: 0, path: '/' });
            nextResponse.cookies.set('isAuthenticated', '', { maxAge: 0, path: '/' });
        }

        return nextResponse;
    } catch (error: any) {
        return NextResponse.json(
            { success: false, message: 'Proxy Error', error: error.message },
            { status: 502 }
        );
    }
}
export { proxyHandler as GET, proxyHandler as POST, proxyHandler as PUT, proxyHandler as DELETE, proxyHandler as PATCH, proxyHandler as OPTIONS };
