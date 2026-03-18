import { create } from 'zustand';
import { clinicApi } from '../lib/api';

// ==================== Types ====================

export interface ClinicDashboardStats {
    totalStaff: number;
    todaysAppointments: number;
    walkInsToday: number;
    repeatPatients: string;
}

export interface ClinicAppointment {
    id: string;
    patientName: string;
    patientId: string;
    date?: string | null;
    time: string;
    type: string;
    status: string;
    doctorName: string;
}

export interface ClinicDoctor {
    id: string;
    name: string;
    specialization: string;
    status: 'active' | 'on-leave';
}

function normalizeClinicAppointment(raw: Record<string, any>): ClinicAppointment {
    return {
        ...raw,
        patientName: raw.patientName || raw.patient?.name || 'Patient',
        patientId: raw.patientId || raw.patient_id || raw.patient?.id || '',
        time: raw.time || raw.time_slot || '',
        type: raw.type || 'Scheduled',
        status: raw.status || 'pending',
        doctorName: raw.doctorName || raw.doctor?.name || 'Doctor',
        date: raw.date || raw.appointment_date || null,
    } as ClinicAppointment & { date?: string | null };
}

interface ClinicState {
    stats: ClinicDashboardStats | null;
    todaysAppointments: ClinicAppointment[];
    appointments: ClinicAppointment[];
    doctors: ClinicDoctor[];
    /** Alias for doctors — used by clinic/staff/page.tsx */
    staff: ClinicDoctor[];
    schedule: Record<string, unknown> | null;
    isLoading: boolean;
    loadingDashboard: boolean;
    loadingAppointments: boolean;
    loadingDoctors: boolean;
    loadingSchedule: boolean;
    error: string | null;

    fetchDashboardData: () => Promise<void>;
    fetchAppointments: (date?: string) => Promise<void>;
    fetchDoctors: () => Promise<void>;
    fetchSchedule: () => Promise<void>;
    updateSchedule: (schedule: Record<string, unknown>) => Promise<boolean>;
    addDoctor: (data: Record<string, string>) => Promise<boolean>;
    removeDoctor: (doctorId: string) => Promise<boolean>;
    clearError: () => void;
    reset: () => void;
}

// ==================== Store ====================

const clinicInitialState = {
    stats: null as ClinicDashboardStats | null,
    todaysAppointments: [] as ClinicAppointment[],
    appointments: [] as ClinicAppointment[],
    doctors: [] as ClinicDoctor[],
    staff: [] as ClinicDoctor[],
    schedule: null as Record<string, unknown> | null,
    isLoading: false,
    loadingDashboard: false,
    loadingAppointments: false,
    loadingDoctors: false,
    loadingSchedule: false,
    error: null as string | null,
};

export const useClinicStore = create<ClinicState>((set, get) => ({
    ...clinicInitialState,

    clearError: () => set({ error: null }),
    reset: () => set({ ...clinicInitialState }),

    fetchDashboardData: async () => {
        set({ loadingDashboard: true, isLoading: true, error: null });
        try {
            const response = await clinicApi.getDashboard();
            if (!response.success) {
                set({
                    error: response.error || 'Failed to load clinic dashboard',
                    loadingDashboard: false,
                    isLoading: false,
                });
                return;
            }
            const data = response.data as Record<string, unknown>;
            const recentAppointments = ((data.recentAppointments || data.appointments || []) as Record<string, any>[]).map(normalizeClinicAppointment);
            const doctorsList = (data.staff || data.doctors || []) as ClinicDoctor[];
            set({
                stats: (data.stats as ClinicDashboardStats) || null,
                todaysAppointments: recentAppointments,
                doctors: doctorsList,
                staff: doctorsList,
                loadingDashboard: false,
                isLoading: false,
            });
        } catch (error) {
            console.error('Error fetching clinic dashboard:', error);
            set({
                error: 'Failed to connect to server. Please check your connection.',
                loadingDashboard: false,
                isLoading: false,
            });
        }
    },

    fetchAppointments: async (date?: string) => {
        set({ loadingAppointments: true, error: null });
        try {
            const response = await clinicApi.getAppointments(date);
            if (!response.success) {
                set({ error: response.error || 'Failed to load appointments', loadingAppointments: false });
                return;
            }
            // After fetchWithAuth unwrap, response.data IS the array
            const rawData = response.data;
            const appointments = (Array.isArray(rawData) ? rawData : (rawData as any)?.appointments || (rawData as any)?.data || []) as Record<string, any>[];
            set({
                appointments: appointments.map(normalizeClinicAppointment),
                loadingAppointments: false,
            });
        } catch (error) {
            console.error('Error fetching appointments:', error);
            set({ error: 'Failed to load appointments.', loadingAppointments: false });
        }
    },

    fetchDoctors: async () => {
        set({ loadingDoctors: true, error: null });
        try {
            const response = await clinicApi.getDoctors();
            if (!response.success) {
                set({ error: response.error || 'Failed to load doctors', loadingDoctors: false });
                return;
            }
            // After fetchWithAuth unwrap, response.data IS the array
            const rawData = response.data;
            const doctorsList = (Array.isArray(rawData) ? rawData : (rawData as any)?.doctors || (rawData as any)?.data || []) as ClinicDoctor[];
            set({
                doctors: doctorsList,
                staff: doctorsList,
                loadingDoctors: false,
            });
        } catch (error) {
            console.error('Error fetching doctors:', error);
            set({ error: 'Failed to load doctors.', loadingDoctors: false });
        }
    },

    fetchSchedule: async () => {
        set({ loadingSchedule: true, error: null });
        try {
            const response = await clinicApi.getSchedule();
            if (!response.success) {
                set({ error: response.error || 'Failed to load schedule', loadingSchedule: false });
                return;
            }
            const data = response.data as Record<string, unknown>;
            set({
                schedule: (data.schedule || data.data || data) as Record<string, unknown>,
                loadingSchedule: false,
            });
        } catch (error) {
            console.error('Error fetching schedule:', error);
            set({ error: 'Failed to load schedule.', loadingSchedule: false });
        }
    },

    updateSchedule: async (schedule) => {
        try {
            const response = await clinicApi.updateSchedule(schedule);
            if (response.success) {
                get().fetchSchedule();
                return true;
            }
            set({ error: response.error || 'Failed to update schedule' });
            return false;
        } catch (error) {
            console.error('Error updating schedule:', error);
            set({ error: 'Failed to update schedule.' });
            return false;
        }
    },

    addDoctor: async (data) => {
        try {
            const response = await clinicApi.addDoctor(data);
            if (response.success) {
                get().fetchDoctors();
                get().fetchDashboardData();
                return true;
            }
            set({ error: response.error || 'Failed to add doctor' });
            return false;
        } catch (error) {
            console.error('Error adding doctor:', error);
            set({ error: 'Failed to add doctor.' });
            return false;
        }
    },

    removeDoctor: async (doctorId) => {
        try {
            const response = await clinicApi.removeDoctor(doctorId);
            if (response.success) {
                get().fetchDoctors();
                get().fetchDashboardData();
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
