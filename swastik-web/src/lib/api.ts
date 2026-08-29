import { PUBLIC_API_URL } from './env';

/**
 * VAIDIDEA Healthcare Platform - Centralized API Client
 * All web portal API communication goes through this module.
 * Every store MUST use these functions instead of raw fetch().
 */

export const API_BASE_URL = '/api/proxy';

// ==================== Types ====================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext?: boolean;
        hasPrev?: boolean;
    };
    /** Allow extra keys forwarded from backend (stats, departments, etc.) */
    [key: string]: unknown;
}

export interface PaginatedResponse<T> {
    data: T[];
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// ==================== Token Management ====================

let accessToken: string | null = null;
let refreshToken: string | null = null;
let aiServiceToken: string | null = null;

const DEFAULT_AUTH_COOKIE_MAX_AGE = 60 * 60 * 24;

type TokenLike = {
    accessToken?: string | null;
    access_token?: string | null;
    token?: string | null;
    refreshToken?: string | null;
    refresh_token?: string | null;
    aiServiceToken?: string | null;
    ai_service_token?: string | null;
};

export function resolveAccessToken(payload: TokenLike | null | undefined): string | null {
    return normalizeStoredToken(payload?.accessToken || payload?.access_token || payload?.token || null);
}

export function resolveRefreshToken(payload: TokenLike | null | undefined): string | null {
    return normalizeStoredToken(payload?.refreshToken || payload?.refresh_token || null);
}

export function resolveAIServiceToken(payload: TokenLike | null | undefined): string | null {
    return normalizeStoredToken(payload?.aiServiceToken || payload?.ai_service_token || null);
}

function normalizeStoredToken(token: string | null | undefined): string | null {
    if (!token || token === 'undefined' || token === 'null') {
        return null;
    }

    return token;
}

function syncCookie(name: string, value: string | null, maxAge: number = DEFAULT_AUTH_COOKIE_MAX_AGE) {
    if (typeof document === 'undefined') {
        return;
    }

    if (!value) {
        document.cookie = `${name}=; path=/; max-age=0`;
        return;
    }

    // L002: Secure flag is on by default for HTTPS. Set
    // NEXT_PUBLIC_COOKIE_SECURE=true to force it in non-prod (e.g. behind an
    // https terminator where location.protocol may still report http), or
    // =false to disable it explicitly (http dev on loopback only).
    const secureOverride = process.env.NEXT_PUBLIC_COOKIE_SECURE;
    const isSecure =
        secureOverride === 'true' ? true
            : secureOverride === 'false' ? false
                : typeof location !== 'undefined' && location.protocol === 'https:';
    const secureFlag = isSecure ? '; Secure' : '';
    document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Strict${secureFlag}`;
}

export const setTokens = (
    access: string | null | undefined,
    refresh: string | null | undefined,
    options: { cookieMaxAge?: number; role?: string | null; aiServiceToken?: string | null } = {}
) => {
    accessToken = normalizeStoredToken(access);
    refreshToken = normalizeStoredToken(refresh);
    aiServiceToken = normalizeStoredToken(options.aiServiceToken);

    if (typeof window !== 'undefined') {
        syncCookie('swastik-token', accessToken, options.cookieMaxAge);
        syncCookie('accessToken', accessToken, options.cookieMaxAge);
        if (refreshToken) {
            syncCookie('refreshToken', refreshToken, options.cookieMaxAge);
            syncCookie('swastik-refresh-token', refreshToken, options.cookieMaxAge);
        }
        if (options.aiServiceToken) {
            syncCookie('swastik-ai-token', aiServiceToken, 60 * 15);
        } else {
            syncCookie('swastik-ai-token', null);
        }
        if (options.role) {
            syncCookie('swastik-role', options.role, options.cookieMaxAge);
        }
        try {
            if (accessToken) {
                localStorage.setItem('swastik-token', accessToken);
            } else {
                localStorage.removeItem('swastik-token');
            }
        } catch { /* ignore */ }
    }
};

export const getTokens = () => {
    if (typeof window !== 'undefined') {
        if (!accessToken) {
            try {
                accessToken = localStorage.getItem('swastik-token');
            } catch { /* ignore */ }
        }
        if (!accessToken) {
            const match = document.cookie.match(new RegExp('(^| )swastik-token=([^;]+)')) ||
                          document.cookie.match(new RegExp('(^| )accessToken=([^;]+)'));
            if (match) accessToken = match[2];
        }
        if (!aiServiceToken) {
            const match = document.cookie.match(new RegExp('(^| )swastik-ai-token=([^;]+)'));
            if (match) aiServiceToken = match[2];
        }
        accessToken = normalizeStoredToken(accessToken);
        refreshToken = normalizeStoredToken(refreshToken);
        aiServiceToken = normalizeStoredToken(aiServiceToken);
    }
    return { accessToken, refreshToken, aiServiceToken };
};

export const getAIServiceToken = () => {
    const { aiServiceToken: token } = getTokens();
    return token;
};

export const clearTokens = () => {
    accessToken = null;
    refreshToken = null;
    aiServiceToken = null;
    if (typeof window !== 'undefined') {
        syncCookie('swastik-role', null);
        syncCookie('swastik-token', null);
        syncCookie('accessToken', null);
        syncCookie('refreshToken', null);
        syncCookie('swastik-refresh-token', null);
        syncCookie('swastik-ai-token', null);
        try {
            localStorage.removeItem('swastik-token');
        } catch { /* ignore */ }
    }
};

// Human-readable error messages for HTTP status codes (H9 fix)
function getHttpErrorMessage(status: number): string {
    switch (status) {
        case 400: return 'Invalid request. Please check your input.';
        case 401: return 'Session expired. Please log in again.';
        case 403: return 'You don\'t have permission to perform this action.';
        case 404: return 'The requested resource was not found.';
        case 409: return 'This resource already exists or conflicts with another.';
        case 422: return 'Please check the form for errors.';
        case 429: return 'Too many requests. Please wait a moment and try again.';
        case 500: return 'Server error. Please try again later.';
        case 502: return 'Service temporarily unavailable. Please try again.';
        case 503: return 'Service is under maintenance. Please try again later.';
        default: return `Something went wrong (${status}). Please try again.`;
    }
}

// ==================== Core Fetch with Auth ====================

// L009: request timeout is configurable via NEXT_PUBLIC_API_TIMEOUT_MS instead
// of a hardcoded 30s (defaults to 30s for backward compatibility).
const DEFAULT_FETCH_TIMEOUT_MS = Math.max(1000, Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS || 30000));

export async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {},
    _isRetry: boolean = false,
    timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS
): Promise<ApiResponse<T>> {
    const { accessToken: token } = getTokens();

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    // Only set Content-Type for non-FormData bodies (FormData needs browser to set boundary)
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    try {
        // Abort the request after the (configurable) timeout to prevent hanging calls.
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);
        let signal: AbortSignal = controller.signal;
        if (options.signal) {
            // Combine a caller-provided abort signal with the timeout signal.
            if (typeof AbortSignal.any === 'function') {
                signal = AbortSignal.any([options.signal, controller.signal]);
            } else {
                options.signal.addEventListener('abort', () => controller.abort());
            }
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            signal,
        });

        clearTimeout(timeout);

        // Safely parse JSON — handle cases where response isn't valid JSON (e.g., proxy errors)
        let data;
        try {
            data = await response.json();
        } catch {
            if (!response.ok) {
                return { success: false, error: getHttpErrorMessage(response.status) };
            }
            return { success: false, error: 'Invalid response from server.' };
        }

        if (!response.ok) {
            if (response.status === 401) {
                if (!_isRetry) {
                    const refreshed = await refreshAccessToken();
                    if (refreshed) {
                        return fetchWithAuth(endpoint, options, true);
                    }
                }
                // If it's a retry and it failed, or we have no refresh token, or refresh failed:
                clearTokens();
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new Event('swastik-unauthorized'));
                }
            }
            // Return server message if present, otherwise a human-readable fallback
            const serverMsg = data?.message || data?.error;
            const friendlyError = serverMsg || getHttpErrorMessage(response.status);
            return {
                success: false,
                error: friendlyError,
                message: serverMsg || friendlyError,
                code: data?.code,
                status: response.status,
                details: data?.details,
            };
        }

        // Unwrap: backend often returns { success, data: [...], pagination: {...} }
        // or { success, ...serviceResult } where serviceResult = { data, pagination }.
        // We extract the `data` payload for convenience but also preserve sibling
        // keys (pagination, stats, etc.) so stores can access them.
        if (data?.data !== undefined) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { success: _s, data: innerData, ...rest } = data;
            // `rest` captures pagination, stats, or any other top-level keys
            return { success: true, data: innerData, ...rest };
        }
        return { success: true, data };
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            console.error('API Timeout:', endpoint);
            return { success: false, error: 'Request timed out. Please try again.' };
        }
        console.error('API Error:', error);
        
        // Distinguish genuine browser offline vs server unreachable
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            return { success: false, error: 'You are offline. Please check your internet connection.' };
        }
        return { success: false, error: 'Unable to connect to the server. The service might be temporarily down.' };
    }
}

// BUG-C3 Fix: Mutex prevents parallel refresh calls from concurrent 401 responses
let _refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
    // If a refresh is already in-flight, reuse it (same pattern as authStore.ts)
    if (_refreshPromise) return _refreshPromise;

    _refreshPromise = (async () => {
        try {
            // Read refreshToken from getTokens (module memory only — never
            // persisted to localStorage/sessionStorage; M001). The HttpOnly
            // `swastik-refresh-token` cookie set by the backend is the primary
            // source; `credentials: 'include'` sends it automatically.
            const { refreshToken: currentRefreshToken } = getTokens();

            const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(
                    currentRefreshToken ? { refreshToken: currentRefreshToken } : {}
                ),
            });

            if (response.ok) {
                const data = await response.json();
                const tokenPayload = data.data || data;
                const newAccess = resolveAccessToken(tokenPayload);
                const newRefresh = resolveRefreshToken(tokenPayload) || refreshToken;
                if (newAccess) {
                    setTokens(newAccess, newRefresh!, { aiServiceToken: resolveAIServiceToken(tokenPayload) });
                    return true;
                }
            }
            return false;
        } catch {
            return false;
        } finally {
            _refreshPromise = null;
        }
    })();

    return _refreshPromise;
}

// ==================== AUTH API ====================

export const authApi = {
    login: async (email: string, password: string, role?: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, role }),
        });
        const data = await response.json();
        const tokenPayload = data.data || data;
        const token = resolveAccessToken(tokenPayload);
        const rToken = resolveRefreshToken(tokenPayload);
        const userRole = data.data?.user?.role || data.user?.role || role || null;
        if (response.ok && token) {
            setTokens(token, rToken, {
                role: userRole,
                aiServiceToken: resolveAIServiceToken(tokenPayload),
            });
        }
        return data;
    },

    register: async (userData: {
        email: string;
        password: string;
        phone?: string;
        role: string;
        name: string;
        [key: string]: unknown;
    }) => {
        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        return response.json();
    },

    sendRegistrationOtp: async (email: string, name?: string, role?: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/send-registration-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, name, role }),
        });
        return response.json();
    },

    checkDuplicate: async (email?: string, phone?: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/check-duplicate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, phone }),
        });
        return response.json();
    },

    verifyRegistrationOtp: async (email: string, otp: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/verify-registration-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp }),
        });
        return response.json();
    },

    resendVerification: async (email: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/resend-verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        return response.json();
    },

    verifyEmailOtp: async (email: string, otp: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/verify-email-otp`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp }),
        });
        return response.json();
    },

    logout: async () => {
        await fetchWithAuth('/auth/logout', { method: 'POST' });
        clearTokens();
    },

    getProfile: () => fetchWithAuth('/auth/me'),

    updateProfile: (data: Record<string, unknown>) =>
        fetchWithAuth('/auth/me', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    changePassword: (currentPassword: string, newPassword: string) =>
        fetchWithAuth('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({ currentPassword, newPassword }),
        }),

    // Phase 3: Session Management
    getSessions: () => fetchWithAuth('/auth/sessions'),
    
    logoutDevice: (sessionId: string) => 
        fetchWithAuth(`/auth/sessions/${sessionId}`, { method: 'DELETE' }),
        
    logoutAllDevices: (exceptSessionId?: string) =>
        fetchWithAuth('/auth/sessions', {
            method: 'DELETE',
            body: exceptSessionId ? JSON.stringify({ exceptSessionId }) : undefined,
        }),
        
    getLoginHistory: () => fetchWithAuth('/auth/login-history'),

    forgotPassword: async (email: string, role?: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, role }),
        });
        return response.json();
    },

    resetPassword: async (token: string, password: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token, password }),
        });
        return response.json();
    },

    resetPasswordWithOtp: async (email: string, otp: string, password: string, role?: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, password, role }),
        });
        return response.json();
    },
};

// ==================== ADMIN API ====================
// Backend: routes/admin.js

