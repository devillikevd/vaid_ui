import { create } from 'zustand';
import { fetchWithAuth } from '@/lib/api';

export interface MasterTest {
    id: string;
    name: string;
    category: string;
    description?: string;
    icon_url?: string;
    sample_type?: string;
    preparation_instructions?: string;
    is_active?: boolean;
    created_at?: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
}

interface AdminTestsState {
    tests: MasterTest[];
    pagination: Pagination;
    loading: boolean;
    error: string | null;
    fetchTests: (page?: number, search?: string, category?: string) => Promise<void>;
    addTest: (data: Record<string, unknown>) => Promise<boolean>;
    addBulkTests: (items: any[]) => Promise<boolean>;
    updateTest: (id: string, data: Record<string, unknown>) => Promise<boolean>;
    deleteTest: (id: string) => Promise<boolean>;
    clearError: () => void;
}

export const useAdminTestsStore = create<AdminTestsState>((set, get) => ({
    tests: [],
    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    loading: false,
    error: null,

    clearError: () => set({ error: null }),

    fetchTests: async (page = 1, search = '', category = '') => {
        set({ loading: true, error: null });
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                limit: '20'
            });
            if (search) params.append('search', search);
            if (category) params.append('category', category);

            const res = await fetchWithAuth<MasterTest[]>(`/admin/master-tests?${params.toString()}`);
            if (res.success) {
                set({
                    tests: res.data || [],
                    pagination: (res as any).pagination || get().pagination,
                    loading: false
                });
            } else {
                throw new Error('Failed to fetch tests');
            }
        } catch (error: any) {
            set({
                error: error.response?.data?.message || error.message || 'An error occurred',
                loading: false
            });
        }
    },

    addTest: async (data) => {
        set({ loading: true, error: null });
        try {
            const res = await fetchWithAuth<{ success: boolean }>('/admin/master-tests', {
                method: 'POST',
                body: JSON.stringify(data)
            });
            if (res.success) {
                await get().fetchTests(1);
                return true;
            }
            return false;
        } catch (error: any) {
            set({
                error: error.response?.data?.message || error.message || 'An error occurred',
                loading: false
            });
            return false;
        }
    },

    updateTest: async (id, data) => {
        set({ loading: true, error: null });
        try {
            const res = await fetchWithAuth<{ success: boolean }>(`/admin/master-tests/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            if (res.success) {
                await get().fetchTests(get().pagination.page);
                return true;
            }
            return false;
        } catch (error: any) {
            set({
                error: error.response?.data?.message || error.message || 'An error occurred',
                loading: false
            });
            return false;
        }
    },

    deleteTest: async (id) => {
        set({ loading: true, error: null });
        try {
            const res = await fetchWithAuth<{ success: boolean }>(`/admin/master-tests/${id}`, {
                method: 'DELETE'
            });
            if (res.success) {
                await get().fetchTests(get().pagination.page);
                return true;
            }
            return false;
        } catch (error: any) {
            set({
                error: error.response?.data?.message || error.message || 'An error occurred',
                loading: false
            });
            return false;
        }
    },

    addBulkTests: async (items: any[]) => {
        set({ loading: true, error: null });
        try {
            const res = await fetchWithAuth<{ success: boolean; message?: string }>('/admin/master-tests/bulk', {
                method: 'POST',
                body: JSON.stringify({ tests: items })
            });
            if (res.success) {
                await get().fetchTests(1);
                return true;
            }
            throw new Error(res.error || 'Failed to import bulk tests');
        } catch (error: any) {
            set({
                error: error.response?.data?.message || error.message || 'An error occurred',
                loading: false
            });
            return false;
        }
    },
}));
