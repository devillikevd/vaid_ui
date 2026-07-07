import { create } from 'zustand';
import { diagnosticCenterApi } from '../lib/api';

// ==================== Types ====================

export interface DiagnosticDashboardStats {
    totalTests: number;
    todaysBookings: number;
    pendingResults: number;
    totalPatients: number;
}

export interface DiagnosticTest {
    id: string;
    name: string;
    category: string;
    description?: string;
    price: number;
    discounted_price?: number;
    turnaround_hours: number;
    sample_type?: string;
    preparation_instructions?: string;
    is_active: boolean;
    created_at: string;
}

export interface DiagnosticBooking {
    id: string;
    patient_id: string;
    patient_name?: string;
    patient_email?: string;
    patient?: {
        name?: string;
        user?: { phone?: string; };
    };
    center_id?: string;
    test_id: string;
    test_name?: string;
    booking_date: string;
    booking_time?: string;
    collection_type: 'walk_in' | 'home_collection';
    collection_address?: string;
    notes?: string;
    prescription?: { file_url: string; };
    tracking_token?: string;
    agent_id?: string;
    status: 'pending' | 'confirmed' | 'dispatched' | 'out_for_delivery' | 'arrived' | 'sample_collected' | 'processing' | 'completed' | 'cancelled';
    result_status: 'pending' | 'processing' | 'completed' | 'delivered';
    result_url?: string;
    result_notes?: string;
    amount?: number;
    created_at: string;
    facility?: {
        id?: string;
        latitude?: number;
        longitude?: number;
        name?: string;
    };
}

export interface DiagnosticPagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

export interface DiagnosticBookingSummary {
    total: number;
    status: Record<string, number>;
    resultStatus: Record<string, number>;
}

export interface Review {
    id: string;
    rating: number;
    title?: string;
    comment?: string;
    is_anonymous: boolean;
    created_at: string;
    patient?: {
        name: string;
    };
}

function normalizeDiagnosticBooking(raw: Record<string, any>): DiagnosticBooking {
    return {
        ...raw,
        status: raw.status === 'booked' ? 'pending' : raw.status,
        patient_name: raw.patient_name || raw.patient?.name,
        patient_email: raw.patient_email || raw.patient?.email,
        test_name: raw.test_name || raw.test?.name,
        amount: raw.amount ?? raw.test?.price ?? null,
    } as DiagnosticBooking;
}

function normalizePagination(
    pagination: Record<string, any> | undefined,
    fallbackPage: number,
    fallbackLimit: number
): DiagnosticPagination {
    return {
        page: Number(pagination?.page || fallbackPage),
        limit: Number(pagination?.limit || fallbackLimit),
        total: Number(pagination?.total || 0),
        totalPages: Math.max(1, Number(pagination?.totalPages || 1)),
    };
}

interface DiagnosticCenterState {
    stats: DiagnosticDashboardStats | null;
    tests: DiagnosticTest[];
    bookings: DiagnosticBooking[];
    results: DiagnosticBooking[];
    testsPagination: DiagnosticPagination;
    bookingsPagination: DiagnosticPagination;
    resultsPagination: DiagnosticPagination;
    bookingsSummary: DiagnosticBookingSummary;
    resultsSummary: DiagnosticBookingSummary;
    todaysBookings: DiagnosticBooking[];
    selectedBooking: DiagnosticBooking | null;
    isLoading: boolean;
    loadingDashboard: boolean;
    loadingTests: boolean;
    loadingBookings: boolean;
    loadingResults: boolean;
    loadingSelectedBooking: boolean;
    loadingReviews: boolean;
    error: string | null;
    reviews: Review[];

    fetchDashboardData: () => Promise<void>;
    fetchTests: (params?: { page?: number; limit?: number; search?: string; category?: string }) => Promise<void>;
    addTest: (data: Record<string, unknown>) => Promise<boolean>;
    updateTest: (testId: string, data: Record<string, unknown>) => Promise<boolean>;
    deleteTest: (testId: string) => Promise<boolean>;
    fetchBookings: (params?: { page?: number; limit?: number; status?: string; date?: string; search?: string }) => Promise<void>;
    fetchResults: (params?: { page?: number; limit?: number; resultStatus?: string; search?: string }) => Promise<void>;
    fetchBookingById: (bookingId: string) => Promise<void>;
    updateBookingStatus: (bookingId: string, status: string) => Promise<boolean>;
    uploadResult: (bookingId: string, data: FormData) => Promise<boolean>;
    fetchReviews: (page?: number) => Promise<void>;
    clearError: () => void;
    reset: () => void;
}

// ==================== Store ====================

