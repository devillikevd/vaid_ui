import { PUBLIC_API_URL } from './env';

/**
 * VAIDIDEA Healthcare Platform - Centralized API Client
 * All web portal API communication goes through this module.
 * Every store MUST use these functions instead of raw fetch().
 */

export const API_BASE_URL = PUBLIC_API_URL;

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

const DEFAULT_AUTH_COOKIE_MAX_AGE = 60 * 60 * 24;

function normalizeStoredToken(token: string | null | undefined): string | null {
    if (!token || token === 'undefined' || token === 'null') {
        return null;
    }

    return token;
}

function syncCookie(name: 'swastik-role' | 'swastik-token', value: string | null, maxAge: number = DEFAULT_AUTH_COOKIE_MAX_AGE) {
    if (typeof document === 'undefined') {
        return;
    }

    if (!value) {
        document.cookie = `${name}=; path=/; max-age=0`;
        return;
    }

    document.cookie = `${name}=${value}; path=/; max-age=${maxAge}; SameSite=Strict`;
}

export const setTokens = (
    access: string | null | undefined,
    refresh: string | null | undefined,
    options: { cookieMaxAge?: number; role?: string | null } = {}
) => {
    accessToken = normalizeStoredToken(access);
    refreshToken = normalizeStoredToken(refresh);

    if (typeof window !== 'undefined') {
        if (accessToken) localStorage.setItem('accessToken', accessToken);
        else localStorage.removeItem('accessToken');

        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        else localStorage.removeItem('refreshToken');

        syncCookie('swastik-token', accessToken, options.cookieMaxAge);
        if (options.role) {
            syncCookie('swastik-role', options.role, options.cookieMaxAge);
        }
    }
};

export const getTokens = () => {
    if (typeof window !== 'undefined') {
        accessToken = normalizeStoredToken(accessToken) || normalizeStoredToken(localStorage.getItem('accessToken'));
        refreshToken = normalizeStoredToken(refreshToken) || normalizeStoredToken(localStorage.getItem('refreshToken'));
    }
    return { accessToken, refreshToken };
};

export const clearTokens = () => {
    accessToken = null;
    refreshToken = null;
    if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        syncCookie('swastik-role', null);
        syncCookie('swastik-token', null);
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

export async function fetchWithAuth<T>(
    endpoint: string,
    options: RequestInit = {},
    _isRetry: boolean = false
): Promise<ApiResponse<T>> {
    const { accessToken: token } = getTokens();

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
    };

    // Only set Content-Type for non-FormData bodies (FormData needs browser to set boundary)
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        // Add timeout to prevent hanging requests (30s default)
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
            ...options,
            headers,
            signal: controller.signal,
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
            if (response.status === 401 && getTokens().refreshToken && !_isRetry) {
                const refreshed = await refreshAccessToken();
                if (refreshed) {
                    return fetchWithAuth(endpoint, options, true);
                }
                clearTokens();
            }
            // Return server message if present, otherwise a human-readable fallback
            const serverMsg = data?.message || data?.error;
            const friendlyError = serverMsg || getHttpErrorMessage(response.status);
            return { success: false, error: friendlyError };
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
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}

// BUG-C3 Fix: Mutex prevents parallel refresh calls from concurrent 401 responses
let _refreshPromise: Promise<boolean> | null = null;

async function refreshAccessToken(): Promise<boolean> {
    // If a refresh is already in-flight, reuse it (same pattern as authStore.ts)
    if (_refreshPromise) return _refreshPromise;

    _refreshPromise = (async () => {
        try {
            // Always read refreshToken from localStorage to avoid stale module-scoped variable
            const { refreshToken: currentRefreshToken } = getTokens();
            if (!currentRefreshToken) return false;

            const response = await fetch(`${API_BASE_URL}/auth/refresh-token`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refreshToken: currentRefreshToken }),
            });

            if (response.ok) {
                const data = await response.json();
                const newAccess = data.data?.accessToken || data.accessToken;
                const newRefresh = data.data?.refreshToken || data.refreshToken || refreshToken;
                if (newAccess) {
                    setTokens(newAccess, newRefresh!);
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
        const token = data.data?.accessToken || data.accessToken;
        const rToken = data.data?.refreshToken || data.refreshToken;
        const userRole = data.data?.user?.role || data.user?.role || role || null;
        if (response.ok && token) {
            setTokens(token, rToken, { role: userRole });
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

    forgotPassword: async (email: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
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

    resetPasswordWithOtp: async (email: string, otp: string, password: string) => {
        const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp, password }),
        });
        return response.json();
    },
};

