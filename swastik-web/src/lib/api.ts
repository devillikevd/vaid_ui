/**
 * Swastik Healthcare Platform - Centralized API Client
 * All web portal API communication goes through this module.
 * Every store MUST use these functions instead of raw fetch().
 */

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// ==================== Types ====================

export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
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

export const setTokens = (access: string, refresh: string) => {
    accessToken = access;
    refreshToken = refresh;
    if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', access);
        localStorage.setItem('refreshToken', refresh);
    }
};

export const getTokens = () => {
    if (typeof window !== 'undefined') {
        accessToken = accessToken || localStorage.getItem('accessToken');
        refreshToken = refreshToken || localStorage.getItem('refreshToken');
    }
    return { accessToken, refreshToken };
};

export const clearTokens = () => {
    accessToken = null;
    refreshToken = null;
    if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        document.cookie = 'swastik-role=; path=/; max-age=0';
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

        // Unwrap: backend returns { success, data: { ... } }.
        // Return the inner `data` payload so stores don't double-nest.
        const payload = data?.data !== undefined ? data.data : data;
        return { success: true, data: payload };
    } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') {
            console.error('API Timeout:', endpoint);
            return { success: false, error: 'Request timed out. Please try again.' };
        }
        console.error('API Error:', error);
        return { success: false, error: 'Network error. Please check your connection.' };
    }
}

async function refreshAccessToken(): Promise<boolean> {
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
    }
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
        if (response.ok && token) {
            setTokens(token, rToken);
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
};

// ==================== ADMIN API ====================
// Backend: routes/admin.js

