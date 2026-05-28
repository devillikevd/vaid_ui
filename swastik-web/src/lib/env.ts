const DEFAULT_API_URL = 'http://localhost:5001/api';

type PublicEnv = {
    apiUrl: string;
    socketUrl: string;
    aiWsUrl: string;
    isProduction: boolean;
};

function stripTrailingSlash(value: string): string {
    return value.replace(/\/+$/, '');
}

function requireValidUrl(value: string, label: string): URL {
    try {
        return new URL(value);
    } catch {
        throw new Error(`[swastik-web] Invalid ${label}: ${value}`);
    }
}

function deriveSocketUrl(apiUrl: string): string {
    const url = requireValidUrl(apiUrl, 'NEXT_PUBLIC_API_URL');
    return stripTrailingSlash(`${url.protocol}//${url.host}`);
}

function deriveAiWsUrl(apiUrl: string): string {
    // The Node.js backend proxies /ws/vitals/* to the FastAPI AI service,
    // so the browser connects to the same host without a separate port.
    const url = requireValidUrl(apiUrl, 'NEXT_PUBLIC_API_URL');
    const protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    const portPart = url.port ? `:${url.port}` : '';
    return `${protocol}//${url.hostname}${portPart}`;
}

const rawApiUrl = stripTrailingSlash(process.env.NEXT_PUBLIC_API_URL?.trim() || DEFAULT_API_URL);
const rawSocketUrl = stripTrailingSlash(process.env.NEXT_PUBLIC_SOCKET_URL?.trim() || deriveSocketUrl(rawApiUrl));
const rawAiWsUrl = stripTrailingSlash(process.env.NEXT_PUBLIC_AI_WS_URL?.trim() || deriveAiWsUrl(rawApiUrl));

export const PUBLIC_ENV: PublicEnv = {
    apiUrl: rawApiUrl,
    socketUrl: rawSocketUrl,
    aiWsUrl: rawAiWsUrl,
    isProduction: process.env.NODE_ENV === 'production',
};

export const PUBLIC_API_URL = PUBLIC_ENV.apiUrl;
export const PUBLIC_SOCKET_URL = PUBLIC_ENV.socketUrl;
export const PUBLIC_AI_WS_URL = PUBLIC_ENV.aiWsUrl;

function validatePublicEnv(env: PublicEnv) {
    const apiUrl = requireValidUrl(env.apiUrl, 'NEXT_PUBLIC_API_URL');
    const socketUrl = requireValidUrl(env.socketUrl, 'NEXT_PUBLIC_SOCKET_URL');
    const aiWsUrl = requireValidUrl(env.aiWsUrl, 'NEXT_PUBLIC_AI_WS_URL');
    const isLocalHost = (hostname: string) =>
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '10.0.2.2';

    const fatalIssues: string[] = [];
    const warningIssues: string[] = [];

    if (!apiUrl.pathname.endsWith('/api')) {
        fatalIssues.push('NEXT_PUBLIC_API_URL should end with /api so portal requests stay on the backend API prefix.');
    }

    if (!['http:', 'https:'].includes(socketUrl.protocol)) {
        fatalIssues.push('NEXT_PUBLIC_SOCKET_URL must use http:// or https:// because Socket.IO starts from an HTTP origin.');
    }

    if (!['ws:', 'wss:'].includes(aiWsUrl.protocol)) {
        fatalIssues.push('NEXT_PUBLIC_AI_WS_URL must use ws:// or wss://.');
    }

    if (apiUrl.protocol === 'https:' && socketUrl.protocol !== 'https:') {
        fatalIssues.push('NEXT_PUBLIC_SOCKET_URL must use https:// when NEXT_PUBLIC_API_URL uses https://.');
    }

    if (apiUrl.protocol === 'https:' && aiWsUrl.protocol !== 'wss:') {
        fatalIssues.push('NEXT_PUBLIC_AI_WS_URL must use wss:// when NEXT_PUBLIC_API_URL uses https://.');
    }

    if (env.isProduction) {
        if (!process.env.NEXT_PUBLIC_API_URL) {
            warningIssues.push('NEXT_PUBLIC_API_URL is not set, so the portal is falling back to localhost defaults.');
        }

        if (isLocalHost(apiUrl.hostname)) {
            warningIssues.push('NEXT_PUBLIC_API_URL points to a local host during a production build.');
        }

        if (isLocalHost(socketUrl.hostname)) {
            warningIssues.push('NEXT_PUBLIC_SOCKET_URL points to a local host during a production build.');
        }

        if (isLocalHost(aiWsUrl.hostname)) {
            warningIssues.push('NEXT_PUBLIC_AI_WS_URL points to a local host during a production build.');
        }
    }

    return { fatalIssues, warningIssues };
}

const { fatalIssues, warningIssues } = validatePublicEnv(PUBLIC_ENV);

if (fatalIssues.length > 0) {
    const message =
        `[swastik-web] Public environment configuration error:\n- ${fatalIssues.join('\n- ')}`;

    throw new Error(message);
}

const globalWarnings = globalThis as typeof globalThis & {
    __swastikPublicEnvWarningShown?: boolean;
};

if (
    warningIssues.length > 0 &&
    typeof window === 'undefined' &&
    !globalWarnings.__swastikPublicEnvWarningShown
) {
    globalWarnings.__swastikPublicEnvWarningShown = true;
    console.warn(
        `[swastik-web] Public environment warning:\n- ${warningIssues.join('\n- ')}`
    );
}
