import { create } from 'zustand';
import { adminApi, fetchWithAuth } from '@/lib/api';

export interface Medicine {
    id: string;
    name: string;
    generic_name?: string;
    manufacturer?: string;
    category?: string;
    price?: number;
    mrp?: number;
    requires_prescription?: boolean;
}

interface AdminMedicinesState {
    medicines: Medicine[];
    loading: boolean;
    error: string | null;
    fetchMedicines: (page?: number, search?: string) => Promise<void>;
    addBulkMedicines: (items: any[]) => Promise<boolean>;
    clearError: () => void;
}

export const useAdminMedicinesStore = create<AdminMedicinesState>((set, get) => ({
    medicines: [],
    loading: false,
    error: null,

    clearError: () => set({ error: null }),

    fetchMedicines: async (page = 1, search = '') => {
        set({ loading: true, error: null });
        try {
            // Using raw fetchWithAuth since there's no wrapper yet for getting global medicines
            const query = new URLSearchParams({ page: String(page), limit: '50' });
            if (search) query.set('search', search);
            
            // Reusing the public medicines endpoint
            const response = await fetchWithAuth(`/medicines?${query}`);
            if (response.success) {
                set({ medicines: (response.data as Medicine[]) || [], loading: false });
            } else {
                throw new Error(response.message || 'Failed to load medicines');
            }
        } catch (err: any) {
            set({ error: err.message, loading: false });
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