export const adminApi = {
    getDashboard: () => fetchWithAuth('/admin/dashboard'),

    getPendingApprovals: (type: string = 'all', page: number = 1) =>
        fetchWithAuth(`/admin/approvals/pending?type=${type}&page=${page}`),

    getProviderDetails: (type: string, id: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}`),

    approveProvider: (type: string, id: string, notes?: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}/approve`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        }),

    rejectProvider: (type: string, id: string, reason: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}/reject`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        }),

    suspendProvider: (type: string, id: string, reason: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}/suspend`, {
            method: 'POST',
            body: JSON.stringify({ reason }),
        }),

    reactivateProvider: (type: string, id: string, notes?: string) =>
        fetchWithAuth(`/admin/providers/${type}/${id}/reactivate`, {
            method: 'POST',
            body: JSON.stringify({ notes }),
        }),

    getUsers: (filters?: Record<string, unknown>, page: number = 1) => {
        const params = new URLSearchParams({ page: page.toString() });
        if (filters?.role) params.set('role', String(filters.role));
        if (filters?.status) params.set('status', String(filters.status));
        return fetchWithAuth(`/admin/users?${params}`);
    },

    updateUserStatus: (userId: string, isActive: boolean, reason?: string) =>
        fetchWithAuth(`/admin/users/${userId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ isActive, reason }),
        }),

    getAnalytics: (period: string = '30d') =>
        fetchWithAuth(`/admin/analytics?period=${period}`),

    getAuditLogs: (page: number = 1) =>
        fetchWithAuth(`/admin/audit-logs?page=${page}`),

    getSystemHealth: () => fetchWithAuth('/admin/system/health'),

    getEmergencies: () => fetchWithAuth('/admin/emergencies'),

    getComplianceDocuments: (days: number = 30) =>
        fetchWithAuth(`/admin/compliance/expiring-documents?days=${days}`),
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

    getPatients: (page: number = 1) =>
        fetchWithAuth(`/doctors/me/patients?page=${page}`),

    getPatientHistory: (patientId: string) =>
        fetchWithAuth(`/doctors/me/patients/${patientId}`),

    getPrescriptions: (page: number = 1) =>
        fetchWithAuth(`/doctors/me/prescriptions?page=${page}`),

    updateAvailability: (isAvailable: boolean) =>
        fetchWithAuth('/doctors/me/availability', {
            method: 'PUT',
            body: JSON.stringify({ isAvailable }),
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

    updateNotificationSettings: (settings: Record<string, boolean>) =>
        fetchWithAuth('/doctors/me/notification-settings', {
            method: 'PUT',
            body: JSON.stringify(settings),
        }),
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

    getDoctors: (page: number = 1) =>
        fetchWithAuth(`/hospital-manager/doctors?page=${page}`),

    inviteDoctor: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/doctors/invite', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    removeDoctor: (doctorId: string) =>
        fetchWithAuth(`/hospital-manager/doctors/${doctorId}`, { method: 'DELETE' }),

    getAppointments: () => fetchWithAuth('/hospital-manager/appointments'),

    getAnalytics: () => fetchWithAuth('/hospital-manager/analytics'),

    getManagers: () => fetchWithAuth('/hospital-manager/managers'),

    addManager: (data: Record<string, unknown>) =>
        fetchWithAuth('/hospital-manager/managers', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    getEmergencies: () => fetchWithAuth('/hospital-manager/emergencies'),

    getConsultations: (page: number = 1, status?: string) => {
        const params = new URLSearchParams({ page: page.toString() });
        if (status) params.set('status', status);
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

    getInventory: (page: number = 1, search?: string) => {
        const params = new URLSearchParams({ page: page.toString() });
        if (search) params.set('search', search);
        return fetchWithAuth(`/pharmacy/inventory?${params}`);
    },

    addInventoryItem: (data: Record<string, unknown>) =>
        fetchWithAuth('/pharmacy/inventory', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    updateInventoryItem: (id: string, data: Record<string, unknown>) =>
        fetchWithAuth(`/pharmacy/inventory/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),

    deleteInventoryItem: (id: string) =>
        fetchWithAuth(`/pharmacy/inventory/${id}`, { method: 'DELETE' }),

    getOrders: (status?: string, page: number = 1) => {
        const params = new URLSearchParams({ page: page.toString() });
        if (status) params.set('status', status);
        return fetchWithAuth(`/pharmacy/orders?${params}`);
    },

    updateOrderStatus: (orderId: string, status: string) =>
        fetchWithAuth(`/pharmacy/orders/${orderId}/status`, {
            method: 'PATCH',
            body: JSON.stringify({ status }),
        }),

    getAnalytics: () => fetchWithAuth('/pharmacy/analytics'),

    getPrescriptions: (status?: string) => {
        const params = new URLSearchParams();
        if (status) params.set('status', status);
        return fetchWithAuth(`/pharmacy/prescriptions?${params}`);
    },

    dispensePrescription: (prescriptionId: string) =>
        fetchWithAuth(`/pharmacy/prescriptions/${prescriptionId}/dispense`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'dispensed' }),
        }),
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

    getDoctors: () => fetchWithAuth('/clinics/owner/doctors'),

    addDoctor: (data: Record<string, unknown>) =>
        fetchWithAuth('/clinics/owner/doctors', {
            method: 'POST',
            body: JSON.stringify(data),
        }),

    removeDoctor: (doctorId: string) =>
        fetchWithAuth(`/clinics/owner/doctors/${doctorId}`, { method: 'DELETE' }),

    getAppointments: (date?: string) => {
        const params = date ? `?date=${date}` : '';
        return fetchWithAuth(`/clinics/owner/appointments${params}`);
    },

    getConsultations: (page: number = 1, status?: string) => {
        const params = new URLSearchParams({ page: page.toString() });
        if (status) params.set('status', status);
        return fetchWithAuth(`/clinics/owner/consultations?${params}`);
    },

    getSchedule: () => fetchWithAuth('/clinics/owner/schedule'),

    updateSchedule: (schedule: Record<string, unknown>) =>
        fetchWithAuth('/clinics/owner/schedule', {
            method: 'PUT',
            body: JSON.stringify(schedule),
        }),
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

    getTests: (page: number = 1, category?: string) => {
        const params = new URLSearchParams({ page: page.toString() });
        if (category) params.set('category', category);
        return fetchWithAuth(`/diagnostic-centers/owner/tests?${params}`);
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

    getBookings: (status?: string, page: number = 1) => {
        const params = new URLSearchParams({ page: page.toString() });
        if (status) params.set('status', status);
        return fetchWithAuth(`/diagnostic-centers/owner/bookings?${params}`);
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

    // M8: Results use the same bookings endpoint but filter by result_status.
    // The backend distinguishes via the 'resultStatus' query parameter.
    getResults: (resultStatus?: string, page: number = 1) => {
        const params = new URLSearchParams({ page: page.toString() });
        // Default to only bookings that have results (non-pending)
        params.set('resultStatus', resultStatus || 'all');
        return fetchWithAuth(`/diagnostic-centers/owner/bookings?${params}`);
    },
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
        type: 'video' | 'clinic';
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

export const uploadApi = {
    uploadFile: async (file: File, type: string = 'document') => {
        const formData = new FormData();
        formData.append('file', file);

        return fetchWithAuth(`/uploads/${type}`, {
            method: 'POST',
            body: formData,
        });
    },

    uploadMultiple: async (files: File[], folder?: string) => {
        const formData = new FormData();
        files.forEach((file) => formData.append('files', file));
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

// ==================== CHATBOT API ====================
// Backend: routes/chatbot/index.js

export const chatbotApi = {
    startSession: () =>
        fetchWithAuth('/chatbot/session/start', { method: 'POST' }),

    sendMessage: (sessionId: string, message: string, generateAudio: boolean = false) =>
        fetchWithAuth('/chatbot/message', {
            method: 'POST',
            body: JSON.stringify({ sessionId, message, generateAudio }),
        }),

    getHistory: (sessionId: string) =>
        fetchWithAuth(`/chatbot/session/${sessionId}`),

    getSessions: () => fetchWithAuth('/chatbot/sessions'),

    endSession: (sessionId: string) =>
        fetchWithAuth(`/chatbot/session/${sessionId}/end`, { method: 'POST' }),

    analyzeSymptoms: (symptoms: string) =>
        fetchWithAuth('/chatbot/analyze-symptoms', {
            method: 'POST',
            body: JSON.stringify({ symptoms }),
        }),
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

// ==================== Unified Export ====================

export const api = {
    auth: authApi,
    admin: adminApi,
    doctor: doctorApi,
    hospital: hospitalApi,
    pharmacy: pharmacyApi,
    clinic: clinicApi,
    appointments: appointmentsApi,
    consultations: consultationsApi,
    upload: uploadApi,
    notifications: notificationsApi,
    chatbot: chatbotApi,
    medicine: medicineApi,
};

export default api;