const diagnosticInitialState = {
    stats: null as DiagnosticDashboardStats | null,
    tests: [] as DiagnosticTest[],
    bookings: [] as DiagnosticBooking[],
    results: [] as DiagnosticBooking[],
    testsPagination: { page: 1, limit: 20, total: 0, totalPages: 1 } as DiagnosticPagination,
    bookingsPagination: { page: 1, limit: 20, total: 0, totalPages: 1 } as DiagnosticPagination,
    resultsPagination: { page: 1, limit: 20, total: 0, totalPages: 1 } as DiagnosticPagination,
    bookingsSummary: { total: 0, status: {}, resultStatus: {} } as DiagnosticBookingSummary,
    resultsSummary: { total: 0, status: {}, resultStatus: {} } as DiagnosticBookingSummary,
    todaysBookings: [] as DiagnosticBooking[],
    selectedBooking: null as DiagnosticBooking | null,
    isLoading: false,
    loadingDashboard: false,
    loadingTests: false,
    loadingBookings: false,
    loadingResults: false,
    loadingSelectedBooking: false,
    loadingReviews: false,
    error: null as string | null,
    reviews: [] as Review[],
};

export const useDiagnosticCenterStore = create<DiagnosticCenterState>((set, get) => ({
    ...diagnosticInitialState,

    clearError: () => set({ error: null }),
    reset: () => set({ ...diagnosticInitialState }),

    fetchDashboardData: async () => {
        set({ loadingDashboard: true, isLoading: true, error: null });
        try {
            const response = await diagnosticCenterApi.getDashboard();
            if (!response.success) {
                set({ error: response.error || 'Failed to load dashboard', loadingDashboard: false, isLoading: false });
                return;
            }
            const data = response.data as Record<string, unknown>;
            const rawStats = (data.stats || {}) as Record<string, unknown>;
            const todaysRaw = ((data.todaysBookings || data.todayBookings || []) as Record<string, any>[]);
            const recentBookings = ((data.recentBookings || data.bookings || []) as Record<string, any>[]).map(normalizeDiagnosticBooking);
            // Fallback: if backend doesn't provide explicit today's rows, derive from recent list by date
            const derivedToday = recentBookings.filter((b) => {
                if (!b.booking_date) return false;
                return new Date(b.booking_date).toDateString() === new Date().toDateString();
            });
            const todaysBookings = (todaysRaw.length > 0 ? todaysRaw.map(normalizeDiagnosticBooking) : derivedToday);

            const normalizedStats: DiagnosticDashboardStats = {
                totalTests: Number(rawStats.totalTests || 0),
                todaysBookings: Number(rawStats.todaysBookings || rawStats.todayBookings || todaysBookings.length || 0),
                pendingResults: Number(rawStats.pendingResults || 0),
                totalPatients: Number(rawStats.totalPatients || 0),
            };
            set({
                stats: normalizedStats,
                todaysBookings,
                loadingDashboard: false,
                isLoading: false,
            });
        } catch (error) {
            console.error('Error fetching diagnostic center dashboard:', error);
            set({ error: 'Failed to connect to server.', loadingDashboard: false, isLoading: false });
        }
    },

    fetchTests: async (params = {}) => {
        set({ loadingTests: true, error: null });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await diagnosticCenterApi.getTests({
                page,
                limit,
                search: params.search,
                category: params.category,
            });
            if (!response.success) {
                set({ error: response.error || 'Failed to load tests', loadingTests: false });
                return;
            }
            const rawData = response.data;
            set({
                tests: (Array.isArray(rawData) ? rawData : (rawData as any)?.tests || (rawData as any)?.data || []) as DiagnosticTest[],
                testsPagination: normalizePagination(response.pagination as Record<string, any> | undefined, page, limit),
                loadingTests: false,
            });
        } catch (error) {
            console.error('Error fetching tests:', error);
            set({ error: 'Failed to load tests.', loadingTests: false });
        }
    },

    addTest: async (data) => {
        try {
            const response = await diagnosticCenterApi.addTest(data);
            if (response.success) {
                get().fetchTests({ page: 1 });
                return true;
            }
            set({ error: response.error || 'Failed to add test' });
            return false;
        } catch (error) {
            console.error('Error adding test:', error);
            set({ error: 'Failed to add test.' });
            return false;
        }
    },

    updateTest: async (testId, data) => {
        try {
            const response = await diagnosticCenterApi.updateTest(testId, data);
            if (response.success) {
                get().fetchTests({ page: get().testsPagination.page });
                return true;
            }
            set({ error: response.error || 'Failed to update test' });
            return false;
        } catch (error) {
            console.error('Error updating test:', error);
            set({ error: 'Failed to update test.' });
            return false;
        }
    },

    deleteTest: async (testId) => {
        try {
            const response = await diagnosticCenterApi.deleteTest(testId);
            if (response.success) {
                const nextPage = Math.max(1, get().testsPagination.page);
                get().fetchTests({ page: nextPage });
                return true;
            }
            set({ error: response.error || 'Failed to delete test' });
            return false;
        } catch (error) {
            console.error('Error deleting test:', error);
            set({ error: 'Failed to delete test.' });
            return false;
        }
    },

    fetchBookings: async (params = {}) => {
        set({ loadingBookings: true, isLoading: true, error: null });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await diagnosticCenterApi.getBookings({
                page,
                limit,
                status: params.status,
                date: params.date,
                search: params.search,
            });
            if (!response.success) {
                set({ error: response.error || 'Failed to load bookings', loadingBookings: false, isLoading: false });
                return;
            }
            const rawData = response.data;
            const raw = (Array.isArray(rawData) ? rawData : (rawData as any)?.bookings || (rawData as any)?.data || []) as DiagnosticBooking[];
            const seen = new Set<string>();
            const deduped = raw
                .map(booking => normalizeDiagnosticBooking(booking as Record<string, any>))
                .filter(b => {
                if (seen.has(b.id)) return false;
                seen.add(b.id);
                return true;
                });
            set({
                bookings: deduped,
                bookingsPagination: normalizePagination(response.pagination as Record<string, any> | undefined, page, limit),
                bookingsSummary: (response.summary as DiagnosticBookingSummary | undefined) || { total: deduped.length, status: {}, resultStatus: {} },
                loadingBookings: false,
                isLoading: false,
            });
        } catch (error) {
            console.error('Error fetching bookings:', error);
            set({ error: 'Failed to load bookings.', loadingBookings: false, isLoading: false });
        }
    },

    fetchResults: async (params = {}) => {
        set({ loadingResults: true, isLoading: true, error: null });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await diagnosticCenterApi.getResults({
                page,
                limit,
                resultStatus: params.resultStatus,
                search: params.search,
            });
            if (!response.success) {
                set({ error: response.error || 'Failed to load results', loadingResults: false, isLoading: false });
                return;
            }
            const rawData = response.data;
            const raw = (Array.isArray(rawData) ? rawData : (rawData as any)?.bookings || (rawData as any)?.data || []) as DiagnosticBooking[];
            const seen = new Set<string>();
            const deduped = raw
                .map(result => normalizeDiagnosticBooking(result as Record<string, any>))
                .filter(r => {
                if (seen.has(r.id)) return false;
                seen.add(r.id);
                return true;
                });
            set({
                results: deduped,
                resultsPagination: normalizePagination(response.pagination as Record<string, any> | undefined, page, limit),
                resultsSummary: (response.summary as DiagnosticBookingSummary | undefined) || { total: deduped.length, status: {}, resultStatus: {} },
                loadingResults: false,
                isLoading: false,
            });
        } catch (error) {
            console.error('Error fetching results:', error);
            set({ error: 'Failed to load results.', loadingResults: false, isLoading: false });
        }
    },

    // M6: Fetch single booking by ID
    fetchBookingById: async (bookingId: string) => {
        set({ loadingSelectedBooking: true, error: null });
        try {
            const response = await diagnosticCenterApi.getBookingById(bookingId);
            if (!response.success) {
                set({ error: response.error || 'Failed to load booking', loadingSelectedBooking: false });
                return;
            }
            set({
                selectedBooking: normalizeDiagnosticBooking((response.data || {}) as Record<string, any>),
                loadingSelectedBooking: false,
            });
        } catch (error) {
            console.error('Error fetching booking:', error);
            set({ error: 'Failed to load booking.', loadingSelectedBooking: false });
        }
    },

    updateBookingStatus: async (bookingId, status) => {
        try {
            const response = await diagnosticCenterApi.updateBookingStatus(bookingId, status);
            if (response.success) {
                get().fetchBookings({ page: get().bookingsPagination.page });
                get().fetchResults({ page: get().resultsPagination.page });
                return true;
            }
            set({ error: response.error || 'Failed to update booking status' });
            return false;
        } catch (error) {
            console.error('Error updating booking:', error);
            set({ error: 'Failed to update booking.' });
            return false;
        }
    },

    uploadResult: async (bookingId, data) => {
        try {
            const response = await diagnosticCenterApi.uploadResult(bookingId, data);
            if (response.success) {
                get().fetchBookings({ page: get().bookingsPagination.page });
                get().fetchResults({ page: get().resultsPagination.page });
                return true;
            }
            set({ error: response.error || 'Failed to upload result' });
            return false;
        } catch (error) {
            console.error('Error uploading result:', error);
            set({ error: 'Failed to upload result.' });
            return false;
        }
    },

    fetchReviews: async (page = 1) => {
        set({ loadingReviews: true, error: null });
        try {
            const response = await diagnosticCenterApi.getReviews(page);
            if (!response.success) {
                set({ error: response.error || 'Failed to load reviews', loadingReviews: false });
                return;
            }
            const rawData = response.data;
            const reviews = (Array.isArray(rawData) ? rawData : (rawData as any)?.reviews || (rawData as any)?.data || []) as Review[];
            set({ reviews, loadingReviews: false });
        } catch (error) {
            console.error('Error fetching reviews:', error);
            set({ error: 'Failed to load reviews.', loadingReviews: false });
        }
    },
}));
