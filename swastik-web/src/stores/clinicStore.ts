import { create } from 'zustand';
import { clinicApi } from '../lib/api';

export interface PaginationState {
    page: number;
    totalPages: number;
    total: number;
    hasMore: boolean;
}

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
    patientPhone: string;
    date?: string | null;
    time: string;
    type: string;
    status: string;
    doctorName: string;
    doctorSpecialization: string;
    reason?: string | null;
    createdAt?: string | null;
}

export interface ClinicDoctor {
    id: string;
    doctorId: string;
    associationId?: string | null;
    name: string;
    specialization: string;
    email: string;
    phone: string;
    status: 'active' | 'on-leave' | 'inactive';
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

const defaultPagination: PaginationState = {
    page: 1,
    totalPages: 1,
    total: 0,
    hasMore: false,
};

function normalizeClinicDoctor(raw: Record<string, any>): ClinicDoctor {
    const doctor = (raw.doctor || raw) as Record<string, any>;
    const rawStatus = raw.status || doctor.status;
    const status: ClinicDoctor['status'] =
        raw.is_active === false || rawStatus === 'inactive'
            ? 'inactive'
            : rawStatus === 'on-leave' || rawStatus === 'on_leave' || doctor.is_available === false
                ? 'on-leave'
                : 'active';

    return {
        id: doctor.id || raw.doctorId || raw.doctor_id || raw.id || '',
        doctorId: doctor.id || raw.doctorId || raw.doctor_id || raw.id || '',
        associationId: raw.associationId || raw.association_id || raw.id || null,
        name: doctor.name || raw.name || 'Doctor',
        specialization: doctor.specialization || raw.specialization || '',
        email: doctor.email || raw.email || doctor.user?.email || '',
        phone: doctor.phone || raw.phone || doctor.user?.phone || '',
        status,
    };
}

function normalizeClinicAppointment(raw: Record<string, any>): ClinicAppointment {
    const patient = (raw.patient || {}) as Record<string, any>;
    const doctor = (raw.doctor || {}) as Record<string, any>;

    return {
        id: raw.id || '',
        patientName: raw.patientName || patient.name || 'Patient',
        patientId: raw.patientId || raw.patient_id || patient.id || '',
        patientPhone: raw.patientPhone || patient.phone || patient.user?.phone || '',
        time: raw.time || raw.time_slot || '',
        type: raw.type || 'clinic',
        status: raw.status || 'pending',
        doctorName: raw.doctorName || doctor.name || 'Doctor',
        doctorSpecialization: raw.doctorSpecialization || doctor.specialization || '',
        date: raw.date || raw.appointment_date || null,
        reason: raw.reason || null,
        createdAt: raw.createdAt || raw.created_at || null,
    };
}

interface ClinicState {
    stats: ClinicDashboardStats | null;
    todaysAppointments: ClinicAppointment[];
    appointments: ClinicAppointment[];
    appointmentsPagination: PaginationState;
    doctors: ClinicDoctor[];
    doctorsPagination: PaginationState;
    staff: ClinicDoctor[];
    schedule: Record<string, unknown> | null;
    isLoading: boolean;
    loadingDashboard: boolean;
    loadingAppointments: boolean;
    loadingDoctors: boolean;
    loadingSchedule: boolean;
    loadingReviews: boolean;
    error: string | null;
    reviews: Review[];

