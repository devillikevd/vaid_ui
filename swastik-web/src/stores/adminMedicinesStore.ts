import { create } from 'zustand';
import { adminApi } from '@/lib/api';

export interface Medicine {
    id: string;
    name: string;
    generic_name?: string;
    manufacturer?: string;
    category?: string;
    subcategory?: string;
    description?: string;
    form?: string;
    dosage_form?: string;
    strength?: string;
    pack_size?: string;
    price?: number;
    mrp?: number;
    requires_prescription?: boolean;
    image_url?: string;
    is_active?: boolean;
    created_at?: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface AdminMedicinesState {
    medicines: Medicine[];
    pagination: Pagination;
    loading: boolean;
    error: string | null;
    fetchMedicines: (page?: number, search?: string, category?: string) => Promise<void>;
    addMedicine: (data: Record<string, unknown>) => Promise<boolean>;
    updateMedicine: (id: string, data: Record<string, unknown>) => Promise<boolean>;
    deleteMedicine: (id: string) => Promise<boolean>;
    addBulkMedicines: (items: any[]) => Promise<boolean>;
    clearError: () => void;
}

export const useAdminMedicinesStore = create<AdminMedicinesState>((set, get) => ({
    medicines: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    loading: false,
    error: null,

    clearError: () => set({ error: null }),

    fetchMedicines: async (page = 1, search = '', category = '') => {
        set({ loading: true, error: null });
        try {
            const response = await adminApi.fetchMedicines(page, 20, search || undefined, category || undefined);
            if (response.success) {
                set({
                    medicines: (response.data as Medicine[]) || [],
                    pagination: response.pagination || { page, limit: 20, total: 0, totalPages: 0 },
                    loading: false,
                });
            } else {
                throw new Error(response.message || 'Failed to load medicines');
            }
        } catch (err: any) {
            set({ error: err.message, loading: false });
        }
    },

    addMedicine: async (data) => {
        set({ error: null });
        try {
            const response = await adminApi.addMedicine(data);
            if (response.success) {
                const { pagination } = get();
                await get().fetchMedicines(pagination.page);
                return true;
            }
            throw new Error(response.message || 'Failed to add medicine');
        } catch (error: any) {
            set({ error: error.message || 'Failed to add medicine' });
            return false;
        }
    },

    updateMedicine: async (id, data) => {
        set({ error: null });
        try {
            const response = await adminApi.updateMedicine(id, data);
            if (response.success) {
                const { pagination } = get();
                await get().fetchMedicines(pagination.page);
                return true;
            }
            throw new Error(response.message || 'Failed to update medicine');
        } catch (error: any) {
            set({ error: error.message || 'Failed to update medicine' });
            return false;
        }
    },

    deleteMedicine: async (id) => {
        set({ error: null });
        try {
            const response = await adminApi.deleteMedicine(id);
            if (response.success) {
                const { pagination } = get();
                await get().fetchMedicines(pagination.page);
                return true;
            }
            throw new Error(response.message || 'Failed to delete medicine');
        } catch (error: any) {
            set({ error: error.message || 'Failed to delete medicine' });
            return false;
        }
    },

    addBulkMedicines: async (items: any[]) => {
        set({ loading: true, error: null });
        try {
            const response = await adminApi.addBulkMedicines(items);
            if (response.success) {
                await get().fetchMedicines();
                return true;
            }
            throw new Error(response.message || response.error || 'Failed to import bulk medicines');
        } catch (error: any) {
            set({ error: error.message || 'Failed to import bulk medicines', loading: false });
            return false;
        }
    },
}));
