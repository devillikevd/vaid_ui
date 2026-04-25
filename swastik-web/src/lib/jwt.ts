type JwtPayload = {
    exp?: number;
    role?: string;
    [key: string]: unknown;
};

function decodeBase64Url(value: string): string {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');

    if (typeof atob === 'function') {
        return atob(padded);
    }

    return Buffer.from(padded, 'base64').toString('utf8');
}

export function decodeJwtPayload(token: string): JwtPayload | null {
    const [, payload] = token.split('.');

    if (!payload) {
        return null;
    }

    try {
        return JSON.parse(decodeBase64Url(payload)) as JwtPayload;
    } catch {
        return null;
    }
}