// ==================== ADMIN API ====================
// Backend: routes/admin.js

export const adminApi = {
    getDashboard: () => fetchWithAuth('/admin/dashboard'),

    getPendingApprovals: (type: string = 'all', page: number = 1) =>
        fetchWithAuth(`/admin/approvals/pending?type=${type}&page=${page}`),

    getProviders: (filters?: Record<string, unknown>, page: number = 1, limit: number = 20) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (filters?.type) params.set('type', String(filters.type));
        if (filters?.status) params.set('status', String(filters.status));
        if (filters?.search) params.set('search', String(filters.search));
        return fetchWithAuth(`/admin/providers?${params}`);
    },

    getProviderDetails: (type: string, id: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}`),

    approveProvider: (type: 'doctor' | 'hospital' | 'pharmacy' | 'diagnostic_center' | 'clinic', id: string, notes?: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        }),

    rejectProvider: (type: 'doctor' | 'hospital' | 'pharmacy' | 'diagnostic_center' | 'clinic', id: string, reason: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        }),

    suspendProvider: (type: 'doctor' | 'hospital' | 'pharmacy' | 'diagnostic_center' | 'clinic', id: string, reason: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}/suspend`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        }),

    reactivateProvider: (type: 'doctor' | 'hospital' | 'pharmacy' | 'diagnostic_center' | 'clinic', id: string, notes?: string) =>
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

    getAuditLogs: (filters?: Record<string, unknown>, page: number = 1, limit: number = 50) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (filters?.search) params.set('search', String(filters.search));
        if (filters?.action) params.set('action', String(filters.action));
        if (filters?.resourceType) params.set('resourceType', String(filters.resourceType));
        if (filters?.userId) params.set('userId', String(filters.userId));
        if (filters?.fromDate) params.set('fromDate', String(filters.fromDate));
        if (filters?.toDate) params.set('toDate', String(filters.toDate));
        return fetchWithAuth(`/admin/audit-logs?${params}`);
    },

    getSystemHealth: () => fetchWithAuth('/admin/system/health'),

    addBulkMedicines: (medicines: any[]) =>
        fetchWithAuth('/admin/medicines/bulk', {
            method: 'POST',
            body: JSON.stringify({ medicines }),
        }),

    getEmergencies: (page: number = 1, limit: number = 20, status: string = 'active') =>
        fetchWithAuth(`/admin/emergencies?page=${page}&limit=${limit}&status=${encodeURIComponent(status)}`),

    updateEmergencyStatus: (emergencyId: string, status: string) =>
        fetchWithAuth(`/admin/emergencies/${emergencyId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),

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
};

// ==================== DOCTOR API ====================
// Backend: routes/doctor/index.js

export const doctorApi = {
    getDashboard: () => fetchWithAuth('/doctors/me/dashboard'),

    getProfile: () => fetchWithAuth('/doctors/me/profile'),

    updateProfile: (data: Record<string, unknown>) =>
        fetchWithAuth('/doctors/me/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    getSchedule: () => fetchWithAuth('/doctors/me/slots'),

    updateSchedule: (slots: Record<string, unknown>[]) =>
        fetchWithAuth('/doctors/me/slots', {
            method: 'PUT',
            body: JSON.stringify({ slots }),
        }),

    getAppointments: (status?: string, date?: string, page: number = 1) => {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        if (date) params.set('date', date);
        params.set('page', String(page));
        return fetchWithAuth(`/appointments?${params}`);
    },

    getPatients: (page: number = 1, search: string = '', limit: number = 20) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (search.trim()) params.set('search', search.trim());
        return fetchWithAuth(`/doctors/me/patients?${params}`);
    },

    getPatientHistory: (patientId: string) =>
        fetchWithAuth(`/doctors/me/patients/${patientId}`),

    getPrescriptions: (page: number = 1) =>
        fetchWithAuth(`/doctors/me/prescriptions?page=${page}`),

    updateAvailability: (isAvailable: boolean) =>
        fetchWithAuth('/doctors/me/availability', {
            method: 'PUT',
            body: JSON.stringify({ isAvailable }),
        }),

    getHospitalInvites: () => fetchWithAuth('/doctors/me/hospital-invites'),

    respondHospitalInvite: (inviteId: string, decision: 'accept' | 'reject') =>
        fetchWithAuth(`/doctors/me/hospital-invites/${inviteId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ decision }),
        }),

    getClinicInvites: () => fetchWithAuth('/doctors/me/clinic-invites'),

    respondClinicInvite: (inviteId: string, decision: 'accept' | 'reject') =>
        fetchWithAuth(`/doctors/me/clinic-invites/${inviteId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ decision }),
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

    // ── Outbreak Alerts (read-only) ──
    getOutbreakAlerts: (city?: string) => {
        const params = new URLSearchParams();
        if (city) params.set('city', city);
        return fetchWithAuth(`/admin/outbreaks/public/alerts?${params}`);
    },
    getOutbreakHeatmap: () => fetchWithAuth('/admin/outbreaks/public/heatmap'),
    getOutbreakStats: (days: number = 30) => fetchWithAuth(`/admin/outbreaks/public/stats?days=${days}`),
};

// ==================== HOSPITAL API ====================
// Backend: routes/hospitalManager.js

export const hospitalApi = {
    getDashboard: () => fetchWithAuth('/hospital-manager/dashboard'),

    getProfile: () => fetchWithAuth('/hospital-manager/profile'),

    updateProfile: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    getDoctors: (page: number = 1, search: string = '', limit: number = 20) => {
        const params = new URLSearchParams({
            page: page.toString(),
            limit: limit.toString(),
        });
        if (search.trim()) params.set('search', search.trim());
        return fetchWithAuth(`/hospital-manager/doctors?${params}`);
    },

    inviteDoctor: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/doctors/invite', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    removeDoctor: (doctorId: string) =>
        fetchWithAuth(`/hospital-manager/doctors/${doctorId}`, { method: 'DELETE' }),

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
};

// ==================== PHARMACY API ====================
// Backend: routes/pharmacy.js

export const pharmacyApi = {
    getDashboard: () => fetchWithAuth('/pharmacy/dashboard'),

    getProfile: () => fetchWithAuth('/pharmacy/profile'),

    updateProfile: (data: Record<string, unknown>) =>
        fetchWithAuth('/pharmacy/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    getInventory: (params: { page?: number; limit?: number; search?: string; lowStock?: boolean; category?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 10),
        });
        if (params.search) query.set('search', params.search);
        if (params.lowStock) query.set('lowStock', 'true');
        if (params.category) query.set('category', params.category);
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

    getAssociationInvites: () => fetchWithAuth('/pharmacy/associations/invites'),

    respondToAssociationInvite: (inviteId: string, decision: 'accept' | 'reject') =>
        fetchWithAuth(`/pharmacy/associations/invites/${inviteId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ decision }),
        }),

    getAssociations: () => fetchWithAuth('/pharmacy/associations'),
};

