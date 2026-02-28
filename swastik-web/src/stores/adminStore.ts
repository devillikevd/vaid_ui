import { create } from 'zustand';
import { adminApi } from '../lib/api';

// ==================== Types ====================

export interface AdminDashboardStats {
    totalUsers: number;
    totalProviders: number;
    totalPatients: number;
    activeToday: number;
    pendingApprovals: number;
    todaysAppointments: number;
    activeEmergencies: number;
}

export interface ProviderCounts {
    doctors: { total: number; pending: number };
    hospitals: { total: number; pending: number };
    clinics: { total: number; pending: number };
    pharmacies: { total: number; pending: number };
    diagnosticCenters: { total: number; pending: number };
    ambulances: { total: number; pending: number };
}

export interface ProviderCategory {
    name: string;
    type: 'doctors' | 'hospitals' | 'clinics' | 'pharmacies' | 'diagnostic_centers' | 'ambulances';
    pending: number;
    approved: number;
}

export interface RecentAction {
    id: string;
    action: string;
    target: string;
    type: string;
    time: string;
    status: 'approved' | 'rejected' | 'suspended' | 'review';
}

export interface Alert {
    type: 'warning' | 'error' | 'info';
    message: string;
    link: string;
}

export interface PendingProvider {
    id: string;
    name: string;
    provider_type: string;
    email?: string;
    phone?: string;
    address?: string;
    latitude?: number | null;
    longitude?: number | null;
    created_at: string;
    approval_status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'suspended';
    registration_number?: string;
}

interface AdminState {
    stats: AdminDashboardStats | null;
    providerCounts: ProviderCounts | null;
    providerCategories: ProviderCategory[];
    recentActions: RecentAction[];
    alerts: Alert[];
    pendingProviders: PendingProvider[];
    selectedProvider: PendingProvider | null;
    isLoading: boolean;
    loadingDashboard: boolean;
    loadingApprovals: boolean;
    error: string | null;

    fetchDashboardData: () => Promise<void>;
    fetchPendingApprovals: (type?: string) => Promise<void>;
    fetchProviderDetails: (type: string, id: string) => Promise<PendingProvider | null>;
    approveProvider: (id: string, type: string, notes?: string) => Promise<boolean>;
    rejectProvider: (id: string, type: string, reason: string) => Promise<boolean>;
    suspendProvider: (id: string, type: string, reason: string) => Promise<boolean>;
    reactivateProvider: (id: string, type: string, notes?: string) => Promise<boolean>;
    setSelectedProvider: (provider: PendingProvider | null) => void;
    clearError: () => void;
    reset: () => void;
}

// ==================== Store ====================

const adminInitialState = {
    stats: null as AdminDashboardStats | null,
    providerCounts: null as ProviderCounts | null,
    providerCategories: [] as ProviderCategory[],
    recentActions: [] as RecentAction[],
    alerts: [] as Alert[],
    pendingProviders: [] as PendingProvider[],
    selectedProvider: null as PendingProvider | null,
    isLoading: false,
    loadingDashboard: false,
    loadingApprovals: false,
    error: null as string | null,
};

