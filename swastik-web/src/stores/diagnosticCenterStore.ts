import { create } from 'zustand';
import { diagnosticCenterApi } from '../lib/api';

// ==================== Types ====================

export interface DiagnosticDashboardStats {
    totalTests: number;
    todaysBookings: number;
    pendingResults: number;
    totalPatients: number;
}

export interface DiagnosticPatient {
    id: string;
    name?: string;
    phone?: string;
    total_bookings?: number;
    pending_bookings?: number;
    last_test_name?: string;
    last_booking_date?: string;
    last_booking_status?: string;
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
    updated_at: string;
    master_test_id?: string;
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

export interface DiagnosticCenterProfile {
    id: string;
    owner_id?: string;
    name: string;
    email?: string;
    phone: string;
    emergency_phone?: string;
    website?: string;
    website_url?: string;
    address: string;
    city?: string;
    state?: string;
    pincode?: string;
    latitude?: number | null;
    longitude?: number | null;
    registration_number?: string;
    license_number?: string;
    license_document_url?: string;
    nabl_accreditation?: boolean;
    accreditations?: string[] | string;
    description?: string;
    opening_hours?: string;
    is_24_hours?: boolean;
    sample_collection_available?: boolean;
    home_collection_available?: boolean;
    home_collection_fee?: number | string | null;
    profile_image_url?: string | null;
    profile_image?: string | null;
    image_url?: string | null;
    is_approved?: boolean;
    approval_status?: string;
    rating?: number;
    total_reviews?: number;
    created_at?: string;
    updated_at?: string;
    [key: string]: unknown;
}

interface DiagnosticCenterState {
    profile: DiagnosticCenterProfile | null;
    loadingProfile: boolean;
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

    collectionModes: { walk_in: number; home_collection: number };
    workflow: { pending: number; confirmed: number; dispatched: number; arrived: number; sampleCollected: number; processing: number; completed: number };
    homeCollection: { scheduled: number; pendingDispatch: number; dispatched: number; arrived: number; sampleCollected: number };
    attention: { pendingConfirmations: number; pendingSampleCollection: number; processing: number; pendingResults: number };
    patients: DiagnosticPatient[];
    patientsPagination: DiagnosticPagination;
    loadingPatients: boolean;
    fetchPatients: (params?: { page?: number; limit?: number; search?: string }) => Promise<void>;

    fetchProfile: () => Promise<DiagnosticCenterProfile | null>;
    updateProfile: (data: Record<string, unknown>) => Promise<{ success: boolean; error?: string; data?: DiagnosticCenterProfile }>;
    setProfile: (profile: DiagnosticCenterProfile | null) => void;
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
    profile: null as DiagnosticCenterProfile | null,
    loadingProfile: false,
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
    collectionModes: { walk_in: 0, home_collection: 0 },
    workflow: { pending: 0, confirmed: 0, dispatched: 0, arrived: 0, sampleCollected: 0, processing: 0, completed: 0 },
    homeCollection: { scheduled: 0, pendingDispatch: 0, dispatched: 0, arrived: 0, sampleCollected: 0 },
    attention: { pendingConfirmations: 0, pendingSampleCollection: 0, processing: 0, pendingResults: 0 },
    patients: [] as DiagnosticPatient[],
    patientsPagination: { page: 1, limit: 20, total: 0, totalPages: 1 } as DiagnosticPagination,
    loadingPatients: false,
};

export const useDiagnosticCenterStore = create<DiagnosticCenterState>((set, get) => ({
    ...diagnosticInitialState,

    clearError: () => set({ error: null }),
    reset: () => set({ ...diagnosticInitialState }),

    setProfile: (profile) => set({ profile }),

    fetchProfile: async () => {
        set({ loadingProfile: true, error: null });
        try {
            const response = await diagnosticCenterApi.getProfile();
            if (!response.success) {
                set({ error: response.error || 'Failed to load profile', loadingProfile: false });
                return null;
            }
            const rawData = response.data;
            const p = (rawData as any)?.center || (rawData as any)?.profile || (rawData as any)?.pharmacy || rawData || {};
            const normalizedProfile: DiagnosticCenterProfile = {
                ...p,
                profile_image_url: p.profile_image_url || p.profile_image || p.image_url || null,
            };
            set({ profile: normalizedProfile, loadingProfile: false });
            return normalizedProfile;
        } catch (error) {
            console.error('Error fetching diagnostic profile:', error);
            set({ error: 'Failed to load profile.', loadingProfile: false });
            return null;
        }
    },

    updateProfile: async (data: Record<string, unknown>) => {
        set({ loadingProfile: true, error: null });
        try {
            const response = await diagnosticCenterApi.updateProfile(data);
            if (!response.success) {
                const errorMsg = response.error || 'Failed to update profile';
                set({ error: errorMsg, loadingProfile: false });
                return { success: false, error: errorMsg };
            }
            const rawData = response.data;
            const p = (rawData as any)?.center || (rawData as any)?.profile || rawData || {};
            const updatedProfile: DiagnosticCenterProfile = {
                ...(get().profile || {}),
                ...p,
                profile_image_url: p.profile_image_url || p.profile_image || p.image_url || null,
            };
            set({ profile: updatedProfile, loadingProfile: false });
            return { success: true, data: updatedProfile };
        } catch (error) {
            console.error('Error updating diagnostic profile:', error);
            const errorMsg = 'Failed to update profile due to a network error.';
            set({ error: errorMsg, loadingProfile: false });
            return { success: false, error: errorMsg };
        }
    },

    fetchPatients: async (params = {}) => {
        set({ loadingPatients: true, error: null });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await diagnosticCenterApi.getPatients({
                page,
                limit,
                search: params.search,
            });
            if (!response.success) {
                set({ error: response.error || 'Failed to load patients', loadingPatients: false });
                return;
            }
            const rawData = response.data;
            const rawPatients = (Array.isArray(rawData) ? rawData : (rawData as any)?.patients || (rawData as any)?.data || []) as DiagnosticPatient[];
            set({
                patients: rawPatients,
                patientsPagination: normalizePagination(response.pagination as Record<string, any> | undefined, page, limit),
                loadingPatients: false,
            });
        } catch (error) {
            console.error('Error fetching patients:', error);
            set({ error: 'Failed to load patients.', loadingPatients: false });
        }
    },

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

            set({
                collectionModes: (rawStats.collectionModes || { walk_in: 0, home_collection: 0 }) as { walk_in: number; home_collection: number },
                workflow: (rawStats.workflow || { pending: 0, confirmed: 0, dispatched: 0, arrived: 0, sampleCollected: 0, processing: 0, completed: 0 }) as { pending: number; confirmed: number; dispatched: number; arrived: number; sampleCollected: number; processing: number; completed: number },
                homeCollection: (rawStats.homeCollection || { scheduled: 0, pendingDispatch: 0, dispatched: 0, arrived: 0, sampleCollected: 0 }) as { scheduled: number; pendingDispatch: number; dispatched: number; arrived: number; sampleCollected: number },
                attention: (rawStats.attention || { pendingConfirmations: 0, pendingSampleCollection: 0, processing: 0, pendingResults: 0 }) as { pendingConfirmations: number; pendingSampleCollection: number; processing: number; pendingResults: number }
            });

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