export const adminApi = {
    getDashboard: () => fetchWithAuth('/admin/dashboard'),
    
    // Feedback Management
    getFeedback: (filters?: Record<string, unknown>, page: number = 1, limit: number = 20) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (filters?.status) params.set('status', String(filters.status));
        if (filters?.type) params.set('type', String(filters.type));
        if (filters?.category) params.set('category', String(filters.category));
        if (filters?.userRole) params.set('userRole', String(filters.userRole));
        if (filters?.rating) params.set('rating', String(filters.rating));
        if (filters?.search) params.set('search', String(filters.search));
        return fetchWithAuth(`/admin/feedback?${params}`);
    },
    updateFeedbackStatus: (id: string, status: string, priority?: string) => 
        fetchWithAuth(`/admin/feedback/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status, priority }),
        }),
    respondToFeedback: (id: string, adminResponse: string, status?: string) =>
        fetchWithAuth(`/admin/feedback/${id}/response`, {
            method: 'POST',
            body: JSON.stringify({ adminResponse, status }),
        }),


    getPendingApprovals: (type: string = 'all', page: number = 1, filters?: Record<string, unknown>) => {
        const params = new URLSearchParams({
            type,
            page: page.toString(),
        });
        if (filters?.sort) params.set('sort', String(filters?.sort));
        if (filters?.dateRange) params.set('dateRange', String(filters?.dateRange));
        if (filters?.minCompletion) params.set('minCompletion', String(filters?.minCompletion));
        return fetchWithAuth(`/admin/approvals/pending?${params}`);
    },

    getProviders: (filters?: Record<string, unknown>, page: number = 1, limit: number = 20) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (filters?.type) params.set('type', String(filters.type));
        if (filters?.status) params.set('status', String(filters.status));
        if (filters?.search) params.set('search', String(filters.search));
        if (filters?.sort) params.set('sort', String(filters.sort));
        if (filters?.dateRange) params.set('dateRange', String(filters.dateRange));
        if (filters?.minCompletion) params.set('minCompletion', String(filters.minCompletion));
        return fetchWithAuth(`/admin/providers?${params}`);
    },

    getProviderDetails: (type: string, id: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}`),

    downloadDocumentsZip: async (type: string, id: string) => {
        const token = getTokens().accessToken;
        if (!token) return { success: false, error: 'No auth token found' };
        
        try {
            const response = await fetch(`${API_BASE_URL}/admin/providers/${type}/${id}/documents/zip`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                return { success: false, error: 'Failed to download documents' };
            }
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `${type}_${id}_documents.zip`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            return { success: true };
        } catch (e) {
            return { success: false, error: 'Network error during download' };
        }
    },

    approveProvider: (type: string, id: string, notes?: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        }),

    updateProviderVerification: (type: string, id: string, payload: { verification_checklist?: any; admin_notes?: string; approval_status?: string }) =>
        fetchWithAuth(`/admin/providers/${type}/${id}/verification`, {
            method: 'PUT',
            body: JSON.stringify(payload),
        }),

    rejectProvider: (type: 'doctor' | 'hospital' | 'pharmacy' | 'diagnostic_center' | 'clinic' | 'wellness_coach' | 'fitness_center' | 'ambulance', id: string, reason: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        }),

    suspendProvider: (type: 'doctor' | 'hospital' | 'pharmacy' | 'diagnostic_center' | 'clinic' | 'wellness_coach' | 'fitness_center' | 'ambulance', id: string, reason: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}/suspend`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        }),

    reactivateProvider: (type: 'doctor' | 'hospital' | 'pharmacy' | 'diagnostic_center' | 'clinic' | 'wellness_coach' | 'fitness_center' | 'ambulance', id: string, notes?: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}/reactivate`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        }),

    getUsers: (filters?: Record<string, unknown>, page: number = 1) => {
        const params = new URLSearchParams({ page: page.toString() });
        if (filters?.role) params.set('role', String(filters.role));
        if (filters?.status) params.set('status', String(filters.status));
        if (filters?.isActive !== undefined) params.set('isActive', String(filters.isActive));
        if (filters?.isVerified !== undefined) params.set('isVerified', String(filters.isVerified));
        if (filters?.search) params.set('search', String(filters.search));
        return fetchWithAuth(`/admin/users?${params}`);
    },

    updateUserStatus: (userId: string, isActive: boolean, reason?: string) =>
        fetchWithAuth(`/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ isActive, reason }),
        }),

    getSettings: () => fetchWithAuth('/admin/settings'),

    updateSettings: (settings: Record<string, unknown>) =>
        fetchWithAuth('/admin/settings', {
            method: 'PUT',
            body: JSON.stringify(settings),
        }),

    getAnalytics: (period: string = '30d') =>
        fetchWithAuth(`/admin/analytics?period=${period}`),

    getAuditLogs: (filters?: Record<string, unknown>, page: number = 1, limit: number = 50, before?: string | null) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        // M012: pass the cursor for keyset pagination instead of deep offsets.
        if (before) params.set('before', before);
        if (filters?.search) params.set('search', String(filters.search));
        if (filters?.action) params.set('action', String(filters.action));
        if (filters?.resourceType) params.set('resourceType', String(filters.resourceType));
        if (filters?.userId) params.set('userId', String(filters.userId));
        if (filters?.fromDate) params.set('fromDate', String(filters.fromDate));
        if (filters?.toDate) params.set('toDate', String(filters.toDate));
        return fetchWithAuth(`/admin/audit-logs?${params}`);
    },

    getSystemHealth: () => fetchWithAuth('/admin/system/health'),

    fetchMedicines: (page: number = 1, limit: number = 20, search?: string, category?: string) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (search?.trim()) params.set('search', search.trim());
        if (category) params.set('category', category);
        return fetchWithAuth(`/admin/medicines?${params}`);
    },

    addMedicine: (data: Record<string, unknown>) =>
        fetchWithAuth('/admin/medicines', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateMedicine: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/admin/medicines/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteMedicine: (id: string) =>
        fetchWithAuth(`/admin/medicines/${id}`, {
            method: 'DELETE',
        }),

    addBulkMedicines: (medicines: any[]) =>
        fetchWithAuth('/admin/medicines/bulk', {
            method: 'POST',
            body: JSON.stringify({ medicines }),
        }),

    dryRunBulkMedicines: (medicines: any[]) =>
        fetchWithAuth('/admin/medicines/bulk', {
            method: 'POST',
            body: JSON.stringify({ dryRun: true, medicines }),
        }),

    checkMedicineExists: (name: string, manufacturer?: string) => {
        const params = new URLSearchParams({ name });
        if (manufacturer) params.set('manufacturer', manufacturer);
        return fetchWithAuth(`/admin/medicines/exists?${params}`);
    },

    addBulkMasterTests: (tests: any[]) =>
        fetchWithAuth('/admin/master-tests/bulk', {
            method: 'POST',
            body: JSON.stringify({ tests }),
        }),

    getEmergencies: (page: number = 1, limit: number = 20, status: string = 'active') =>
        fetchWithAuth(`/admin/emergencies?page=${page}&limit=${limit}&status=${encodeURIComponent(status)}`),

    updateEmergencyStatus: (emergencyId: string, status: string) =>
        fetchWithAuth(`/admin/emergencies/${emergencyId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),

    getFleet: () => fetchWithAuth('/admin/fleet'),

    getComplianceDocuments: (
        filters: {
            days?: number;
            type?: string;
            status?: string;
            search?: string;
            page?: number;
            limit?: number;
        } = {}
    ) => {
        const params = new URLSearchParams({
            days: String(filters.days ?? 30),
            type: String(filters.type ?? 'all'),
            status: String(filters.status ?? 'all'),
            page: String(filters.page ?? 1),
            limit: String(filters.limit ?? 20),
        });
        if (filters.search?.trim()) params.set('search', filters.search.trim());
        return fetchWithAuth(`/admin/compliance/documents?${params}`);
    },

    // ── Outbreak Detection ──

    getOutbreaks: (filters?: { status?: string; severity?: string; city?: string; page?: number; limit?: number }) => {
        const params = new URLSearchParams({
            page: String(filters?.page ?? 1),
            limit: String(filters?.limit ?? 20),
        });
        if (filters?.status) params.set('status', filters.status);
        if (filters?.severity) params.set('severity', filters.severity);
        if (filters?.city) params.set('city', filters.city);
        return fetchWithAuth(`/admin/outbreaks?${params}`);
    },

    getOutbreakHeatmap: () => fetchWithAuth('/admin/outbreaks/heatmap'),

    getOutbreakStats: (days: number = 30) =>
        fetchWithAuth(`/admin/outbreaks/stats?days=${days}`),

    getOutbreakDetails: (id: string) =>
        fetchWithAuth(`/admin/outbreaks/${id}`),

    updateOutbreakStatus: (id: string, status: string, notes?: string) =>
        fetchWithAuth(`/admin/outbreaks/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, notes }),
        }),

    triggerOutbreakAnalysis: () =>
        fetchWithAuth('/admin/outbreaks/analyze', { method: 'POST' }),

    // ── Discount Campaigns ──

    getCampaigns: (filters?: { page?: number; limit?: number; status?: string; scopeType?: string }, page: number = 1, limit: number = 20) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
        if (filters?.scopeType) params.set('scope_type', filters.scopeType);
        return fetchWithAuth(`/discounts/campaigns?${params}`);
    },

    getCampaign: (id: string) =>
        fetchWithAuth(`/discounts/campaigns/${id}`),

    createCampaign: (data: Record<string, unknown>) =>
        fetchWithAuth('/discounts/campaigns', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateCampaign: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/discounts/campaigns/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteCampaign: (id: string) =>
        fetchWithAuth(`/discounts/campaigns/${id}`, {
            method: 'DELETE',
        }),
};

// ==================== DASHBOARD API ====================
// Backend: routes/doctor/index.js

export const doctorApi = {
    // Feedback
    submitFeedback: (data: any) => fetchWithAuth('/doctor/feedback', {
        method: 'POST',
        body: JSON.stringify(data),
    }),
    getMyFeedback: () => fetchWithAuth('/doctor/feedback'),
    getFeedbackDetail: (id: string) => fetchWithAuth(`/doctor/feedback/${id}`),


    getPublicDoctorById: async (id: string) => {
        const response = await fetch(`${API_BASE_URL}/doctors/${id}`);
        return response.json();
    },

    getAvailableSlots: async (doctorId: string, date: string, type: string = 'all') => {
        const response = await fetch(`${API_BASE_URL}/doctors/${doctorId}/slots?date=${date}&type=${type}`);
        return response.json();
    },
    getJourneyStats: () => fetchWithAuth('/doctors/me/journey'),
    updateJourneyGoals: (data: { monthlyConsultations: number, monthlyRevenue: number }) =>
        fetchWithAuth('/doctors/me/goals', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getDashboard: () => fetchWithAuth('/doctors/me/dashboard'),
    getPatientAlerts: () => fetchWithAuth<any[]>('/doctors/me/patient-alerts'),

    getProfile: () => fetchWithAuth('/doctors/me/profile'),

    updateProfile: (data: Record<string, unknown>) =>
        fetchWithAuth('/doctors/me/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    submitForApproval: () =>
        fetchWithAuth('/doctors/me/submit-for-approval', {
            method: 'POST',
        }),

    // ── Doctor IPD In-Patient Care & Rounds ──
    getDoctorIpdAdmissions: (params: Record<string, string> = {}) => {
        const p = new URLSearchParams(params);
        return fetchWithAuth(`/doctors/me/ipd/admissions?${p}`);
    },
    addDoctorIpdRound: (data: Record<string, unknown>) =>
        fetchWithAuth('/doctors/me/ipd/rounds', { method: 'POST', body: JSON.stringify(data) }),
    getDoctorIpdRounds: (admissionId: string) =>
        fetchWithAuth(`/doctors/me/ipd/rounds/${admissionId}`),

    updateVerificationDocuments: (data: Record<string, unknown>) =>
        fetchWithAuth('/doctors/me/verification-documents', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    getSchedule: () => fetchWithAuth('/doctors/me/slots'),

    updateSchedule: (slots: Record<string, unknown>[]) =>
        fetchWithAuth('/doctors/me/slots', {
            method: 'PUT',
            body: JSON.stringify({ slots }),
        }),

    toggleSlotBlock: (date: string, timeSlot: string, action: 'block' | 'unblock') =>
        fetchWithAuth('/doctors/me/slots/block', {
            method: 'POST',
            body: JSON.stringify({ date, timeSlot, action }),
        }),

    // Leave Management
    getLeaves: () => fetchWithAuth('/doctors/me/leaves'),

    checkAffectedAppointments: (data: { start_date: string; end_date: string }) =>
        fetchWithAuth('/doctors/me/leaves/check-affected', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    addLeave: (data: { start_date: string; end_date: string; reason?: string }) =>
        fetchWithAuth('/doctors/me/leaves', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    cancelLeave: (id: string) =>
        fetchWithAuth(`/doctors/me/leaves/${id}/cancel`, {
            method: 'PUT',
        }),

    deleteLeave: (id: string) =>
        fetchWithAuth(`/doctors/me/leaves/${id}`, {
            method: 'DELETE',
        }),

    getMyOrganizations: () => fetchWithAuth('/doctors/me/organizations'),

    createSchedule: (data: Record<string, unknown>) =>
        fetchWithAuth('/doctors/me/schedules', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateScheduleById: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/doctors/me/schedules/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    disableSchedule: (id: string) =>
        fetchWithAuth(`/doctors/me/schedules/${id}`, {
            method: 'DELETE',
        }),

    getAppointments: (status?: string, date?: string, page: number = 1) => {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (date) params.set('date', date);
        params.set('page', String(page));
        return fetchWithAuth(`/appointments?${params}`);
    },

    getPatients: (page: number = 1, search: string = '', limit: number = 20, filter: string = 'all', sort: string = 'recent', source: string = 'all', visitType: string = 'all') => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
            filter,
            sort,
            source,
            visitType
        });
        if (search.trim()) params.set('search', search.trim());
        return fetchWithAuth(`/doctors/me/patients?${params}`);
    },

    getPatientHistory: (patientId: string) =>
        fetchWithAuth(`/doctors/me/patients/${patientId}`),
    
    updatePatientMedicalHistory: (patientId: string, data: { allergies?: string[], chronic_conditions?: string[], current_medications?: any[] }) =>
        fetchWithAuth(`/doctors/me/patients/${patientId}/medical-history`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    
    updatePatientInternalNotes: (patientId: string, notes: string) =>
        fetchWithAuth(`/doctors/me/patients/${patientId}/internal-notes`, {
            method: 'PUT',
            body: JSON.stringify({ notes }),
        }),

    getPrescriptions: (page: number = 1) =>
        fetchWithAuth(`/doctors/me/prescriptions?page=${page}`),

    getPrescriptionById: (id: string) =>
        fetchWithAuth(`/doctors/me/prescriptions/${id}`),

    updateAvailability: (isAvailable: boolean) =>
        fetchWithAuth('/doctors/me/availability', {
            method: 'PUT',
            body: JSON.stringify({ isAvailable }),
        }),

    getHospitalInvites: () => fetchWithAuth('/doctors/me/hospital-invites'),

    respondHospitalInvite: (inviteId: string, decision: 'accept' | 'reject' | 'changes_requested', data?: Record<string, unknown>) =>
        fetchWithAuth(`/doctors/me/hospital-invites/${inviteId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ decision, ...data }),
        }),

    getClinicInvites: () => fetchWithAuth('/doctors/me/clinic-invites'),

    respondClinicInvite: (inviteId: string, decision: 'accept' | 'reject' | 'changes_requested', data?: Record<string, unknown>) =>
        fetchWithAuth(`/doctors/me/clinic-invites/${inviteId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ decision, ...data }),
        }),

    // ── Organization Join Requests ──
    searchOrganizations: (query: string = '', type: string = 'all', lat?: number, lng?: number) => {
        const params = new URLSearchParams();
        if (query) params.set('query', query);
        if (type) params.set('type', type);
        if (lat) params.set('lat', String(lat));
        if (lng) params.set('lng', String(lng));
        return fetchWithAuth(`/doctors/search-organizations?${params}`);
    },

    getOrganizationDetails: (orgId: string, type?: string) => {
        const params = new URLSearchParams();
        if (type) params.set('type', type);
        return fetchWithAuth(`/doctors/organizations/${orgId}${type ? `?${params}` : ''}`);
    },

    completeOnboarding: (practiceSetupType: string) =>
        fetchWithAuth('/doctors/me/onboarding', {
            method: 'POST',
            body: JSON.stringify({ practiceSetupType }),
        }),

    getMyJoinRequests: () => fetchWithAuth('/doctors/me/join-requests'),

    requestToJoinClinic: (clinicId: string, data: Record<string, unknown>) =>
        fetchWithAuth('/doctors/me/join-requests/clinic', {
            method: 'POST',
            body: JSON.stringify({ clinicId, ...data }),
        }),

    requestToJoinHospital: (hospitalId: string, data: Record<string, unknown>) =>
        fetchWithAuth('/doctors/me/join-requests/hospital', {
            method: 'POST',
            body: JSON.stringify({ hospitalId, ...data }),
        }),

    cancelJoinRequest: (requestId: string, type: 'clinic' | 'hospital') =>
        fetchWithAuth(`/doctors/me/join-requests/${requestId}/cancel`, {
            method: 'POST',
            body: JSON.stringify({ type }),
        }),

    respondToJoinRequest: (requestId: string, type: 'clinic' | 'hospital', decision: 'accept' | 'decline' | 'reject' | 'changes_requested', data?: Record<string, unknown>) =>
        fetchWithAuth(`/doctors/me/join-requests/${requestId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ type, decision, ...data }),
        }),

    getPatientVitals: (page: number = 1, patientId?: string) => {
        const params = new URLSearchParams({ page: page.toString() });
        if (patientId) params.set('patientId', patientId);
        return fetchWithAuth(`/doctors/me/patients/vitals?${params}`);
    },

    recordPatientVitals: (patientId: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/doctors/me/patients/${patientId}/vitals`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getNotificationSettings: () => fetchWithAuth('/doctors/me/notification-settings'),

    updateNotificationSettings: (settings: { emailNotifications: boolean; smsNotifications: boolean }) =>
        fetchWithAuth('/doctors/me/notification-settings', {
            method: 'PUT',
            body: JSON.stringify(settings),
        }),

    getOutbreakAlerts: (city?: string) => {
        const params = new URLSearchParams();
        if (city) params.set('city', city);
        return fetchWithAuth(`/admin/outbreaks/public/alerts?${params}`);
    },
    getOutbreakHeatmap: () => fetchWithAuth('/admin/outbreaks/public/heatmap'),
    getOutbreakStats: (days: number = 30) => fetchWithAuth(`/admin/outbreaks/public/stats?days=${days}`),

    getReviews: (page: number = 1, limit: number = 10) =>
        fetchWithAuth(`/doctors/me/reviews?page=${page}&limit=${limit}`),

    respondToReview: (id: string, response: string) =>
        fetchWithAuth(`/doctors/me/reviews/${id}/respond`, {
            method: 'POST',
            body: JSON.stringify({ response }),
        }),

    getAnalytics: (period: string = '30d') =>
        fetchWithAuth(`/doctors/me/analytics?period=${period}`),

    getInsights: () =>
        fetchWithAuth('/doctors/me/insights'),

    searchPatientByPhone: (phone: string) =>
        fetchWithAuth<{ found: boolean; patient: any }>(`/doctors/me/patients/search-by-phone?phone=${encodeURIComponent(phone)}`),

    recordDirectVisit: (data: Record<string, unknown>) =>
        fetchWithAuth<{ appointment: any; prescription: any; vitals?: any }>('/doctors/me/direct-visits', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // Prescription Partner Routing & Referrals
    getPrescriptionPharmacyPartners: (prescriptionId: string) =>
        fetchWithAuth<{ success: boolean; data: any[]; partners: any[] }>(`/doctors/prescriptions/${prescriptionId}/pharmacy-partners`),

    routePrescriptionToPharmacy: (prescriptionId: string, data: { pharmacyId: string; items: any[]; deliveryType?: string; deliveryAddress?: string }) =>
        fetchWithAuth<{ success: boolean; data: any }>(`/doctors/prescriptions/${prescriptionId}/route-to-pharmacy`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getPrescriptionDiagnosticPartners: (prescriptionId: string) =>
        fetchWithAuth<{ success: boolean; data: any[]; partners: any[] }>(`/doctors/prescriptions/${prescriptionId}/diagnostic-partners`),

    routePrescriptionToDiagnostic: (prescriptionId: string, data: { centerId: string; bookingDate?: string; bookingTime?: string; testId?: string; collectionType?: string; collectionAddress?: string; notes?: string }) =>
        fetchWithAuth<{ success: boolean; data: any }>(`/doctors/prescriptions/${prescriptionId}/route-to-diagnostic`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getPrescriptionHospitalPartners: (prescriptionId: string) =>
        fetchWithAuth<{ success: boolean; data: any[]; partners: any[] }>(`/doctors/prescriptions/${prescriptionId}/hospital-partners`),

    referPrescriptionToHospital: (prescriptionId: string, data: { hospitalId: string; urgency?: string; reason: string; clinicalSummary?: string; consentGranted?: boolean }) =>
        fetchWithAuth<{ success: boolean; data: any }>(`/doctors/prescriptions/${prescriptionId}/refer-to-hospital`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// ==================== HOSPITAL API ====================
// Backend: routes/hospitalManager.js

export const hospitalApi = {
    getDashboard: () => fetchWithAuth('/hospital-manager/dashboard'),

    getReviews: (page: number = 1, limit: number = 10) =>
        fetchWithAuth(`/hospital-manager/reviews?page=${page}&limit=${limit}`),

    respondToReview: (id: string, response: string) =>
        fetchWithAuth(`/hospital-manager/reviews/${id}/respond`, {
            method: 'POST',
            body: JSON.stringify({ response }),
        }),

    getDoctorReviews: (page: number = 1, limit: number = 20) =>
        fetchWithAuth(`/hospital-manager/doctor-reviews?page=${page}&limit=${limit}`),

    getProfile: () => fetchWithAuth('/hospital-manager/profile'),

    updateProfile: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    addReel: (video_url: string, title?: string) =>
        fetchWithAuth('/hospital-manager/reels', {
            method: 'POST',
            body: JSON.stringify({ video_url, title }),
        }),

    deleteReel: (reelId: string) =>
        fetchWithAuth(`/hospital-manager/reels/${reelId}`, {
            method: 'DELETE',
        }),

    updateErWaitTime: (waitMinutes: number) =>
        fetchWithAuth('/hospital-manager/er-wait-time', {
            method: 'PUT',
            body: JSON.stringify({ waitMinutes }),
        }),

    getDoctors: (page: number = 1, search: string = '', limit: number = 20) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (search.trim()) params.set('search', search.trim());
        return fetchWithAuth(`/hospital-manager/doctors?${params}`);
    },

    inviteDoctor: (data: Record<string, unknown> | string) =>
        fetchWithAuth('/hospital-manager/doctors/invite', {
            method: 'POST',
            body: JSON.stringify(typeof data === 'string' ? { email: data } : data),
        }),

    removeDoctor: (doctorId: string) =>
        fetchWithAuth(`/hospital-manager/doctors/${doctorId}`, { method: 'DELETE' }),

    // ── Doctor Join Requests ──
    getJoinRequests: (params: { page?: number; limit?: number; status?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.status) query.set('status', params.status);
        return fetchWithAuth(`/hospital-manager/join-requests?${query}`);
    },

    respondToJoinRequest: (requestId: string, decision: 'accept' | 'reject', message?: string) =>
        fetchWithAuth(`/hospital-manager/join-requests/${requestId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ decision, message }),
        }),

    getInvites: (params: { page?: number; limit?: number; status?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.status) query.set('status', params.status);
        return fetchWithAuth(`/hospital-manager/invites?${query}`);
    },

    cancelInvite: (inviteId: string) =>
        fetchWithAuth(`/hospital-manager/invites/${inviteId}/cancel`, {
            method: 'POST',
        }),

    // ── Platform Invites ──
    sendPlatformInvite: (email: string, message?: string) =>
        fetchWithAuth('/hospital-manager/platform-invite', {
            method: 'POST',
            body: JSON.stringify({ email, message }),
        }),

    getAssociatedPharmacies: () => fetchWithAuth('/hospital-manager/pharmacies'),

    invitePharmacy: (email: string) =>
        fetchWithAuth('/hospital-manager/pharmacies/invite', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),

    unlinkPharmacy: (providerId: string) =>
        fetchWithAuth(`/hospital-manager/pharmacies/${providerId}`, { method: 'DELETE' }),

    getAssociatedDiagnosticCenters: () => fetchWithAuth('/hospital-manager/diagnostic-centers'),

    inviteDiagnosticCenter: (email: string) =>
        fetchWithAuth('/hospital-manager/diagnostic-centers/invite', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),

    unlinkDiagnosticCenter: (providerId: string) =>
        fetchWithAuth(`/hospital-manager/diagnostic-centers/${providerId}`, { method: 'DELETE' }),

    // ==================== UNIFIED PARTNERSHIPS ====================
    getPartnerships: (status?: string) => {
        const query = status ? `?status=${status}` : '';
        return fetchWithAuth(`/hospital-manager/partnerships${query}`);
    },
    invitePartnership: (data: { targetType: string; targetId: string; partnershipType?: string; metadata?: any }) =>
        fetchWithAuth('/hospital-manager/partnerships/invite', { method: 'POST', body: JSON.stringify(data) }),
    respondPartnership: (id: string, action: 'accept' | 'reject') =>
        fetchWithAuth(`/hospital-manager/partnerships/${id}/respond`, { method: 'POST', body: JSON.stringify({ action }) }),
    requestChangesPartnership: (id: string, message: string, metadataUpdates?: any) =>
        fetchWithAuth(`/hospital-manager/partnerships/${id}/request-changes`, { method: 'POST', body: JSON.stringify({ message, metadataUpdates }) }),
    acceptChangesPartnership: (id: string) =>
        fetchWithAuth(`/hospital-manager/partnerships/${id}/accept-changes`, { method: 'POST' }),
    terminatePartnership: (id: string) =>
        fetchWithAuth(`/hospital-manager/partnerships/${id}`, { method: 'DELETE' }),

    getAppointments: (params: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        date?: string;
        doctorId?: string;
        fromDate?: string;
        toDate?: string;
    } = {}) => {
        const query = new URLSearchParams();
        if (params.page) query.set('page', params.page.toString());
        if (params.limit) query.set('limit', params.limit.toString());
        if (params.search?.trim()) query.set('search', params.search.trim());
        if (params.status) query.set('status', params.status);
        if (params.date) query.set('date', params.date);
        if (params.doctorId) query.set('doctorId', params.doctorId);
        if (params.fromDate) query.set('fromDate', params.fromDate);
        if (params.toDate) query.set('toDate', params.toDate);
        const suffix = query.toString() ? `?${query.toString()}` : '';
        return fetchWithAuth(`/hospital-manager/appointments${suffix}`);
    },

    getAnalytics: (period: string = '30d') => fetchWithAuth(`/hospital-manager/analytics?period=${encodeURIComponent(period)}`),

    getManagers: () => fetchWithAuth('/hospital-manager/managers'),

    addManager: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/managers', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateManager: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/managers/${id}`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    resetStaffPassword: (id: string, password: string) =>
        fetchWithAuth(`/hospital-manager/managers/${id}/password`, {
            method: 'PATCH',
            body: JSON.stringify({ password }),
        }),

    removeManager: (id: string) =>
        fetchWithAuth(`/hospital-manager/managers/${id}`, {
            method: 'DELETE',
        }),

    getEmergencies: () => fetchWithAuth('/hospital-manager/emergencies'),

    getConsultations: (page: number = 1, status?: string, search: string = '', limit: number = 20) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (status) params.set('status', status);
        if (search.trim()) params.set('search', search.trim());
        return fetchWithAuth(`/hospital-manager/consultations?${params}`);
    },

    // ── Ambulance Dispatch (Hospital-Controlled) ──
    getDispatchEmergencies: () => fetchWithAuth('/ambulances/hospital/emergencies'),

    getAvailableAmbulances: (lat: number, lng: number, radius: number = 50) =>
        fetchWithAuth(`/ambulances/available?latitude=${lat}&longitude=${lng}&radius=${radius}`),

    assignAmbulance: (requestId: string, ambulanceId: string) =>
        fetchWithAuth(`/ambulances/${requestId}/assign`, {
            method: 'POST',
            body: JSON.stringify({ ambulanceId }),
        }),

    // ── Affiliated Ambulances ──
    getAffiliatedAmbulances: () => fetchWithAuth('/hospital-manager/ambulances'),

    inviteAmbulance: (email: string) =>
        fetchWithAuth('/hospital-manager/ambulances/invite', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),

    removeAffiliatedAmbulance: (ambulanceId: string) =>
        fetchWithAuth(`/hospital-manager/ambulances/${ambulanceId}`, { method: 'DELETE' }),

    // ── Departments ──
    getDepartments: () => fetchWithAuth('/hospital-manager/departments'),

    addDepartment: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/departments', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateDepartment: (departmentId: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/departments/${departmentId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteDepartment: (departmentId: string) =>
        fetchWithAuth(`/hospital-manager/departments/${departmentId}`, { method: 'DELETE' }),

    // ── Outbreak Alerts (read-only) ──
    getOutbreakAlerts: (city?: string) => {
        const params = new URLSearchParams();
        if (city) params.set('city', city);
        return fetchWithAuth(`/admin/outbreaks/public/alerts?${params}`);
    },
    getOutbreakHeatmap: () => fetchWithAuth('/admin/outbreaks/public/heatmap'),
    getOutbreakStats: (days: number = 30) => fetchWithAuth(`/admin/outbreaks/public/stats?days=${days}`),

    // ══════════════════════════════════════════════
    // HIS MODULE APIs
    // ══════════════════════════════════════════════

    // ── Control Tower ──
    getControlTower: (period?: string) =>
        fetchWithAuth(`/hospital-manager/control-tower${period ? `?period=${period}` : ''}`),
    getRevenueBreakdown: (fromDate?: string, toDate?: string) => {
        const p = new URLSearchParams();
        if (fromDate) p.set('fromDate', fromDate);
        if (toDate) p.set('toDate', toDate);
        return fetchWithAuth(`/hospital-manager/control-tower/revenue?${p}`);
    },
    getOccupancyDrilldown: () => fetchWithAuth('/hospital-manager/control-tower/occupancy'),

    // ── IPD ──
    createAdmission: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/ipd/admissions', { method: 'POST', body: JSON.stringify(data) }),
    getAdmissions: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/ipd/admissions?${p}`);
    },
    getAdmissionDetail: (id: string) => fetchWithAuth(`/hospital-manager/ipd/admissions/${id}`),
    admitPatient: (id: string, bedId: string, wardId?: string) =>
        fetchWithAuth(`/hospital-manager/ipd/admissions/${id}/admit`, { method: 'POST', body: JSON.stringify({ bedId, wardId }) }),
    transferBed: (id: string, newBedId: string, reason?: string) =>
        fetchWithAuth(`/hospital-manager/ipd/admissions/${id}/transfer`, { method: 'POST', body: JSON.stringify({ newBedId, reason }) }),
    dischargePatient: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/ipd/admissions/${id}/discharge`, { method: 'POST', body: JSON.stringify(data) }),
    addProgressNote: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/ipd/admissions/${id}/progress-notes`, { method: 'POST', body: JSON.stringify(data) }),
    getProgressNotes: (id: string, page = 1) =>
        fetchWithAuth(`/hospital-manager/ipd/admissions/${id}/progress-notes?page=${page}`),
    getIPDCensus: () => fetchWithAuth('/hospital-manager/ipd/census'),

    // ── Beds ──
    getWards: () => fetchWithAuth('/hospital-manager/wards'),
    createWard: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/wards', { method: 'POST', body: JSON.stringify(data) }),
    updateWard: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/wards/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteWard: (id: string) =>
        fetchWithAuth(`/hospital-manager/wards/${id}`, { method: 'DELETE' }),
    getBeds: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/beds?${p}`);
    },
    createBed: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/beds', { method: 'POST', body: JSON.stringify(data) }),
    createBedsBulk: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/beds/bulk', { method: 'POST', body: JSON.stringify(data) }),
    updateBed: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/beds/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    updateBedStatus: (id: string, status: string, data?: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/beds/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, ...data }) }),
    getBedOccupancy: () => fetchWithAuth('/hospital-manager/beds/occupancy'),
    getAvailableBeds: (wardType?: string) =>
        fetchWithAuth(`/hospital-manager/beds/available${wardType ? `?wardType=${wardType}` : ''}`),

    // ── OPD Queue ──
    generateQueueToken: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/queue/token', { method: 'POST', body: JSON.stringify(data) }),
    getQueue: (params: Record<string, string> = {}) => {
        const p = new URLSearchParams(params);
        return fetchWithAuth(`/hospital-manager/queue?${p}`);
    },
    callNextPatient: (doctorId: string) =>
        fetchWithAuth('/hospital-manager/queue/0/call-next', { method: 'POST', body: JSON.stringify({ doctorId }) }),
    updateQueueStatus: (id: string, status: string, notes?: string) =>
        fetchWithAuth(`/hospital-manager/queue/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, notes }) }),
    getQueueStats: () => fetchWithAuth('/hospital-manager/queue/stats'),
    getPatientQueuePosition: (patientId: string) =>
        fetchWithAuth(`/hospital-manager/queue/patient/${patientId}`),

    // ── Lab Orders ──
    createLabOrder: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/lab/orders', { method: 'POST', body: JSON.stringify(data) }),
    createLabOrdersBulk: (orders: Record<string, unknown>[]) =>
        fetchWithAuth('/hospital-manager/lab/orders/bulk', { method: 'POST', body: JSON.stringify({ orders }) }),
    getLabOrders: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/lab/orders?${p}`);
    },
    updateLabOrderStatus: (id: string, status: string, data?: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/lab/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, ...data }) }),
    getLabTAT: (period?: string) =>
        fetchWithAuth(`/hospital-manager/lab/tat${period ? `?period=${period}` : ''}`),

    // ── Radiology ──
    createRadiologyOrder: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/radiology/orders', { method: 'POST', body: JSON.stringify(data) }),
    getRadiologyOrders: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/radiology/orders?${p}`);
    },
    updateRadiologyOrderStatus: (id: string, status: string, data?: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/radiology/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, ...data }) }),

    // ── OT ──
    getOtRooms: () => fetchWithAuth('/hospital-manager/ot/rooms'),
    createOtRoom: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/ot/rooms', { method: 'POST', body: JSON.stringify(data) }),
    updateOtRoom: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/ot/rooms/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getOtSchedules: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/ot/schedules?${p}`);
    },
    scheduleOt: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/ot/schedules', { method: 'POST', body: JSON.stringify(data) }),
    updateOtStatus: (id: string, status: string, data?: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/ot/schedules/${id}/status`, { method: 'PUT', body: JSON.stringify({ status, ...data }) }),
    addOtChecklist: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/ot/schedules/${id}/checklist`, { method: 'POST', body: JSON.stringify(data) }),
    getOtAvailability: (date?: string) =>
        fetchWithAuth(`/hospital-manager/ot/availability${date ? `?date=${date}` : ''}`),

    // ── Nursing ──
    createNursingTask: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/nursing/tasks', { method: 'POST', body: JSON.stringify(data) }),
    getNursingTasks: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/nursing/tasks?${p}`);
    },
    updateNursingTask: (id: string, status: string, data?: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/nursing/tasks/${id}`, { method: 'PUT', body: JSON.stringify({ status, ...data }) }),
    addMedication: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/nursing/mar', { method: 'POST', body: JSON.stringify(data) }),
    updateMedication: (id: string, status: string, data?: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/nursing/mar/${id}`, { method: 'PUT', body: JSON.stringify({ status, ...data }) }),
    getMedicationSchedule: (admissionId: string, date?: string) =>
        fetchWithAuth(`/hospital-manager/nursing/mar/${admissionId}${date ? `?date=${date}` : ''}`),
    getWardDashboard: (wardId: string) =>
        fetchWithAuth(`/hospital-manager/nursing/ward-dashboard/${wardId}`),

    // ── Service Catalog ──
    getHospitalServices: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/services?${p}`);
    },
    createHospitalService: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/services', { method: 'POST', body: JSON.stringify(data) }),
    updateHospitalService: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/services/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteHospitalService: (id: string) =>
        fetchWithAuth(`/hospital-manager/services/${id}`, { method: 'DELETE' }),
    getServiceCategories: () => fetchWithAuth('/hospital-manager/services/categories'),

    // ── Encounters ──
    createEncounter: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/encounters', { method: 'POST', body: JSON.stringify(data) }),
    getEncounters: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/encounters?${p}`);
    },
    getEncounterDetail: (id: string) => fetchWithAuth(`/hospital-manager/encounters/${id}`),
    updateEncounter: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/encounters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    addEncounterService: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/encounters/${id}/services`, { method: 'POST', body: JSON.stringify(data) }),
    getEncounterBill: (id: string) => fetchWithAuth(`/hospital-manager/encounters/${id}/bill`),
    getPatientEncounterHistory: (patientId: string, page = 1) =>
        fetchWithAuth(`/hospital-manager/encounters/patient/${patientId}?page=${page}`),

    // ── Billing Foundation & Phase 4 ──
    createDeposit: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/deposits', { method: 'POST', body: JSON.stringify(data) }),
    getDeposits: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/deposits?${p}`);
    },
    createPreauth: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/insurance/preauth', { method: 'POST', body: JSON.stringify(data) }),
    getPreauths: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/insurance/preauth?${p}`);
    },
    updatePreauth: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/insurance/preauth/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

    // ── Billing Phase 4: Charges, Invoices, TPA, Revenue, Tally ──
    aggregateCharges: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/billing/charges/aggregate', { method: 'POST', body: JSON.stringify(data) }),
    getCharges: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/billing/charges?${p}`);
    },
    generateInvoice: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/billing/invoices/generate', { method: 'POST', body: JSON.stringify(data) }),
    finalizeInvoice: (id: string) =>
        fetchWithAuth(`/hospital-manager/billing/invoices/${id}/finalize`, { method: 'PUT' }),
    recordInvoicePayment: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/billing/invoices/${id}/payment`, { method: 'POST', body: JSON.stringify(data) }),
    createTpaClaim: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/billing/tpa-claims', { method: 'POST', body: JSON.stringify(data) }),
    getTpaClaims: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/billing/tpa-claims?${p}`);
    },
    updateTpaClaim: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/billing/tpa-claims/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getRevenueReport: (params: Record<string, string> = {}) => {
        const p = new URLSearchParams(params);
        return fetchWithAuth(`/hospital-manager/billing/revenue?${p}`);
    },
    buildDailyRevenue: (data: Record<string, unknown> = {}) =>
        fetchWithAuth('/hospital-manager/billing/revenue/build-daily', { method: 'POST', body: JSON.stringify(data) }),
    exportTally: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/billing/tally/export', { method: 'POST', body: JSON.stringify(data) }),
    getTallyExports: () =>
        fetchWithAuth('/hospital-manager/billing/tally/exports'),

    // ── Quality ──
    createIncident: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/incidents', { method: 'POST', body: JSON.stringify(data) }),
    getIncidents: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/incidents?${p}`);
    },
    updateIncident: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/incidents/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getQualityIndicators: (params: Record<string, string> = {}) => {
        const p = new URLSearchParams(params);
        return fetchWithAuth(`/hospital-manager/quality-indicators?${p}`);
    },

    // ── Staff Role Context ──
    getMyStaffRole: () => fetchWithAuth('/hospital-manager/my-role'),

    // ── In-House Pharmacy ──
    getInhouseInventory: (params: Record<string, string | number | boolean> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== '') p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/inhouse-pharmacy/inventory?${p}`);
    },
    addInhouseInventory: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/inhouse-pharmacy/inventory', { method: 'POST', body: JSON.stringify(data) }),
    updateInhouseInventory: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/hospital-manager/inhouse-pharmacy/inventory/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getPendingDispensations: () =>
        fetchWithAuth('/hospital-manager/inhouse-pharmacy/pending-prescriptions'),
    dispensePrescription: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/inhouse-pharmacy/dispense', { method: 'POST', body: JSON.stringify(data) }),
    getDispensationsHistory: (params: Record<string, string | number> = {}) => {
        const p = new URLSearchParams();
        Object.entries(params).forEach(([k, v]) => { if (v) p.set(k, String(v)); });
        return fetchWithAuth(`/hospital-manager/inhouse-pharmacy/dispensations?${p}`);
    },
};

// ==================== PHARMACY API ====================
// Backend: routes/pharmacy.js

export interface PharmacyProfileTask {
    id: string;
    label: string;
    completed: boolean;
    route?: string;
    description?: string;
}

export interface PharmacyProfileSection {
    id: string;
    title: string;
    description: string;
    weight: number;
    percentage: number;
    completed: boolean;
    tasks: PharmacyProfileTask[];
}

export interface PharmacyProfileNextStep {
    id: string;
    label: string;
    description: string;
    route: string;
    sectionId: string;
}

export interface PharmacyProfileCompletion {
    percentage: number;
    completedSectionsCount: number;
    totalSectionsCount: number;
    completedTasksCount: number;
    totalTasksCount: number;
    isComplete: boolean;
    status: 'not_started' | 'in_progress' | 'completed';
    nextStep: PharmacyProfileNextStep | null;
    sections: PharmacyProfileSection[];
    summary: string;
}

export interface QuickOperationConfig {
    key: string;
    enabled: boolean;
    order: number;
}

export interface PharmacyDashboardPreferences {
    show_profile_completion: boolean;
    onboarding_completed: boolean;
    quick_operations?: QuickOperationConfig[];
}

export const pharmacyApi = {
    getDashboard: () => fetchWithAuth('/pharmacy/dashboard'),

    getProfileCompletion: () => fetchWithAuth<PharmacyProfileCompletion>('/pharmacy/completion'),

    getPreferences: () => fetchWithAuth<PharmacyDashboardPreferences>('/pharmacy/preferences'),

    updatePreferences: (prefs: Partial<PharmacyDashboardPreferences>) =>
        fetchWithAuth<PharmacyDashboardPreferences>('/pharmacy/preferences', {
            method: 'PUT',
            body: JSON.stringify(prefs),
        }),

    getReviews: (page: number = 1, limit: number = 10) =>
        fetchWithAuth(`/pharmacy/reviews?page=${page}&limit=${limit}`),

    respondToReview: (id: string, response: string) =>
        fetchWithAuth(`/pharmacy/reviews/${id}/respond`, {
            method: 'POST',
            body: JSON.stringify({ response }),
        }),

    getProfile: () => fetchWithAuth('/pharmacy/profile'),

    updateProfile: (data: Record<string, unknown>) =>
        fetchWithAuth('/pharmacy/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    addReel: (data: { videoUrl: string, thumbnailUrl?: string, title?: string }) =>
        fetchWithAuth('/pharmacy/reels', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        
    deleteReel: (reelId: string) =>
        fetchWithAuth(`/pharmacy/reels/${reelId}`, {
            method: 'DELETE',
        }),

    getInventory: (params: { page?: number; limit?: number; search?: string; lowStock?: boolean; category?: string; sortBy?: string; sortOrder?: 'asc' | 'desc' } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 10),
        });
        if (params.search) query.set('search', params.search);
        if (params.lowStock) query.set('lowStock', 'true');
        if (params.category) query.set('category', params.category);
        if (params.sortBy) query.set('sortBy', params.sortBy);
        if (params.sortOrder) query.set('sortOrder', params.sortOrder);
        return fetchWithAuth(`/pharmacy/inventory?${query}`);
    },

    addInventoryItem: (data: Record<string, unknown>) =>
        fetchWithAuth('/pharmacy/inventory', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    addBulkInventory: (items: any[]) =>
        fetchWithAuth('/pharmacy/inventory/bulk', {
            method: 'POST',
            body: JSON.stringify({ items }),
        }),

    updateInventoryItem: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/pharmacy/inventory/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteInventoryItem: (id: string) =>
        fetchWithAuth(`/pharmacy/inventory/${id}`, { method: 'DELETE' }),

    getOrders: (params: { page?: number; limit?: number; search?: string; status?: string; group?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 10),
        });
        if (params.search) query.set('search', params.search);
        if (params.status) query.set('status', params.status);
        if (params.group) query.set('group', params.group);
        return fetchWithAuth(`/pharmacy/orders?${query}`);
    },

    updateOrderStatus: (orderId: string, status: string) =>
        fetchWithAuth(`/pharmacy/orders/${orderId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),

    getAnalytics: (period: string = '30d') => fetchWithAuth(`/pharmacy/analytics?period=${encodeURIComponent(period)}`),

    exportAnalytics: async (period: string = '30d', format: 'csv' | 'pdf' = 'csv') => {
        const { accessToken } = getTokens();
        const res = await fetch(`${API_BASE_URL}/pharmacy/analytics/export?period=${encodeURIComponent(period)}&format=${format}`, {
            headers: {
                ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
            },
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Export failed');
        }
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pharmacy-analytics-${period}-${Date.now()}.${format}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    },

    getPrescriptions: (params: { page?: number; limit?: number; search?: string; status?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 10),
        });
        if (params.search) query.set('search', params.search);
        if (params.status) query.set('status', params.status);
        return fetchWithAuth(`/pharmacy/prescriptions?${query}`);
    },

    dispensePrescription: (prescriptionId: string) =>
        fetchWithAuth(`/pharmacy/prescriptions/${prescriptionId}/dispense`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'dispensed' }),
        }),

    getPrescriptionDetail: (prescriptionId: string) =>
        fetchWithAuth(`/pharmacy/prescriptions/${prescriptionId}`),

    getPrescriptionInventoryCheck: (prescriptionId: string) =>
        fetchWithAuth(`/pharmacy/prescriptions/${prescriptionId}/inventory-check`),

    getAssociationInvites: () => fetchWithAuth('/pharmacy/associations/invites'),

    respondToAssociationInvite: (inviteId: string, decision: 'accept' | 'reject') =>
        fetchWithAuth(`/pharmacy/associations/invites/${inviteId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ decision }),
        }),

    getAssociations: () => fetchWithAuth('/pharmacy/associations'),

    getCatalogRequests: (params: { page?: number; limit?: number; status?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 10),
        });
        if (params.status) query.set('status', params.status);
        return fetchWithAuth(`/medicines/catalog-requests/pharmacy?${query}`);
    },
    
    acceptCatalogRequest: (id: string, data: { price: number }) =>
        fetchWithAuth(`/medicines/catalog-requests/${id}/accept`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    // ── Discount Campaigns ──

    getAvailableCampaigns: (status?: string) => {
        const params = new URLSearchParams();
        if (status && status !== 'all') params.set('status', status);
        const suffix = params.toString() ? `?${params}` : '';
        return fetchWithAuth(`/discounts/pharmacy/campaigns/available${suffix}`);
    },

    getMyCampaigns: () =>
        fetchWithAuth('/discounts/pharmacy/campaigns/mine'),

    optInCampaign: (id: string) =>
        fetchWithAuth(`/discounts/pharmacy/campaigns/${id}/optin`, {
            method: 'POST',
        }),

    optOutCampaign: (id: string) =>
        fetchWithAuth(`/discounts/pharmacy/campaigns/${id}/optout`, {
            method: 'POST',
        }),

    // ==================== UNIFIED PARTNERSHIPS ====================
    getPartnerships: (status?: string) => {
        const query = status ? `?status=${status}` : '';
        return fetchWithAuth(`/pharmacy/partnerships${query}`);
    },
    invitePartnership: (data: { targetType: string; targetId: string; partnershipType?: string; metadata?: any }) =>
        fetchWithAuth('/pharmacy/partnerships/invite', { method: 'POST', body: JSON.stringify(data) }),
    respondPartnership: (id: string, action: 'accept' | 'reject') =>
        fetchWithAuth(`/pharmacy/partnerships/${id}/respond`, { method: 'POST', body: JSON.stringify({ action }) }),
    requestChangesPartnership: (id: string, message: string, metadataUpdates?: any) =>
        fetchWithAuth(`/pharmacy/partnerships/${id}/request-changes`, { method: 'POST', body: JSON.stringify({ message, metadataUpdates }) }),
    acceptChangesPartnership: (id: string) =>
        fetchWithAuth(`/pharmacy/partnerships/${id}/accept-changes`, { method: 'POST' }),
    terminatePartnership: (id: string) =>
        fetchWithAuth(`/pharmacy/partnerships/${id}`, { method: 'DELETE' }),

    createPOSOrder: (data: any, idempotencyKey: string) =>
        fetchWithAuth('/pharmacy/pos/checkout', {
            method: 'POST',
            headers: {
                'idempotency-key': idempotencyKey,
            },
            body: JSON.stringify(data),
        }),

    // Staff Management (owner-only)
    getStaff: () =>
        fetchWithAuth('/pharmacy/staff'),

    inviteStaff: (email: string, role: 'manager' | 'staff') =>
        fetchWithAuth('/pharmacy/staff/invite', {
            method: 'POST',
            body: JSON.stringify({ email, role }),
        }),

    updateStaffRole: (memberId: string, role: 'manager' | 'staff') =>
        fetchWithAuth(`/pharmacy/staff/${memberId}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
        }),

    updateStaffStatus: (memberId: string, action: 'suspend' | 'remove') =>
        fetchWithAuth(`/pharmacy/staff/${memberId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ action }),
        }),
};

// ==================== CLINIC API ====================
// Backend: routes/clinic.js

export interface ClinicCompletionTask {
    id: string;
    label: string;
    completed: boolean;
    route: string;
    description?: string;
}

export interface ClinicCompletionSection {
    id: string;
    label: string;
    completed: boolean;
    percentage: number;
    weight: number;
    tasks: ClinicCompletionTask[];
    route: string;
}

export interface ClinicProfileCompletion {
    percentage: number;
    completedSectionsCount: number;
    totalSectionsCount: number;
    completedTasksCount: number;
    totalTasksCount: number;
    isComplete: boolean;
    status: 'completed' | 'in_progress' | 'not_started';
    nextStep: {
        id: string;
        label: string;
        description: string;
        route: string;
        sectionId?: string;
    } | null;
    sections: ClinicCompletionSection[];
    summary: string;
}

export interface ClinicDashboardPreferences {
    show_profile_completion: boolean;
    onboarding_completed: boolean;
}

export const clinicApi = {
    // Operational Routing
    routePharmacyOrder: (data: { pharmacyId: string; prescriptionId: string; items: any[]; deliveryType?: string; deliveryAddress?: string }) =>
        fetchWithAuth('/clinics/owner/partnerships/pharmacy-orders', { method: 'POST', body: JSON.stringify(data) }),
        
    routeDiagnosticBooking: (data: { centerId: string; prescriptionId?: string; patientId?: string; consultationId?: string; testId?: string; testName?: string; reason?: string; notes?: string; urgency?: string; bookingDate: string; bookingTime?: string; collectionType: string; collectionAddress?: string }) =>
        fetchWithAuth('/clinics/owner/partnerships/diagnostic-bookings', { method: 'POST', body: JSON.stringify(data) }),
        
    getRoutedPharmacyOrders: () => fetchWithAuth('/clinics/owner/partnerships/pharmacy-orders'),
    
    getRoutedDiagnosticBookings: () => fetchWithAuth('/clinics/owner/partnerships/diagnostic-bookings'),

    // Phase 3 Referrals
    getReferrals: (status?: string) => {
        const query = status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : '';
        return fetchWithAuth(`/clinics/owner/partnerships/referrals${query}`);
    },

    createReferral: (data: {
        hospitalId: string;
        patientId: string;
        reason: string;
        urgency: 'routine' | 'urgent' | 'emergency';
        clinicalSummary?: string;
        consultationId?: string;
    }) =>
        fetchWithAuth('/clinics/owner/partnerships/referrals', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    cancelReferral: (id: string) =>
        fetchWithAuth(`/clinics/owner/partnerships/referrals/${id}/cancel`, {
            method: 'POST',
        }),

    getDashboard: () => fetchWithAuth('/clinics/owner/dashboard'),

    getReviews: (page: number = 1, limit: number = 10) =>
        fetchWithAuth(`/clinics/owner/reviews?page=${page}&limit=${limit}`),

    respondToReview: (id: string, response: string) =>
        fetchWithAuth(`/clinics/owner/reviews/${id}/respond`, {
            method: 'POST',
            body: JSON.stringify({ response }),
        }),

    getDoctorReviews: (page: number = 1, limit: number = 20) =>
        fetchWithAuth(`/clinics/owner/doctor-reviews?page=${page}&limit=${limit}`),

    getProfile: () => fetchWithAuth('/clinics/owner/profile'),

    getProfileCompletion: () => fetchWithAuth<ClinicProfileCompletion>('/clinics/owner/completion'),

    getPreferences: () => fetchWithAuth<ClinicDashboardPreferences>('/clinics/owner/preferences'),

    updatePreferences: (data: Partial<ClinicDashboardPreferences>) =>
        fetchWithAuth<ClinicDashboardPreferences>('/clinics/owner/preferences', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    updateProfile: (data: Record<string, unknown>) =>
        fetchWithAuth('/clinics/owner/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    getDoctors: (params: { page?: number; limit?: number; search?: string; status?: 'active' | 'former' | 'all' } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.search) query.set('search', params.search);
        if (params.status) query.set('status', params.status);
        return fetchWithAuth(`/clinics/owner/doctors?${query}`);
    },

    getDoctorAffiliationHistory: (doctorId: string) =>
        fetchWithAuth<{ success: boolean; data: any }>(`/clinics/owner/doctors/${doctorId}/history`),

    reinviteDoctor: (doctorId: string, payload?: { departmentId?: string; department_id?: string; message?: string }) =>
        fetchWithAuth<{ success: boolean; data: any; message: string }>(`/clinics/owner/doctors/${doctorId}/reinvite`, {
            method: 'POST',
            body: payload ? JSON.stringify(payload) : undefined,
        }),

    getDoctorProfile: (doctorId: string) =>
        fetchWithAuth(`/clinics/owner/doctors/${doctorId}/profile`),

    addDoctor: (data: Record<string, unknown>) => {
        const url = data.doctorId ? `/clinics/owner/doctors/${data.doctorId}` : '/clinics/owner/doctors';
        return fetchWithAuth(url, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    },

    lookupDoctorByEmail: (email: string) =>
        fetchWithAuth<{ doctor: any, relationship: 'ACTIVE' | 'INVITATION_PENDING' | 'NOT_CONNECTED' }>(`/clinics/owner/doctors/lookup-by-email?email=${encodeURIComponent(email)}`),

    removeDoctor: (doctorId: string, payload?: { reason: string; note?: string }) =>
        fetchWithAuth<{ success: boolean; message: string; notified?: boolean }>(`/clinics/owner/doctors/${doctorId}`, {
            method: 'DELETE',
            body: payload ? JSON.stringify(payload) : undefined,
        }),

    getAssociatedPharmacies: () => fetchWithAuth('/clinics/owner/pharmacies'),

    invitePharmacy: (email: string) =>
        fetchWithAuth('/clinics/owner/pharmacies/invite', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),

    unlinkPharmacy: (providerId: string) =>
        fetchWithAuth(`/clinics/owner/pharmacies/${providerId}`, { method: 'DELETE' }),

    getAssociatedDiagnosticCenters: () => fetchWithAuth('/clinics/owner/diagnostic-centers'),

    inviteDiagnosticCenter: (email: string) =>
        fetchWithAuth('/clinics/owner/diagnostic-centers/invite', {
            method: 'POST',
            body: JSON.stringify({ email }),
        }),

    unlinkDiagnosticCenter: (providerId: string) =>
        fetchWithAuth(`/clinics/owner/diagnostic-centers/${providerId}`, { method: 'DELETE' }),

    // ==================== UNIFIED PARTNERSHIPS ====================
    getPartnerships: (status?: string) => {
        const query = status ? `?status=${status}` : '';
        return fetchWithAuth(`/clinics/owner/partnerships${query}`);
    },
    invitePartnership: (data: { targetType: string; targetId: string; partnershipType?: string; metadata?: any }) =>
        fetchWithAuth('/clinics/owner/partnerships/invite', { method: 'POST', body: JSON.stringify(data) }),
    respondPartnership: (id: string, action: 'accept' | 'reject') =>
        fetchWithAuth(`/clinics/owner/partnerships/${id}/respond`, { method: 'POST', body: JSON.stringify({ action }) }),
    requestChangesPartnership: (id: string, message: string, metadataUpdates?: any) =>
        fetchWithAuth(`/clinics/owner/partnerships/${id}/request-changes`, { method: 'POST', body: JSON.stringify({ message, metadataUpdates }) }),
    acceptChangesPartnership: (id: string) =>
        fetchWithAuth(`/clinics/owner/partnerships/${id}/accept-changes`, { method: 'POST' }),
    terminatePartnership: (id: string) =>
        fetchWithAuth(`/clinics/owner/partnerships/${id}`, { method: 'DELETE' }),

    getAppointments: (params: { page?: number; limit?: number; search?: string; status?: string; date?: string; dateRange?: string; doctorId?: string; type?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.search) query.set('search', params.search);
        if (params.status && params.status !== 'all') query.set('status', params.status);
        if (params.date) query.set('date', params.date);
        if (params.dateRange && params.dateRange !== 'all') query.set('dateRange', params.dateRange);
        if (params.doctorId && params.doctorId !== 'all') query.set('doctorId', params.doctorId);
        if (params.type && params.type !== 'all') query.set('type', params.type);
        return fetchWithAuth(`/clinics/owner/appointments?${query}`);
    },

    getConsultations: (params: { page?: number; limit?: number; search?: string; status?: string; type?: string; date?: string; dateRange?: string; doctorId?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.status && params.status !== 'all') query.set('status', params.status);
        if (params.search) query.set('search', params.search);
        if (params.type && params.type !== 'all') query.set('type', params.type);
        if (params.date) query.set('date', params.date);
        if (params.dateRange && params.dateRange !== 'all') query.set('dateRange', params.dateRange);
        if (params.doctorId && params.doctorId !== 'all') query.set('doctorId', params.doctorId);
        return fetchWithAuth(`/clinics/owner/consultations?${query}`);
    },

    getSchedule: () => fetchWithAuth('/clinics/owner/schedule'),

    updateSchedule: (schedule: Record<string, unknown>) =>
        fetchWithAuth('/clinics/owner/schedule', {
            method: 'PUT',
            body: JSON.stringify(schedule),
        }),

    // ── Reels ──
    addReel: (video_url: string, title?: string) =>
        fetchWithAuth('/clinics/owner/reels', {
            method: 'POST',
            body: JSON.stringify({ video_url, title }),
        }),

    deleteReel: (reelId: string) =>
        fetchWithAuth(`/clinics/owner/reels/${reelId}`, {
            method: 'DELETE',
        }),

    // ── Departments ──
    getDepartments: () => fetchWithAuth('/clinics/owner/departments'),

    getDepartmentMeta: () => fetchWithAuth('/clinics/owner/departments/meta'),

    getDepartmentDetail: (departmentId: string) =>
        fetchWithAuth(`/clinics/owner/departments/${departmentId}`),

    getDepartmentAvailableDoctors: (departmentId: string) =>
        fetchWithAuth(`/clinics/owner/departments/${departmentId}/available-doctors`),

    addDepartment: (data: Record<string, unknown>) =>
        fetchWithAuth('/clinics/owner/departments', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateDepartment: (departmentId: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/clinics/owner/departments/${departmentId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteDepartment: (departmentId: string) =>
        fetchWithAuth(`/clinics/owner/departments/${departmentId}`, { method: 'DELETE' }),

    assignDoctorToDepartment: (departmentId: string, doctorId: string) =>
        fetchWithAuth(`/clinics/owner/departments/${departmentId}/doctors`, {
            method: 'POST',
            body: JSON.stringify({ doctorId }),
        }),

    setDepartmentDoctors: (departmentId: string, doctorIds: string[]) =>
        fetchWithAuth(`/clinics/owner/departments/${departmentId}/doctors`, {
            method: 'PUT',
            body: JSON.stringify({ doctorIds }),
        }),

    unassignDoctorFromDepartment: (departmentId: string, doctorId: string) =>
        fetchWithAuth(`/clinics/owner/departments/${departmentId}/doctors/${doctorId}`, {
            method: 'DELETE',
        }),

    // ── Analytics ──
    getAnalytics: (period: string = '30d') => fetchWithAuth(`/clinics/owner/analytics?period=${encodeURIComponent(period)}`),

    // ── Doctor Invites ──
    getInvites: (params: { page?: number; limit?: number; status?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.status) query.set('status', params.status);
        return fetchWithAuth(`/clinics/owner/invites?${query}`);
    },

    cancelInvite: (inviteId: string) =>
        fetchWithAuth(`/clinics/owner/invites/${inviteId}/cancel`, { method: 'POST' }),

    // ── Platform Invites ──
    sendPlatformInvite: (email: string, message?: string) =>
        fetchWithAuth('/clinics/owner/platform-invite', {
            method: 'POST',
            body: JSON.stringify({ email, message }),
        }),

    // ── Doctor Join Requests ──
    getJoinRequests: (params: { page?: number; limit?: number; status?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.status) query.set('status', params.status);
        return fetchWithAuth(`/clinics/owner/join-requests?${query}`);
    },

    respondToJoinRequest: (requestId: string, decision: 'accept' | 'reject', message?: string) =>
        fetchWithAuth(`/clinics/owner/join-requests/${requestId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ decision, message }),
        }),
    // ── Clinic Patients ──
    getPatients: (params: { page?: number; limit?: number; search?: string; filter?: string; doctorId?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.search) query.set('search', params.search);
        if (params.filter && params.filter !== 'all') query.set('filter', params.filter);
        if (params.doctorId && params.doctorId !== 'all') query.set('doctorId', params.doctorId);
        return fetchWithAuth(`/clinics/owner/patients?${query}`);
    },

    getPatientDetails: (patientId: string) =>
        fetchWithAuth(`/clinics/owner/patients/${patientId}`),

    // ── Clinic Appointment Workflow ──
    updateAppointmentStatus: (appointmentId: string, status: string, reason?: string) =>
        fetchWithAuth(`/clinics/owner/appointments/${appointmentId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, reason }),
        }),

    rescheduleAppointment: (appointmentId: string, date: string, timeSlot: string) =>
        fetchWithAuth(`/clinics/owner/appointments/${appointmentId}/reschedule`, {
            method: 'POST',
            body: JSON.stringify({ date, timeSlot }),
        }),

    checkInAppointment: (appointmentId: string) =>
        fetchWithAuth(`/clinics/owner/appointments/${appointmentId}/check-in`, {
            method: 'POST',
        }),

    // ── Clinic Health Intelligence & Alerts ──
    getHealthAlerts: () => fetchWithAuth('/clinics/owner/health-alerts'),

    // ── Outbreak Alerts (read-only) ──
    getOutbreakAlerts: (city?: string) => {
        const params = new URLSearchParams();
        if (city) params.set('city', city);
        return fetchWithAuth(`/admin/outbreaks/public/alerts?${params}`);
    },
    getOutbreakHeatmap: () => fetchWithAuth('/admin/outbreaks/public/heatmap'),
    getOutbreakStats: (days: number = 30) => fetchWithAuth(`/admin/outbreaks/public/stats?days=${days}`),
};

// ==================== DIAGNOSTIC CENTER API ====================
// Backend: routes/diagnosticCenter.js

export const diagnosticCenterApi = {
    getDashboard: () => fetchWithAuth('/diagnostic-centers/owner/dashboard'),
    
    // Staff Management
    getStaff: () => fetchWithAuth('/diagnostic-centers/owner/staff'),
    
    inviteStaff: (email: string, role: string) => 
        fetchWithAuth('/diagnostic-centers/owner/staff/invite', {
            method: 'POST',
            body: JSON.stringify({ email, role }),
        }),
        
    updateStaffRole: (id: string, role: string) =>
        fetchWithAuth(`/diagnostic-centers/owner/staff/${id}/role`, {
            method: 'PATCH',
            body: JSON.stringify({ role }),
        }),
        
    updateStaffStatus: (id: string, action: 'suspend' | 'activate') =>
        fetchWithAuth(`/diagnostic-centers/owner/staff/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ action }),
        }),
        
    removeStaff: (id: string) =>
        fetchWithAuth(`/diagnostic-centers/owner/staff/${id}`, {
            method: 'DELETE',
        }),

    getReviews: (page: number = 1, limit: number = 10) =>
        fetchWithAuth(`/diagnostic-centers/owner/reviews?page=${page}&limit=${limit}`),

    respondToReview: (id: string, response: string) =>
        fetchWithAuth(`/diagnostic-centers/owner/reviews/${id}/respond`, {
            method: 'POST',
            body: JSON.stringify({ response }),
        }),

    getProfile: () => fetchWithAuth('/diagnostic-centers/owner/profile'),

    updateProfile: (data: Record<string, unknown>) =>
        fetchWithAuth('/diagnostic-centers/owner/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    addReel: (data: { videoUrl: string, thumbnailUrl?: string, title?: string }) =>
        fetchWithAuth('/diagnostic-centers/owner/reels', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    deleteReel: (id: string) =>
        fetchWithAuth(`/diagnostic-centers/owner/reels/${id}`, {
            method: 'DELETE',
        }),

    getTests: (params: { page?: number; limit?: number; search?: string; category?: string; isActive?: boolean } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.search) query.set('search', params.search);
        if (params.category) query.set('category', params.category);
        if (typeof params.isActive === 'boolean') query.set('isActive', String(params.isActive));
        return fetchWithAuth(`/diagnostic-centers/owner/tests?${query}`);
    },

    searchMasterTests: (search: string, category?: string, page: number = 1) => {
        const params = new URLSearchParams({ page: String(page) });
        if (search) params.set('search', search);
        if (category) params.set('category', category);
        return fetchWithAuth(`/diagnostic-centers/master-tests?${params}`);
    },

    addTest: (data: Record<string, unknown>) =>
        fetchWithAuth('/diagnostic-centers/owner/tests', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateTest: (testId: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/diagnostic-centers/owner/tests/${testId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteTest: (testId: string) =>
        fetchWithAuth(`/diagnostic-centers/owner/tests/${testId}`, { method: 'DELETE' }),

    getBookings: (params: { page?: number; limit?: number; status?: string; resultStatus?: string; date?: string; dateFrom?: string; dateTo?: string; collectionType?: string; patientId?: string; search?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.status) query.set('status', params.status);
        if (params.resultStatus) query.set('resultStatus', params.resultStatus);
        if (params.date) query.set('date', params.date);
        if (params.dateFrom) query.set('dateFrom', params.dateFrom);
        if (params.dateTo) query.set('dateTo', params.dateTo);
        if (params.collectionType) query.set('collectionType', params.collectionType);
        if (params.patientId) query.set('patientId', params.patientId);
        if (params.search) query.set('search', params.search);
        return fetchWithAuth(`/diagnostic-centers/owner/bookings?${query}`);
    },

    getPatients: (params: { page?: number; limit?: number; search?: string } = {}) => {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        if (params.search) query.append('search', params.search);
        return fetchWithAuth(`/diagnostic-centers/owner/patients?${query}`);
    },

    getPatientHistory: (patientId: string, params: { page?: number; limit?: number } = {}) => {
        const query = new URLSearchParams();
        if (params.page) query.append('page', params.page.toString());
        if (params.limit) query.append('limit', params.limit.toString());
        return fetchWithAuth(`/diagnostic-centers/owner/patients/${patientId}/history?${query}`);
    },

    getBookingById: (bookingId: string) =>
        fetchWithAuth(`/diagnostic-centers/owner/bookings/${bookingId}`),

    updateBookingStatus: (bookingId: string, status: string) =>
        fetchWithAuth(`/diagnostic-centers/owner/bookings/${bookingId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),

    uploadResult: (bookingId: string, data: FormData) =>
        fetchWithAuth(`/diagnostic-centers/owner/bookings/${bookingId}/result`, {
            method: 'PATCH',
            body: data,
        }),

    getBookingReportUrl: (bookingId: string) =>
        fetchWithAuth<{ url: string; objectName?: string; result_status?: string; test_name?: string; patient_name?: string }>(`/diagnostic-centers/owner/bookings/${bookingId}/report`),

    getAnalytics: (period: number = 30) => fetchWithAuth(`/diagnostic-centers/owner/analytics?period=${period}`),

    getResults: (params: { page?: number; limit?: number; resultStatus?: string; search?: string; status?: string; collectionType?: string; dateFrom?: string; dateTo?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.resultStatus) query.set('resultStatus', params.resultStatus);
        if (params.search) query.set('search', params.search);
        if (params.status) query.set('status', params.status);
        if (params.collectionType) query.set('collectionType', params.collectionType);
        if (params.dateFrom) query.set('dateFrom', params.dateFrom);
        if (params.dateTo) query.set('dateTo', params.dateTo);
        return fetchWithAuth(`/diagnostic-centers/owner/bookings?${query}`);
    },

    getAssociationInvites: () => fetchWithAuth('/diagnostic-centers/owner/associations/invites'),

    respondToAssociationInvite: (inviteId: string, decision: 'accept' | 'reject') =>
        fetchWithAuth(`/diagnostic-centers/owner/associations/invites/${inviteId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ decision }),
        }),

    getAssociations: () => fetchWithAuth('/diagnostic-centers/owner/associations'),

    // ==================== UNIFIED PARTNERSHIPS ====================
    getPartnerships: (status?: string) => {
        const query = status ? `?status=${status}` : '';
        return fetchWithAuth(`/diagnostic-centers/owner/partnerships${query}`);
    },
    invitePartnership: (data: { targetType: string; targetId: string; partnershipType?: string; metadata?: any }) =>
        fetchWithAuth('/diagnostic-centers/owner/partnerships/invite', { method: 'POST', body: JSON.stringify(data) }),
    respondPartnership: (id: string, action: 'accept' | 'reject') =>
        fetchWithAuth(`/diagnostic-centers/owner/partnerships/${id}/respond`, { method: 'POST', body: JSON.stringify({ action }) }),
    requestChangesPartnership: (id: string, message: string, metadataUpdates?: any) =>
        fetchWithAuth(`/diagnostic-centers/owner/partnerships/${id}/request-changes`, { method: 'POST', body: JSON.stringify({ message, metadataUpdates }) }),
    acceptChangesPartnership: (id: string) =>
        fetchWithAuth(`/diagnostic-centers/owner/partnerships/${id}/accept-changes`, { method: 'POST' }),
    terminatePartnership: (id: string) =>
        fetchWithAuth(`/diagnostic-centers/owner/partnerships/${id}`, { method: 'DELETE' }),
};

// ==================== APPOINTMENTS API ====================
// Backend: routes/appointment/index.js

export const appointmentsApi = {
    getAll: (filters?: { status?: string; date?: string }, page: number = 1) => {
        const params = new URLSearchParams({ page: page.toString() });
        if (filters?.status) params.set('status', filters.status);
        if (filters?.date) params.set('date', filters.date);
        return fetchWithAuth(`/appointments?${params}`);
    },

    getById: (id: string) => fetchWithAuth(`/appointments/${id}`),

    resendOtp: (id: string) => fetchWithAuth(`/appointments/${id}/resend-otp`, { method: 'POST' }),

    create: (data: {
        doctorId: string;
        date: string;
        timeSlot: string;
        type: 'video' | 'clinic' | 'home_visit';
        reason?: string;
    }) =>
        fetchWithAuth('/appointments', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /** Use PUT /appointments/:id/status for confirm/complete/etc */
    updateStatus: (id: string, status: string, notes?: string, otp?: string) =>
        fetchWithAuth(`/appointments/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, notes, otp }),
        }),

    cancel: (id: string, reason?: string) =>
        fetchWithAuth(`/appointments/${id}/cancel`, {
            method: 'PUT',
            body: JSON.stringify({ reason }),
        }),

    updateAppointmentNotes: (id: string, reason: string, symptoms: string[]) => 
        fetchWithAuth(`/appointments/${id}/notes`, {
            method: 'PUT',
            body: JSON.stringify({ reason, symptoms }),
        }),

    reschedule: (id: string, date: string, timeSlot: string) =>
        fetchWithAuth(`/appointments/${id}/reschedule`, {
            method: 'POST',
            body: JSON.stringify({ date, timeSlot }),
        }),

    addPrescription: (appointmentId: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/appointments/${appointmentId}/prescription`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
};

// ==================== CONSULTATIONS API ====================
// Backend: routes/consultation/index.js

export const consultationsApi = {
    getAll: () => fetchWithAuth('/consultations'),
    getById: (id: string) => fetchWithAuth(`/consultations/${id}`),

    start: (appointmentId: string) =>
        fetchWithAuth(`/consultations/${appointmentId}/start`, { method: 'POST' }),

    join: (consultationId: string) =>
        fetchWithAuth(`/consultations/${consultationId}/join`, { method: 'POST' }),

    end: (consultationId: string, data?: { notes?: string; diagnosis?: string; followUpDate?: string; duration?: number; otp?: string }) =>
        fetchWithAuth(`/consultations/${consultationId}/end`, {
            method: 'PUT',
            body: JSON.stringify(data || {}),
        }),

    leave: (consultationId: string) =>
        fetchWithAuth(`/consultations/${consultationId}/leave`, { method: 'POST' }),

    getDetails: (consultationId: string) =>
        fetchWithAuth(`/consultations/${consultationId}`),

    getIceServers: (consultationId: string) =>
        fetchWithAuth(`/consultations/${consultationId}/ice-servers`),

    addPrescription: (consultationId: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/consultations/${consultationId}/prescription`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    aiAssist: (consultationId: string, query: string, symptoms?: string, vitals?: any, vitalsHistory?: any[]) =>
        fetchWithAuth(`/consultations/${consultationId}/ai-assist`, {
            method: 'POST',
            body: JSON.stringify({ query, symptoms, vitals, vitalsHistory }),
        }),

    generateSummary: (consultationId: string, vitalsHistory?: any[]) =>
        fetchWithAuth(`/consultations/${consultationId}/summarize`, {
            method: 'POST',
            body: JSON.stringify({ vitalsHistory }),
        }),

    // ── Consultation lifecycle engine (Part 8-16) ────────────────────
    lifecycle: (consultationId: string) =>
        fetchWithAuth(`/consultations/${consultationId}/lifecycle`),

    consent: (consultationId: string, consent: Record<string, unknown>) =>
        fetchWithAuth(`/consultations/${consultationId}/consent`, {
            method: 'POST',
            body: JSON.stringify(consent),
        }),

    captureNetworkEvent: (consultationId: string, event: string, metadata?: Record<string, unknown>) =>
        fetchWithAuth(`/consultations/${consultationId}/network`, {
            method: 'POST',
            body: JSON.stringify({ event, metadata }),
        }),

    captureDeviceEvent: (consultationId: string, event: string, metadata?: Record<string, unknown>) =>
        fetchWithAuth(`/consultations/${consultationId}/device`, {
            method: 'POST',
            body: JSON.stringify({ event, metadata }),
        }),

    requestEnd: (consultationId: string, reason?: string) =>
        fetchWithAuth(`/consultations/${consultationId}/end/request`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        }),

    respondEnd: (consultationId: string, decision: 'confirm' | 'decline', otp?: string) =>
        fetchWithAuth(`/consultations/${consultationId}/end/respond`, {
            method: 'POST',
            body: JSON.stringify({ decision, otp }),
        }),

    completeEnd: (consultationId: string, data?: {
        reason?: string;
        otp?: string;
        diagnosis?: string;
        notes?: string;
        followUpDate?: string;
        duration?: number;
    }) =>
        fetchWithAuth(`/consultations/${consultationId}/end/complete`, {
            method: 'POST',
            body: JSON.stringify(data || {}),
        }),

    forceComplete: (consultationId: string, data?: { reason?: string; otp?: string; disputedByPatient?: boolean }) =>
        fetchWithAuth(`/consultations/${consultationId}/end/force`, {
            method: 'POST',
            body: JSON.stringify(data || {}),
        }),

    pause: (consultationId: string) =>
        fetchWithAuth(`/consultations/${consultationId}/pause`, { method: 'POST' }),

    resume: (consultationId: string) =>
        fetchWithAuth(`/consultations/${consultationId}/resume`, { method: 'POST' }),

    reportState: (consultationId: string, state: 'joined' | 'patient_left' | 'doctor_left' | 'reconnecting' | 'recovered') =>
        fetchWithAuth(`/consultations/${consultationId}/state`, {
            method: 'POST',
            body: JSON.stringify({ state }),
        }),

    getLogs: (consultationId: string) =>
        fetchWithAuth(`/consultations/${consultationId}/logs`),

    getPolicies: () =>
        fetchWithAuth('/consultations/policies'),

    updatePolicy: (key: string, value: string) =>
        fetchWithAuth(`/consultations/policies/${key}`, {
            method: 'PUT',
            body: JSON.stringify({ value }),
        }),
};

// ==================== UPLOAD API ====================
// Backend: routes/uploads.js

/**
 * Client-side image compression before upload (saves bandwidth for 2G/3G users).
 * Dynamically imported to avoid loading compression code on pages that don't upload.
 */
async function compressIfImage(file: File): Promise<File> {
    if (!file.type.startsWith('image/')) return file;
    try {
        const { compressImage } = await import('./imageCompression');
        return compressImage(file);
    } catch {
        return file;
    }
}

export const uploadApi = {
    uploadFile: async (file: File, type: string = 'document', fields?: Record<string, string>) => {
        // Compress images client-side before uploading
        const processedFile = await compressIfImage(file);
        const formData = new FormData();
        formData.append('file', processedFile);
        Object.entries(fields || {}).forEach(([key, value]) => {
            formData.append(key, value);
        });

        return fetchWithAuth(`/uploads/${type}`, {
            method: 'POST',
            body: formData,
        });
    },

    uploadMultiple: async (files: File[], folder?: string) => {
        // Compress all images in parallel
        const processedFiles = await Promise.all(files.map(compressIfImage));
        const formData = new FormData();
        processedFiles.forEach((file) => formData.append('files', file));
        if (folder) formData.append('folder', folder);

        return fetchWithAuth(`/uploads/multiple`, {
            method: 'POST',
            body: formData,
        });
    },

    getPresignedUrl: (fileName: string) =>
        fetchWithAuth(`/uploads/presigned-download?fileName=${encodeURIComponent(fileName)}`),

    deleteFile: (fileName: string) =>
        fetchWithAuth(`/uploads/${encodeURIComponent(fileName)}`, { method: 'DELETE' }),
};

// ==================== NOTIFICATIONS API ====================
// Backend: routes/notification/index.js

export const notificationsApi = {
    getAll: (page: number = 1, limit: number = 20, unreadOnly?: boolean, types?: string[], search?: string) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString()
        });
        if (unreadOnly) params.set('unreadOnly', 'true');
        if (types && types.length > 0) params.set('types', types.join(','));
        if (search) params.set('search', search);
        return fetchWithAuth(`/notifications?${params}`);
    },

    getUnreadCount: () => fetchWithAuth('/notifications/unread-count'),

    markAsRead: (id: string) =>
        fetchWithAuth(`/notifications/${id}/read`, { method: 'PUT' }),

    markAllAsRead: () =>
        fetchWithAuth('/notifications/read-all', { method: 'PUT' }),

    clearRead: () =>
        fetchWithAuth('/notifications/read', { method: 'DELETE' }),

    clearAll: () =>
        fetchWithAuth('/notifications', { method: 'DELETE' }),
};

// ==================== VITALS API ====================
// Session vitals for doctor dashboard (backend routes /api/vitals/session/* required)

export const vitalsApi = {
    getLatest: (sessionId: string) =>
        fetchWithAuth(`/vitals/session/${sessionId}/latest`),

    getHistory: (sessionId: string, limit: number = 100) =>
        fetchWithAuth(`/vitals/session/${sessionId}/history?limit=${limit}`),

    getAlerts: (sessionId: string) =>
        fetchWithAuth(`/vitals/session/${sessionId}/alerts`),

    getSummary: (sessionId: string) =>
        fetchWithAuth(`/vitals/session/${sessionId}/summary`),
};

// ==================== FEATURE TOGGLES API ====================
// Backend: routes/featureToggle.js

export const featureTogglesApi = {
    get: () => fetchWithAuth('/feature-toggles'),

    update: (toggles: Record<string, boolean>) =>
        fetchWithAuth('/feature-toggles', {
            method: 'PUT',
            body: JSON.stringify({ toggles }),
        }),

    reset: () =>
        fetchWithAuth('/feature-toggles/reset', { method: 'POST' }),

    checkFeature: (feature: string) =>
        fetchWithAuth(`/feature-toggles/${feature}`),
};

// ==================== MEDICINE API ====================
// Backend: routes/medicine/index.js

export const medicineApi = {
    getCategories: () => fetchWithAuth('/medicines/categories'),

    getPopular: (limit: number = 10) =>
        fetchWithAuth(`/medicines/popular?limit=${limit}`),

    search: (q: string, filters?: { category?: string; requiresPrescription?: boolean; maxPrice?: number }, page: number = 1) => {
        const params = new URLSearchParams({ page: page.toString() });
        if (q) params.set('q', q);
        if (filters?.category) params.set('category', filters.category);
        if (filters?.requiresPrescription) params.set('requiresPrescription', 'true');
        if (filters?.maxPrice) params.set('maxPrice', filters.maxPrice.toString());
        return fetchWithAuth(`/medicines/search?${params}`);
    },

    getById: (id: string) => fetchWithAuth(`/medicines/${id}`),

    getAvailability: (id: string, latitude: number, longitude: number, radius: number = 10) =>
        fetchWithAuth(`/medicines/${id}/availability?latitude=${latitude}&longitude=${longitude}&radius=${radius}`),

    getAlternatives: (id: string) => fetchWithAuth(`/medicines/${id}/alternatives`),

    findPharmacies: (id: string, latitude: number, longitude: number, radius: number = 10) =>
        fetchWithAuth(`/medicines/${id}/pharmacies?latitude=${latitude}&longitude=${longitude}&radius=${radius}`),

    checkPrescriptionRequired: (medicineIds: string[]) =>
        fetchWithAuth('/medicines/check-prescription', {
            method: 'POST',
            body: JSON.stringify({ medicineIds }),
        }),

    uploadPrescription: (file: File, orderId?: string) => {
        const formData = new FormData();
        formData.append('prescription', file);
        if (orderId) formData.append('orderId', orderId);
        return fetchWithAuth('/medicines/upload-prescription', {
            method: 'POST',
            body: formData,
            headers: {}, // Let browser set multipart boundary
        });
    },

    createOrder: (pharmacyId: string, items: { medicineId: string; quantity: number }[], deliveryAddress: string) =>
        fetchWithAuth('/medicines/orders', {
            method: 'POST',
            body: JSON.stringify({ pharmacyId, items, deliveryAddress }),
        }),
};

// ==================== COMMUNITY API ====================
// Backend: routes/communityRoutes.js

export const communityApi = {
    getQuestions: (page: number = 1, limit: number = 20, filter?: string, search?: string, sortBy?: string) => {
        let url = `/community/questions?page=${page}&limit=${limit}`;
        if (filter) url += `&filter=${encodeURIComponent(filter)}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        if (sortBy) url += `&sortBy=${encodeURIComponent(sortBy)}`;
        return fetchWithAuth(url);
    },
    addAnswer: (questionId: string, content: string) => fetchWithAuth(`/community/questions/${questionId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    }),
    editAnswer: (answerId: string, content: string) => fetchWithAuth(`/community/answers/${answerId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    }),
    deleteAnswer: (answerId: string) => fetchWithAuth(`/community/answers/${answerId}`, {
        method: 'DELETE'
    }),
    reportQuestion: (questionId: string, data: { reason: string, details?: string }) => fetchWithAuth(`/community/questions/${questionId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }),
    reportAnswer: (answerId: string, data: { reason: string, details?: string }) => fetchWithAuth(`/community/answers/${answerId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    }),
    getReports: (status?: string) => fetchWithAuth(`/community/admin/reports${status ? `?status=${status}` : ''}`),
    updateReportStatus: (reportId: string, status: string) => fetchWithAuth(`/community/admin/reports/${reportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
    }),
    moderateContent: (targetType: string, targetId: string, status: string) => fetchWithAuth(`/community/admin/moderate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, status })
    })
};