export const useAdminStore = create<AdminState>((set, get) => ({
    ...adminInitialState,

    clearError: () => set({ error: null }),
    reset: () => set({ ...adminInitialState }),

    fetchDashboardData: async () => {
        set({ loadingDashboard: true, isLoading: true, error: null });
        try {
            const response = await adminApi.getDashboard();
            if (!response.success) {
                set({ error: response.error || 'Failed to fetch dashboard', loadingDashboard: false, isLoading: false });
                return;
            }
            const raw = response.data as Record<string, unknown>;
            // fetchWithAuth wraps server JSON as { success, data: <body> }
            // Backend returns { success, data: { stats, providerCounts, ... } }
            // So real payload is at raw.data (double-nested)
            const data = (raw.data as Record<string, unknown>) || raw;
            set({
                stats: (data.stats as AdminDashboardStats) || null,
                providerCounts: (data.providerCounts as ProviderCounts) || null,
                providerCategories: (data.providerCategories as ProviderCategory[]) || [],
                recentActions: (data.recentActions as RecentAction[]) || [],
                alerts: (data.alerts as Alert[]) || [],
                loadingDashboard: false,
                isLoading: false,
            });
        } catch (error) {
            console.error('Error fetching admin dashboard:', error);
            set({ error: 'Network error. Please check backend connection.', loadingDashboard: false, isLoading: false });
        }
    },

    fetchPendingApprovals: async (type = 'all') => {
        set({ loadingApprovals: true });
        try {
            const response = await adminApi.getPendingApprovals(type);
            if (response.success) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const responseData = response.data as any;
                const rawData = responseData?.data || responseData;

                let providers: PendingProvider[] = [];

                if (Array.isArray(rawData)) {
                    // Single-type response returns flat array
                    providers = rawData;
                } else if (rawData && typeof rawData === 'object') {
                    // "all" type returns { doctors: {data: [...]}, hospitals: {data: [...]}, ... }
                    // Flatten all provider arrays into one with providerType tag
                    for (const [providerType, group] of Object.entries(rawData)) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        const items = (group as any)?.data || [];
                        if (Array.isArray(items)) {
                            providers.push(...items.map((item: PendingProvider) => ({
                                ...item,
                                provider_type: providerType,
                            })));
                        }
                    }
                }

                set({ pendingProviders: providers, loadingApprovals: false });
            } else {
                set({ error: response.error, loadingApprovals: false });
            }
        } catch (error) {
            console.error('Error fetching pending approvals:', error);
            set({ error: 'Failed to load pending approvals.', loadingApprovals: false });
        }
    },

    fetchProviderDetails: async (type, id) => {
        try {
            const response = await adminApi.getProviderDetails(type, id);
            if (response.success) {
                // Unwrap double-nested data from fetchWithAuth + backend { data: provider }
                const raw = response.data as Record<string, unknown>;
                return (raw.data || raw) as PendingProvider;
            }
            return null;
        } catch {
            return null;
        }
    },

    approveProvider: async (id, type, notes) => {
        try {
            const providerType = type.toLowerCase().endsWith('s') ? type.toLowerCase() : type.toLowerCase() + 's';
            const response = await adminApi.approveProvider(providerType, id, notes);
            if (response.success) {
                get().fetchPendingApprovals();
                get().fetchDashboardData();
                set({ selectedProvider: null });
                return true;
            }
            set({ error: response.error || 'Failed to approve provider' });
            return false;
        } catch (error) {
            console.error('Error approving provider:', error);
            return false;
        }
    },

    rejectProvider: async (id, type, reason) => {
        try {
            const providerType = type.toLowerCase().endsWith('s') ? type.toLowerCase() : type.toLowerCase() + 's';
            const response = await adminApi.rejectProvider(providerType, id, reason);
            if (response.success) {
                get().fetchPendingApprovals();
                get().fetchDashboardData();
                set({ selectedProvider: null });
                return true;
            }
            set({ error: response.error || 'Failed to reject provider' });
            return false;
        } catch (error) {
            console.error('Error rejecting provider:', error);
            return false;
        }
    },

    suspendProvider: async (id, type, reason) => {
        try {
            const providerType = type.toLowerCase().endsWith('s') ? type.toLowerCase() : type.toLowerCase() + 's';
            const response = await adminApi.suspendProvider(providerType, id, reason);
            if (response.success) {
                get().fetchDashboardData();
                set({ selectedProvider: null });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error suspending provider:', error);
            return false;
        }
    },

    reactivateProvider: async (id, type, notes) => {
        try {
            const providerType = type.toLowerCase().endsWith('s') ? type.toLowerCase() : type.toLowerCase() + 's';
            const response = await adminApi.reactivateProvider(providerType, id, notes);
            if (response.success) {
                get().fetchDashboardData();
                set({ selectedProvider: null });
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error reactivating provider:', error);
            return false;
        }
    },

    setSelectedProvider: (provider) => set({ selectedProvider: provider }),
}));