    fetchDashboardData: () => Promise<void>;
    fetchAppointments: (params?: { page?: number; limit?: number; search?: string; status?: string; date?: string }) => Promise<void>;
    fetchDoctors: (params?: { page?: number; limit?: number; search?: string }) => Promise<void>;
    fetchSchedule: () => Promise<void>;
    fetchReviews: (page?: number) => Promise<void>;
    updateSchedule: (schedule: Record<string, unknown>) => Promise<boolean>;
    addDoctor: (data: Record<string, string>) => Promise<boolean>;
    removeDoctor: (doctorId: string) => Promise<boolean>;
    clearError: () => void;
    reset: () => void;
}

const clinicInitialState = {
    stats: null as ClinicDashboardStats | null,
    todaysAppointments: [] as ClinicAppointment[],
    appointments: [] as ClinicAppointment[],
    appointmentsPagination: { ...defaultPagination },
    doctors: [] as ClinicDoctor[],
    doctorsPagination: { ...defaultPagination },
    staff: [] as ClinicDoctor[],
    schedule: null as Record<string, unknown> | null,
    isLoading: false,
    loadingDashboard: false,
    loadingAppointments: false,
    loadingDoctors: false,
    loadingSchedule: false,
    loadingReviews: false,
    error: null as string | null,
    reviews: [] as Review[],
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
            const rawStats = (data.stats || {}) as Record<string, unknown>;
            const recentAppointments = ((data.recentAppointments || data.appointments || []) as Record<string, any>[])
                .map(normalizeClinicAppointment);
            const todayListRaw = ((data.todayAppointments || data.todaysAppointments || recentAppointments) as Record<string, any>[]);
            const todaysAppointments = todayListRaw.map(normalizeClinicAppointment).filter((appointment) => {
                if (!appointment.date) return false;
                return new Date(appointment.date).toDateString() === new Date().toDateString();
            });
            const doctorsList = ((data.staff || data.doctors || []) as Record<string, any>[]).map(normalizeClinicDoctor);

            const normalizedStats: ClinicDashboardStats = {
                totalStaff: Number(rawStats.totalStaff || rawStats.totalDoctors || doctorsList.length || 0),
                todaysAppointments: Number(rawStats.todaysAppointments || rawStats.todayAppointments || todaysAppointments.length || 0),
                walkInsToday: Number(rawStats.walkInsToday || 0),
                repeatPatients: String(rawStats.repeatPatients || '0%'),
            };

            set({
                stats: normalizedStats,
                todaysAppointments,
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

    fetchAppointments: async (params = {}) => {
        set({ loadingAppointments: true, error: null });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await clinicApi.getAppointments({
                page,
                limit,
                search: params.search,
                status: params.status,
                date: params.date,
            });
            if (!response.success) {
                set({ error: response.error || 'Failed to load appointments', loadingAppointments: false });
                return;
            }

            const rawData = response.data;
            const appointments = (Array.isArray(rawData) ? rawData : (rawData as any)?.appointments || (rawData as any)?.data || []) as Record<string, any>[];
            const pagination = (response as any).pagination as Record<string, number> | undefined;

            set({
                appointments: appointments.map(normalizeClinicAppointment),
                appointmentsPagination: pagination ? {
                    page: pagination.page || page,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || appointments.length,
                    hasMore: (pagination.page || page) < (pagination.totalPages || 1),
                } : { ...defaultPagination, total: appointments.length },
                loadingAppointments: false,
            });
        } catch (error) {
            console.error('Error fetching appointments:', error);
            set({
                error: 'Failed to load appointments.',
                loadingAppointments: false,
                appointmentsPagination: { ...defaultPagination },
            });
        }
    },

    fetchDoctors: async (params = {}) => {
        set({ loadingDoctors: true, error: null });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await clinicApi.getDoctors({
                page,
                limit,
                search: params.search,
            });
            if (!response.success) {
                set({ error: response.error || 'Failed to load doctors', loadingDoctors: false });
                return;
            }

            const rawData = response.data;
            const doctorsList = (Array.isArray(rawData) ? rawData : (rawData as any)?.doctors || (rawData as any)?.data || [])
                .map((doctor: Record<string, any>) => normalizeClinicDoctor(doctor)) as ClinicDoctor[];
            const pagination = (response as any).pagination as Record<string, number> | undefined;

            set({
                doctors: doctorsList,
                staff: doctorsList,
                doctorsPagination: pagination ? {
                    page: pagination.page || page,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || doctorsList.length,
                    hasMore: (pagination.page || page) < (pagination.totalPages || 1),
                } : { ...defaultPagination, total: doctorsList.length },
                loadingDoctors: false,
            });
        } catch (error) {
            console.error('Error fetching doctors:', error);
            set({
                error: 'Failed to load doctors.',
                loadingDoctors: false,
                doctorsPagination: { ...defaultPagination },
            });
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
                await Promise.allSettled([
                    get().fetchDoctors(),
                    get().fetchDashboardData(),
                ]);
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
            const targetDoctorId = get().doctors.find((doctor) => doctor.id === doctorId)?.doctorId || doctorId;
            const response = await clinicApi.removeDoctor(targetDoctorId);
            if (response.success) {
                await Promise.allSettled([
                    get().fetchDoctors(),
                    get().fetchDashboardData(),
                ]);
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

    fetchReviews: async (page = 1) => {
        set({ loadingReviews: true, error: null });
        try {
            const response = await clinicApi.getReviews(page);
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