// ==================== WELLNESS API ====================

const wellnessQuery = (params?: Record<string, unknown>) => {
    const search = new URLSearchParams();
    Object.entries(params || {}).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            search.set(key, String(value));
        }
    });
    const queryString = search.toString();
    return queryString ? `?${queryString}` : '';
};

export const wellnessApi = {
    getCoachProfile: () => fetchWithAuth('/wellness/coaches/me'),
    updateCoachProfile: (data: Record<string, unknown>) =>
        fetchWithAuth('/wellness/coaches/me', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    getSessions: (status?: string) =>
        fetchWithAuth(`/wellness/sessions${wellnessQuery({ status })}`),
    getOwnerCenter: () => fetchWithAuth('/wellness/owner/center'),
    addFitnessReel: (video_url: string, title?: string) =>
        fetchWithAuth('/wellness/owner/reels', {
            method: 'POST',
            body: JSON.stringify({ video_url, title }),
        }),
    deleteFitnessReel: (reelId: string) =>
        fetchWithAuth(`/wellness/owner/reels/${reelId}`, {
            method: 'DELETE',
        }),
    getOwnerTrainers: () => fetchWithAuth('/wellness/owner/trainers'),
    getOwnerTrainerInvites: (status?: string) =>
        fetchWithAuth(`/wellness/owner/trainer-invites${wellnessQuery({ status })}`),
    createTrainerInvite: (data: Record<string, unknown>) =>
        fetchWithAuth('/wellness/owner/trainer-invites', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    cancelTrainerInvite: (inviteId: string) =>
        fetchWithAuth(`/wellness/owner/trainer-invites/${inviteId}/cancel`, { method: 'POST' }),
    getTrainerInvite: (token: string) =>
        fetchWithAuth('/wellness/trainer-invites/preview', {
            method: 'POST',
            body: JSON.stringify({ token }),
        }),
    getCoachCenterInvites: (status?: string) =>
        fetchWithAuth(`/wellness/coaches/me/center-invites${wellnessQuery({ status })}`),
    respondCoachCenterInvite: (inviteIdOrToken: string, decision: 'accept' | 'reject') =>
        fetchWithAuth(`/wellness/coaches/me/center-invites/${encodeURIComponent(inviteIdOrToken)}/respond`, {
            method: 'POST',
            body: JSON.stringify({ decision }),
        }),
    respondTrainerInviteToken: (token: string, decision: 'accept' | 'reject') =>
        fetchWithAuth('/wellness/trainer-invites/respond', {
            method: 'POST',
            body: JSON.stringify({ token, decision }),
        }),
    getWorkoutPlans: (filters?: Record<string, unknown>, page: number = 1, limit: number = 12) =>
        fetchWithAuth(`/wellness/plans${wellnessQuery({ ...filters, page, limit })}`),
    getExercises: (filters?: Record<string, unknown>, page: number = 1, limit: number = 30) =>
        fetchWithAuth(`/wellness/exercises${wellnessQuery({ ...filters, page, limit })}`),
    getExercise: (id: string) =>
        fetchWithAuth(`/wellness/exercises/${id}`),
    getExerciseStats: () =>
        fetchWithAuth('/wellness/exercises/stats'),
    getWorkoutCalendar: (filters?: Record<string, unknown>) =>
        fetchWithAuth(`/wellness/workouts/calendar${wellnessQuery(filters)}`),
    getWorkoutProgress: (days: number = 30) =>
        fetchWithAuth(`/wellness/workouts/progress${wellnessQuery({ days })}`),
    getBadges: () => fetchWithAuth('/wellness/badges'),
    getAiInsights: (filters?: Record<string, unknown>) =>
        fetchWithAuth(`/wellness/ai/insights${wellnessQuery(filters)}`),
    acknowledgeAiInsight: (id: string) =>
        fetchWithAuth(`/wellness/ai/insights/${id}/acknowledge`, { method: 'POST' }),
    getReports: (days: number = 30) =>
        fetchWithAuth(`/wellness/reports${wellnessQuery({ days })}`),
    getCoaches: (filters?: Record<string, unknown>, page: number = 1, limit: number = 12) =>
        fetchWithAuth(`/wellness/coaches${wellnessQuery({ ...filters, page, limit })}`),
    getFacilities: (filters?: Record<string, unknown>, page: number = 1, limit: number = 12) =>
        fetchWithAuth(`/wellness/facilities${wellnessQuery({ ...filters, page, limit })}`),
    getGroups: (filters?: Record<string, unknown>) =>
        fetchWithAuth(`/wellness/groups${wellnessQuery(filters)}`),
    createGroup: (data: Record<string, unknown>) =>
        fetchWithAuth('/wellness/groups', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    updateGroupTip: (groupId: string, tip: string) =>
        fetchWithAuth(`/wellness/groups/${groupId}/tip`, {
            method: 'PUT',
            body: JSON.stringify({ tip }),
        }),
    getGroupPosts: (groupId: string) =>
        fetchWithAuth(`/wellness/groups/${groupId}/posts`),
    createGroupPost: (groupId: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/wellness/groups/${groupId}/posts`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    cheerGroupPost: (postId: string) =>
        fetchWithAuth(`/wellness/groups/posts/${postId}/cheer`, {
            method: 'POST',
        }),
    getChallenges: (filters?: Record<string, unknown>) =>
        fetchWithAuth(`/wellness/challenges${wellnessQuery(filters)}`),
    createChallenge: (data: Record<string, unknown>) =>
        fetchWithAuth('/wellness/challenges', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getChallengeLeaderboard: (challengeId: string) =>
        fetchWithAuth(`/wellness/challenges/${challengeId}/leaderboard`),
    updateChallengeProgress: (challengeId: string, data?: Record<string, unknown>) =>
        fetchWithAuth(`/wellness/challenges/${challengeId}/progress`, {
            method: 'POST',
            body: JSON.stringify(data || {}),
        }),
    getSupplements: (filters?: Record<string, unknown>, page: number = 1, limit: number = 12) =>
        fetchWithAuth(`/wellness/supplements${wellnessQuery({ ...filters, page, limit })}`),
    getStreaks: () => fetchWithAuth('/wellness/streaks'),
    getSessionMessages: (sessionId: string) =>
        fetchWithAuth(`/wellness/sessions/${sessionId}/messages`),
    getReels: (filters?: Record<string, unknown>, page: number = 1, limit: number = 20) =>
        fetchWithAuth(`/wellness/reels${wellnessQuery({ ...filters, page, limit })}`),
    likeReel: (reelId: string) =>
        fetchWithAuth(`/wellness/reels/${reelId}/like`, { method: 'POST' }),
    viewReel: (reelId: string) =>
        fetchWithAuth(`/wellness/reels/${reelId}/view`, { method: 'POST' }),
    getMyDietPlans: () => fetchWithAuth('/wellness/diet-plans'),
    getCoachPatients: () => fetchWithAuth('/wellness/coaches/me/patients'),
    getPatientAnalytics: (patientId: string) =>
        fetchWithAuth(`/wellness/coaches/me/patients/${patientId}/analytics`),
    getCoachWorkoutPlans: () => fetchWithAuth('/wellness/coaches/me/workout-plans'),
    createCoachWorkoutPlan: (data: Record<string, unknown>) =>
        fetchWithAuth('/wellness/coaches/me/workout-plans', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getCoachDietPlans: () => fetchWithAuth('/wellness/coaches/me/diet-plans'),
    createDietPlan: (data: Record<string, unknown>) =>
        fetchWithAuth('/wellness/coaches/me/diet-plans', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    archiveDietPlan: (planId: string) =>
        fetchWithAuth(`/wellness/coaches/me/diet-plans/${planId}/archive`, { method: 'POST' }),
    updateCoachAvailability: (data: Record<string, unknown>) =>
        fetchWithAuth('/wellness/coaches/me/availability', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    getCoachReels: () => fetchWithAuth('/wellness/coaches/me/reels'),
    createReel: (data: Record<string, unknown>) =>
        fetchWithAuth('/wellness/coaches/me/reels', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getOwnerClasses: (filters?: Record<string, unknown>) =>
        fetchWithAuth(`/wellness/owner/classes${wellnessQuery(filters)}`),
    createOwnerClass: (data: Record<string, unknown>) =>
        fetchWithAuth('/wellness/owner/classes', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    updateOwnerClass: (classId: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/wellness/owner/classes/${classId}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
    cancelOwnerClass: (classId: string) =>
        fetchWithAuth(`/wellness/owner/classes/${classId}`, { method: 'DELETE' }),
    getOwnerBookings: (filters?: Record<string, unknown>) =>
        fetchWithAuth(`/wellness/owner/bookings${wellnessQuery(filters)}`),
    getOwnerCheckins: (filters?: Record<string, unknown>) =>
        fetchWithAuth(`/wellness/owner/checkins${wellnessQuery(filters)}`),
};

// ==================== UNIVERSAL REVIEWS & FEEDBACK APIS ====================

export const reviewsApi = {
    getPending: () => fetchWithAuth('/patients/reviews/pending'),
    getMyReviews: () => fetchWithAuth('/patients/reviews/my-reviews'),
    submitReview: (data: {
        reviewableType: string;
        reviewableId: string;
        rating: number;
        sourceType?: string;
        sourceId?: string;
        consultationId?: string;
        title?: string;
        comment?: string;
        isAnonymous?: boolean;
    }) =>
        fetchWithAuth('/patients/reviews', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getEntityReviews: (type: string, id: string, page: number = 1, limit: number = 10) =>
        fetchWithAuth(`/patients/reviews/${type}/${id}?page=${page}&limit=${limit}`),
    reportReview: (id: string, reason: string, details?: string) =>
        fetchWithAuth(`/patients/reviews/${id}/report`, {
            method: 'POST',
            body: JSON.stringify({ reason, details }),
        }),

    // Admin Review Moderation
    getAdminReviews: (filters?: Record<string, unknown>, page: number = 1, limit: number = 20) => {
        const params = new URLSearchParams({ page: String(page), limit: String(limit) });
        if (filters?.targetType) params.set('targetType', String(filters.targetType));
        if (filters?.isApproved !== undefined) params.set('isApproved', String(filters.isApproved));
        if (filters?.isVisible !== undefined) params.set('isVisible', String(filters.isVisible));
        if (filters?.isReported !== undefined) params.set('isReported', String(filters.isReported));
        if (filters?.search) params.set('search', String(filters.search));
        return fetchWithAuth(`/admin/reviews?${params}`);
    },
    getAdminReviewStats: () => fetchWithAuth('/admin/reviews/stats'),
    updateAdminReviewVisibility: (id: string, isVisible: boolean) =>
        fetchWithAuth(`/admin/reviews/${id}/visibility`, {
            method: 'PATCH',
            body: JSON.stringify({ isVisible }),
        }),
    updateAdminReviewApproval: (id: string, isApproved: boolean) =>
        fetchWithAuth(`/admin/reviews/${id}/approval`, {
            method: 'PATCH',
            body: JSON.stringify({ isApproved }),
        }),
    deleteAdminReview: (id: string) =>
        fetchWithAuth(`/admin/reviews/${id}`, { method: 'DELETE' }),
};

export const feedbackApi = {
    submitFeedback: (data: {
        type: string;
        category: string;
        title: string;
        description: string;
        rating?: number;
        pageName?: string;
        route?: string;
        attachments?: string[];
    }) =>
        fetchWithAuth('/feedback', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
    getMyFeedback: () => fetchWithAuth('/feedback/my-feedback'),
};

export interface DiscoveredOrganization {
    id: string;
    name: string;
    type: 'hospital' | 'diagnostic_center' | 'pharmacy' | 'clinic';
    typeLabel: string;
    city: string;
    state?: string;
    address: string;
    phone?: string;
    email?: string;
    rating?: number;
    image_url?: string;
    is_verified: boolean;
    relationship_status: 'not_connected' | 'invitation_sent' | 'invitation_received' | 'connected' | 'former' | 'changes_requested';
    partnership_id?: string | null;
    can_request_partnership: boolean;
    can_reconnect: boolean;
    is_connected: boolean;
    is_pending: boolean;
}

export const discoveryApi = {
    discoverOrganizations: (params: { type?: string; query?: string; page?: number; limit?: number }) => {
        const queryParams = new URLSearchParams();
        if (params.type) queryParams.set('type', params.type);
        if (params.query !== undefined) queryParams.set('query', params.query);
        if (params.page) queryParams.set('page', String(params.page));
        if (params.limit) queryParams.set('limit', String(params.limit));
        return fetchWithAuth<DiscoveredOrganization[]>(`/discovery/organizations?${queryParams.toString()}`);
    },
    getOrganizationDetails: (orgType: string, orgId: string) =>
        fetchWithAuth<DiscoveredOrganization>(`/discovery/organizations/${orgType}/${orgId}`),
};

export const publicDiscoveryApi = {
    searchHospitals: (query: string = '') => fetchWithAuth(`/hospitals/search?q=${encodeURIComponent(query)}`),
    searchPharmacies: (query: string = '') => fetchWithAuth(`/pharmacy/search?search=${encodeURIComponent(query)}`),
    searchDiagnosticCenters: (query: string = '') => fetchWithAuth(`/diagnostic-centers/search?search=${encodeURIComponent(query)}`),
    searchClinics: (query: string = '') => fetchWithAuth(`/clinics/search?search=${encodeURIComponent(query)}`),
    ...discoveryApi
};

// ==================== Universal Referrals API ====================
// Single unified client — works identically across all sender portal contexts:
// Clinic, Hospital, Diagnostic Center, Pharmacy (and Doctor-via-Clinic/Hospital).

export const universalReferralsApi = {
    createReferral: (data: any) =>
        fetchWithAuth('/referrals', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    createDraft: (data: any) =>
        fetchWithAuth('/referrals/draft', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    submitReferral: (id: string) =>
        fetchWithAuth(`/referrals/${id}/send`, {
            method: 'PATCH',
        }),

    checkConsent: (patientId: string, params: Record<string, string>) => {
        const query = new URLSearchParams(params).toString();
        return fetchWithAuth(`/referrals/patients/${patientId}/consent/check?${query}`);
    },

    getReferralInbox: (params?: Record<string, string>) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return fetchWithAuth(`/referrals/inbox${query}`);
    },

    getSentReferrals: (params?: Record<string, string>) => {
        const query = params ? '?' + new URLSearchParams(params).toString() : '';
        return fetchWithAuth(`/referrals/sent${query}`);
    },

    getReferral: (id: string) => fetchWithAuth(`/referrals/${id}`),

    updateReferralStatus: (id: string, status: string) =>
        fetchWithAuth(`/referrals/${id}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),

    addReferralAttachment: (id: string, data: any) =>
        fetchWithAuth(`/referrals/${id}/attachments`, {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    /**
     * Fetch the patient's eligible reports & prescriptions for referral attachment selection.
     *
     * sender_type and sender_id are CONTEXT PARAMETERS only — the backend revalidates
     * that the authenticated user actually controls that sender_type/sender_id before
     * returning any document metadata. The frontend must treat results as selectable
     * candidates only. Backend is authoritative at submission time.
     */
    getPatientDocumentsForReferral: (patientId: string, senderType: string, senderId: string) => {
        const params = new URLSearchParams({ sender_type: senderType, sender_id: senderId });
        return fetchWithAuth(`/referrals/patients/${patientId}/documents?${params.toString()}`);
    },

    /**
     * P7.7 — Search patients the authenticated sender is authorized to refer.
     *
     * sender_type and sender_id are CONTEXT PARAMETERS only. The backend runs
     * validateProviderAccess(senderType, senderId, req.user) before returning any data.
     * A forged senderId will result in a 403 — never in data exposure.
     *
     * Returns: { success, data: [{ id, name, phone }], pagination: { page, limit, total, totalPages } }
     */
    searchPatients: (params: {
        senderType: string;
        senderId: string;
        q?: string;
        page?: number;
        limit?: number;
    }) => {
        const qs = new URLSearchParams({
            sender_type: params.senderType,
            sender_id: params.senderId,
            ...(params.q ? { q: params.q } : {}),
            ...(params.page !== undefined ? { page: String(params.page) } : {}),
            ...(params.limit !== undefined ? { limit: String(params.limit) } : {}),
        });
        return fetchWithAuth(`/referrals/patients/search?${qs.toString()}`);
    },
};

// ==================== Unified Export ====================

export const api = {
    auth: authApi,
    admin: adminApi,
    doctor: doctorApi,
    hospital: hospitalApi,
    pharmacy: pharmacyApi,
    clinic: clinicApi,
    diagnosticCenter: diagnosticCenterApi,
    appointments: appointmentsApi,
    consultations: consultationsApi,
    upload: uploadApi,
    notifications: notificationsApi,
    vitals: vitalsApi,
    featureToggles: featureTogglesApi,
    medicine: medicineApi,
    community: communityApi,
    wellness: wellnessApi,
    publicDiscovery: publicDiscoveryApi,
    reviews: reviewsApi,
    feedback: feedbackApi,
    universalReferrals: universalReferralsApi,
};

export default api;