// ==================== CLINIC API ====================
// Backend: routes/clinic.js

export const clinicApi = {
    getDashboard: () => fetchWithAuth('/clinics/owner/dashboard'),

    getProfile: () => fetchWithAuth('/clinics/owner/profile'),

    updateProfile: (data: Record<string, unknown>) =>
        fetchWithAuth('/clinics/owner/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    getDoctors: (params: { page?: number; limit?: number; search?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.search) query.set('search', params.search);
        return fetchWithAuth(`/clinics/owner/doctors?${query}`);
    },

    addDoctor: (data: Record<string, unknown>) =>
        fetchWithAuth('/clinics/owner/doctors', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    removeDoctor: (doctorId: string) =>
        fetchWithAuth(`/clinics/owner/doctors/${doctorId}`, { method: 'DELETE' }),

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

    getAppointments: (params: { page?: number; limit?: number; search?: string; status?: string; date?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.search) query.set('search', params.search);
        if (params.status) query.set('status', params.status);
        if (params.date) query.set('date', params.date);
        return fetchWithAuth(`/clinics/owner/appointments?${query}`);
    },

    getConsultations: (params: { page?: number; limit?: number; search?: string; status?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.status) query.set('status', params.status);
        if (params.search) query.set('search', params.search);
        return fetchWithAuth(`/clinics/owner/consultations?${query}`);
    },

    getSchedule: () => fetchWithAuth('/clinics/owner/schedule'),

    updateSchedule: (schedule: Record<string, unknown>) =>
        fetchWithAuth('/clinics/owner/schedule', {
            method: 'PUT',
            body: JSON.stringify(schedule),
        }),

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

    getProfile: () => fetchWithAuth('/diagnostic-centers/owner/profile'),

    updateProfile: (data: Record<string, unknown>) =>
        fetchWithAuth('/diagnostic-centers/owner/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    getTests: (params: { page?: number; limit?: number; search?: string; category?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.search) query.set('search', params.search);
        if (params.category) query.set('category', params.category);
        return fetchWithAuth(`/diagnostic-centers/owner/tests?${query}`);
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

    getBookings: (params: { page?: number; limit?: number; status?: string; resultStatus?: string; date?: string; search?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.status) query.set('status', params.status);
        if (params.resultStatus) query.set('resultStatus', params.resultStatus);
        if (params.date) query.set('date', params.date);
        if (params.search) query.set('search', params.search);
        return fetchWithAuth(`/diagnostic-centers/owner/bookings?${query}`);
    },

    getBookingById: (bookingId: string) =>
        fetchWithAuth(`/diagnostic-centers/owner/bookings/${bookingId}`),

    updateBookingStatus: (bookingId: string, status: string) =>
        fetchWithAuth(`/diagnostic-centers/owner/bookings/${bookingId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),

    uploadResult: (bookingId: string, data: { result_url: string; result_notes?: string }) =>
        fetchWithAuth(`/diagnostic-centers/owner/bookings/${bookingId}/result`, {
            method: 'PATCH',
            body: JSON.stringify(data),
        }),

    getAnalytics: () => fetchWithAuth('/diagnostic-centers/owner/analytics'),

    getResults: (params: { page?: number; limit?: number; resultStatus?: string; search?: string } = {}) => {
        const query = new URLSearchParams({
            page: String(params.page ?? 1),
            limit: String(params.limit ?? 20),
        });
        if (params.resultStatus) query.set('resultStatus', params.resultStatus);
        if (params.search) query.set('search', params.search);
        return fetchWithAuth(`/diagnostic-centers/owner/bookings?${query}`);
    },

    getAssociationInvites: () => fetchWithAuth('/diagnostic-centers/owner/associations/invites'),

    respondToAssociationInvite: (inviteId: string, decision: 'accept' | 'reject') =>
        fetchWithAuth(`/diagnostic-centers/owner/associations/invites/${inviteId}/respond`, {
            method: 'POST',
            body: JSON.stringify({ decision }),
        }),

    getAssociations: () => fetchWithAuth('/diagnostic-centers/owner/associations'),
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
    updateStatus: (id: string, status: string, notes?: string) =>
        fetchWithAuth(`/appointments/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, notes }),
        }),

    cancel: (id: string, reason?: string) =>
        fetchWithAuth(`/appointments/${id}/cancel`, {
            method: 'PUT',
            body: JSON.stringify({ reason }),
        }),

    reschedule: (id: string, date: string, timeSlot: string) =>
        fetchWithAuth(`/appointments/${id}/reschedule`, {
            method: 'POST',
            body: JSON.stringify({ date, timeSlot }),
        }),
};

