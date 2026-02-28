import { create } from 'zustand';
import { hospitalApi } from '../lib/api';

// ==================== Types ====================

export interface HospitalDashboardStats {
    totalDoctors: number;
    departments: number;
    todaysAppointments: number;
    bedCapacity: string;
}

export interface Department {
    id: string;
    name: string;
    doctors: number;
    appointments: number;
    head?: string;
}

export interface HospitalDoctor {
    id: string;
    name: string;
    specialization: string;
    department: string;
    status: 'active' | 'on-leave' | 'inactive';
    appointmentsToday: number;
}

interface HospitalState {
    stats: HospitalDashboardStats | null;
    departments: Department[];
    doctors: HospitalDoctor[];
    appointments: Record<string, unknown>[];
    isLoading: boolean;
    loadingDashboard: boolean;
    loadingDepartments: boolean;
    loadingDoctors: boolean;
    loadingAppointments: boolean;
    error: string | null;

    fetchDashboardData: () => Promise<void>;
    fetchDepartments: () => Promise<void>;
    fetchDoctors: () => Promise<void>;
    fetchAppointments: () => Promise<void>;
    inviteDoctor: (data: Record<string, unknown>) => Promise<boolean>;
    removeDoctor: (doctorId: string) => Promise<boolean>;
    addDepartment: (data: Record<string, unknown>) => Promise<boolean>;
    updateDepartment: (departmentId: string, data: Record<string, unknown>) => Promise<boolean>;
    deleteDepartment: (departmentId: string) => Promise<boolean>;
    clearError: () => void;
    reset: () => void;
}

// ==================== Store ====================

const hospitalInitialState = {
    stats: null as HospitalDashboardStats | null,
    departments: [] as Department[],
    doctors: [] as HospitalDoctor[],
    appointments: [] as Record<string, unknown>[],
    isLoading: false,
    loadingDashboard: false,
    loadingDepartments: false,
    loadingDoctors: false,
    loadingAppointments: false,
    error: null as string | null,
};

export const useHospitalStore = create<HospitalState>((set, get) => ({
    ...hospitalInitialState,

    clearError: () => set({ error: null }),
    reset: () => set({ ...hospitalInitialState }),

    fetchDashboardData: async () => {
        set({ loadingDashboard: true, isLoading: true, error: null });
        try {
            const response = await hospitalApi.getDashboard();
            if (!response.success) {
                set({
                    error: response.error || 'Failed to load hospital dashboard',
                    loadingDashboard: false,
                    isLoading: false,
                });
                return;
            }
            const data = response.data as Record<string, unknown>;
            set({
                stats: (data.stats as HospitalDashboardStats) || null,
                departments: (data.departments as Department[]) || [],
                loadingDashboard: false,
                isLoading: false,
            });
        } catch (error) {
            console.error('Error fetching hospital dashboard:', error);
            set({
                error: 'Failed to connect to server. Please check your connection.',
                loadingDashboard: false,
                isLoading: false,
            });
        }
    },

    fetchDepartments: async () => {
        set({ loadingDepartments: true, error: null });
        try {
            const response = await hospitalApi.getDepartments();
            if (response.success) {
                const data = response.data as Record<string, unknown>;
                set({
                    departments: (data.departments as Department[]) || [],
                    loadingDepartments: false,
                });
            } else {
                // Fallback to dashboard data
                const dashResponse = await hospitalApi.getDashboard();
                if (dashResponse.success) {
                    const dData = dashResponse.data as Record<string, unknown>;
                    set({
                        departments: (dData.departments as Department[]) || [],
                        loadingDepartments: false,
                    });
                } else {
                    set({ error: response.error || 'Failed to load departments', loadingDepartments: false });
                }
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
            set({ error: 'Failed to connect to server.', loadingDepartments: false });
        }
    },

    addDepartment: async (data) => {
        set({ error: null });
        try {
            const response = await hospitalApi.addDepartment(data);
            if (response.success) {
                get().fetchDepartments();
                get().fetchDashboardData();
                return true;
            }
            set({ error: response.error || 'Failed to add department' });
            return false;
        } catch (error) {
            console.error('Error adding department:', error);
            set({ error: 'Failed to connect to server.' });
            return false;
        }
    },

    updateDepartment: async (departmentId, data) => {
        set({ error: null });
        try {
            const response = await hospitalApi.updateDepartment(departmentId, data);
            if (response.success) {
                get().fetchDepartments();
                return true;
            }
            set({ error: response.error || 'Failed to update department' });
            return false;
        } catch (error) {
            console.error('Error updating department:', error);
            set({ error: 'Failed to connect to server.' });
            return false;
        }
    },

    deleteDepartment: async (departmentId) => {
        set({ error: null });
        try {
            const response = await hospitalApi.deleteDepartment(departmentId);
            if (response.success) {
                get().fetchDepartments();
                get().fetchDashboardData();
                return true;
            }
            set({ error: response.error || 'Failed to delete department' });
            return false;
        } catch (error) {
            console.error('Error deleting department:', error);
            set({ error: 'Failed to connect to server.' });
            return false;
        }
    },

    fetchDoctors: async () => {
        set({ loadingDoctors: true, error: null });
        try {
            const response = await hospitalApi.getDoctors();
            if (!response.success) {
                set({ error: response.error || 'Failed to load doctors', loadingDoctors: false });
                return;
            }
            const data = response.data as Record<string, unknown>;
            set({
                doctors: (data.doctors || data.data || []) as HospitalDoctor[],
                loadingDoctors: false,
            });
        } catch (error) {
            console.error('Error fetching doctors:', error);
            set({ error: 'Failed to load doctors.', loadingDoctors: false });
        }
    },

    fetchAppointments: async () => {
        set({ loadingAppointments: true, error: null });
        try {
            const response = await hospitalApi.getAppointments();
            if (!response.success) {
                set({ error: response.error || 'Failed to load appointments', loadingAppointments: false });
                return;
            }
            const data = response.data as Record<string, unknown>;
            set({
                appointments: (data.appointments || data.data || []) as Record<string, unknown>[],
                loadingAppointments: false,
            });
        } catch (error) {
            console.error('Error fetching appointments:', error);
            set({ error: 'Failed to load appointments.', loadingAppointments: false });
        }
    },

    inviteDoctor: async (data) => {
        try {
            const response = await hospitalApi.inviteDoctor(data);
            if (response.success) {
                get().fetchDoctors();
                return true;
            }
            set({ error: response.error || 'Failed to invite doctor' });
            return false;
        } catch (error) {
            console.error('Error inviting doctor:', error);
            set({ error: 'Failed to invite doctor.' });
            return false;
        }
    },

    removeDoctor: async (doctorId) => {
        try {
            const response = await hospitalApi.removeDoctor(doctorId);
            if (response.success) {
                get().fetchDoctors();
                return true;
            }
            set({ error: response.error || 'Failed to remove doctor' });
            return false;
        } catch (error) {
            console.error('Error removing doctor:', error);
            set({ error: 'Failed to remove doctor.' });
            return false;
        }
    },
}));
