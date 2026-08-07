import { create } from 'zustand';
import { adminApi, pharmacyApi } from '@/lib/api';

export type CampaignScope = 'global' | 'category' | 'brand' | 'medicine';
export type CampaignDiscountType = 'percentage' | 'flat';

export interface Campaign {
    id: string;
    name: string;
    description?: string | null;
    discount_type: CampaignDiscountType;
    discount_value: number;
    scope_type: CampaignScope;
    scope_ref?: string | null;
    min_order_value?: number | null;
    max_discount_per_order?: number | null;
    max_redemptions_total?: number | null;
    max_redemptions_per_user?: number | null;
    start_at: string;
    end_at: string;
    is_active?: boolean;
    created_by?: string | null;
    created_at?: string;
    updated_at?: string;
    opted_in?: boolean;
    opted_in_at?: string;
    opted_in_pharmacies?: number;
    total_redemptions?: number;
}

export function campaignStatus(c: Campaign): 'active' | 'upcoming' | 'expired' | 'inactive' {
    const now = Date.now();
    if (c.is_active === false) return 'inactive';
    const start = new Date(c.start_at).getTime();
    const end = new Date(c.end_at).getTime();
    if (now > end) return 'expired';
    if (now < start) return 'upcoming';
    return 'active';
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

// ==================== Admin ====================

interface AdminCampaignsState {
    campaigns: Campaign[];
    pagination: Pagination;
    loading: boolean;
    error: string | null;
    fetchCampaigns: (page?: number, status?: string, scopeType?: string) => Promise<void>;
    createCampaign: (data: Record<string, unknown>) => Promise<boolean>;
    updateCampaign: (id: string, data: Record<string, unknown>) => Promise<boolean>;
    deleteCampaign: (id: string) => Promise<boolean>;
    clearError: () => void;
}

export const useAdminCampaignsStore = create<AdminCampaignsState>((set, get) => ({
    campaigns: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    loading: false,
    error: null,

    clearError: () => set({ error: null }),

    fetchCampaigns: async (page = 1, status = 'all', scopeType = '') => {
        set({ loading: true, error: null });
        try {
            const response = await adminApi.getCampaigns({ status, scopeType: scopeType || undefined }, page, 20);
            if (response.success) {
                set({
                    campaigns: (response.data as Campaign[]) || [],
                    pagination: response.pagination || { page, limit: 20, total: 0, totalPages: 0 },
                    loading: false,
                });
            } else {
                throw new Error(response.message || 'Failed to load campaigns');
            }
        } catch (err: any) {
            set({ error: err.message || 'Failed to load campaigns', loading: false });
        }
    },

    createCampaign: async (data) => {
        set({ error: null });
        try {
            const response = await adminApi.createCampaign(data);
            if (response.success) {
                await get().fetchCampaigns(1);
                return true;
            }
            throw new Error(response.message || 'Failed to create campaign');
        } catch (err: any) {
            set({ error: err.message || 'Failed to create campaign' });
            return false;
        }
    },

    updateCampaign: async (id, data) => {
        set({ error: null });
        try {
            const response = await adminApi.updateCampaign(id, data);
            if (response.success) {
                const { pagination } = get();
                await get().fetchCampaigns(pagination.page);
                return true;
            }
            throw new Error(response.message || 'Failed to update campaign');
        } catch (err: any) {
            set({ error: err.message || 'Failed to update campaign' });
            return false;
        }
    },

    deleteCampaign: async (id) => {
        set({ error: null });
        try {
            const response = await adminApi.deleteCampaign(id);
            if (response.success) {
                const { pagination } = get();
                await get().fetchCampaigns(pagination.page);
                return true;
            }
            throw new Error(response.message || 'Failed to delete campaign');
        } catch (err: any) {
            set({ error: err.message || 'Failed to delete campaign' });
            return false;
        }
    },
}));

// ==================== Pharmacy ====================

interface PharmacyCampaignsState {
    available: Campaign[];
    mine: Campaign[];
    loading: boolean;
    actionLoading: string | null;
    error: string | null;
    fetchAvailable: (status?: string) => Promise<void>;
    fetchMine: () => Promise<void>;
    optIn: (id: string) => Promise<boolean>;
    optOut: (id: string) => Promise<boolean>;
    clearError: () => void;
}

export const usePharmacyCampaignsStore = create<PharmacyCampaignsState>((set, get) => ({
    available: [],
    mine: [],
    loading: false,
    actionLoading: null,
    error: null,

    clearError: () => set({ error: null }),

    fetchAvailable: async (status = 'active') => {
        set({ loading: true, error: null });
        try {
            const response = await pharmacyApi.getAvailableCampaigns(status);
            if (response.success) {
                set({ available: (response.data as Campaign[]) || [], loading: false });
            } else {
                throw new Error(response.message || 'Failed to load campaigns');
            }
        } catch (err: any) {
            set({ error: err.message || 'Failed to load campaigns', loading: false });
        }
    },

    fetchMine: async () => {
        set({ loading: true, error: null });
        try {
            const response = await pharmacyApi.getMyCampaigns();
            if (response.success) {
                set({ mine: (response.data as Campaign[]) || [], loading: false });
            } else {
                throw new Error(response.message || 'Failed to load opted-in campaigns');
            }
        } catch (err: any) {
            set({ error: err.message || 'Failed to load opted-in campaigns', loading: false });
        }
    },

    optIn: async (id) => {
        set({ actionLoading: id, error: null });
        try {
            const response = await pharmacyApi.optInCampaign(id);
            if (response.success) {
                await get().fetchMine();
                await get().fetchAvailable('active');
                set({ actionLoading: null });
                return true;
            }
            throw new Error(response.message || 'Failed to opt in');
        } catch (err: any) {
            set({ error: err.message || 'Failed to opt in', actionLoading: null });
            return false;
        }
    },

    optOut: async (id) => {
        set({ actionLoading: id, error: null });
        try {
            const response = await pharmacyApi.optOutCampaign(id);
            if (response.success) {
                await get().fetchMine();
                await get().fetchAvailable('active');
                set({ actionLoading: null });
                return true;
            }
            throw new Error(response.message || 'Failed to opt out');
        } catch (err: any) {
            set({ error: err.message || 'Failed to opt out', actionLoading: null });
            return false;
        }
    },
}));