// ==================== CONSULTATIONS API ====================
// Backend: routes/consultation/index.js

export const consultationsApi = {
    getAll: () => fetchWithAuth('/consultations'),

    start: (appointmentId: string) =>
        fetchWithAuth(`/consultations/${appointmentId}/start`, { method: 'POST' }),

    join: (consultationId: string) =>
        fetchWithAuth(`/consultations/${consultationId}/join`, { method: 'POST' }),

    end: (consultationId: string, data?: { notes?: string; diagnosis?: string; followUpDate?: string; duration?: number }) =>
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

    aiAssist: (consultationId: string, query: string, symptoms?: string) =>
        fetchWithAuth(`/consultations/${consultationId}/ai-assist`, {
            method: 'POST',
            body: JSON.stringify({ query, symptoms }),
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
    getAll: (page: number = 1) => fetchWithAuth(`/notifications?page=${page}`),

    getUnreadCount: () => fetchWithAuth('/notifications/unread-count'),

    markAsRead: (id: string) =>
        fetchWithAuth(`/notifications/${id}/read`, { method: 'PUT' }),

    markAllAsRead: () =>
        fetchWithAuth('/notifications/read-all', { method: 'PUT' }),
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
    getQuestions: (page: number = 1, limit: number = 20) => fetchWithAuth(`/community/questions?page=${page}&limit=${limit}`),
    addAnswer: (questionId: string, content: string) => fetchWithAuth(`/community/questions/${questionId}/answers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content })
    })
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
};

export default api;
