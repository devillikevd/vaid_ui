import { create } from 'zustand';
import { hospitalApi } from '../lib/api';

// ==================== Types ====================

export interface HospitalDashboardStats {
    totalDoctors: number;
    todayAppointments: number;
    totalAppointments: number;
    totalPatients: number;
    /** Legacy aliases for UI compatibility */
    departments?: number;
    todaysAppointments?: number;
    bedCapacity?: string;
}

export interface Department {
    id: string;
    name: string;
    doctors: number;
    appointments: number;
    head?: string;
    headDoctorId?: string | null;
    description?: string;
    status?: 'active' | 'inactive';
    doctorCount?: number;
}

export interface HospitalDoctor {
    id: string;
    associationId?: string;
    name: string;
    specialization: string;
    department: string;
    status: 'active' | 'on-leave' | 'inactive';
    appointmentsToday: number;
    email?: string;
    phone?: string;
    profileImageUrl?: string;
    rating?: number;
}

export interface HospitalAppointment {
    id: string;
    patientId?: string | null;
    patientName: string;
    patientPhone?: string;
    doctorId?: string | null;
    doctorName: string;
    doctorSpecialization?: string;
    doctorProfileImageUrl?: string;
    date?: string | null;
    time?: string | null;
    status: string;
    type?: string;
    fee?: number | null;
    reason?: string;
    createdAt?: string | null;
}

function normalizeHospitalAppointment(raw: Record<string, any>): HospitalAppointment {
    return {
        ...raw,
        id: raw.id || '',
        patientId: raw.patientId || raw.patient_id || raw.patient?.id || null,
        patientName: raw.patientName || raw.patient?.name || 'Patient',
        patientPhone: raw.patientPhone || raw.patient?.user?.phone || '',
        doctorId: raw.doctorId || raw.doctor_id || raw.doctor?.id || null,
        doctorName: raw.doctorName || raw.doctor?.name || 'Doctor',
        doctorSpecialization: raw.doctorSpecialization || raw.doctor?.specialization || '',
        doctorProfileImageUrl: raw.doctorProfileImageUrl || raw.doctor?.profile_image_url || '',
        date: raw.date || raw.appointment_date || null,
        time: raw.time || raw.time_slot || null,
        status: raw.status || 'scheduled',
        type: raw.type || 'hospital',
        fee: raw.fee ?? null,
        reason: raw.reason || '',
        createdAt: raw.createdAt || raw.created_at || null,
    };
}

interface HospitalState {
    stats: HospitalDashboardStats | null;
    departments: Department[];
    doctors: HospitalDoctor[];
    appointments: HospitalAppointment[];
    isLoading: boolean;
    loadingDashboard: boolean;
    loadingDepartments: boolean;
    loadingDoctors: boolean;
    loadingAppointments: boolean;
    error: string | null;
    doctorsPagination: { page: number; totalPages: number; total: number; hasMore: boolean };
    appointmentsPagination: { page: number; totalPages: number; total: number; hasMore: boolean };

    fetchDashboardData: () => Promise<void>;
    fetchDepartments: () => Promise<void>;
    fetchDoctors: (page?: number, search?: string, limit?: number) => Promise<void>;
    fetchAppointments: (params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        date?: string;
    }) => Promise<void>;
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
    appointments: [] as HospitalAppointment[],
    isLoading: false,
    loadingDashboard: false,
    loadingDepartments: false,
    loadingDoctors: false,
    loadingAppointments: false,
    error: null as string | null,
    doctorsPagination: { page: 1, totalPages: 1, total: 0, hasMore: false },
    appointmentsPagination: { page: 1, totalPages: 1, total: 0, hasMore: false },
};

const defaultPagination = { page: 1, totalPages: 1, total: 0, hasMore: false };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDepartment(raw: any): Department {
    return {
        ...raw,
        id: raw.id,
        name: raw.name || 'Department',
        head: raw.head || raw.headDoctor?.name || '',
        headDoctorId: raw.headDoctorId || raw.head_doctor_id || null,
        description: raw.description || '',
        status: raw.status || (raw.is_active === false ? 'inactive' : 'active'),
        doctors: Number(raw.doctors || raw.doctorCount || 0),
        doctorCount: Number(raw.doctorCount || raw.doctors || 0),
        appointments: Number(raw.appointments || 0),
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapHospitalDoctor(raw: any): HospitalDoctor {
    return {
        ...raw,
        id: raw.id || raw.doctor?.id || raw.doctor_id || '',
        associationId: raw.associationId || raw.id,
        name: raw.name || raw.doctor?.name || 'Doctor',
        specialization: raw.specialization || raw.doctor?.specialization || 'General Medicine',
        department: raw.department || 'Unassigned',
        status: raw.status || (raw.is_active === false ? 'inactive' : raw.doctor?.is_available === false ? 'on-leave' : 'active'),
        appointmentsToday: Number(raw.appointmentsToday || 0),
        email: raw.email || raw.doctor?.user?.email || '',
        phone: raw.phone || raw.doctor?.user?.phone || '',
        profileImageUrl: raw.profileImageUrl || raw.doctor?.profile_image_url || '',
        rating: Number(raw.rating || raw.doctor?.rating || 0),
    };
}

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
            // Dashboard endpoint uses spread: { success, stats, recentAppointments, departments }
            // When no `data` key exists, fetchWithAuth returns the whole body as response.data
            const data = response.data as Record<string, unknown>;
            // Also check if stats/departments came as siblings on response itself
            const resp = response as Record<string, unknown>;
            const departments = (((data.departments || resp.departments || []) as Department[]) || []).map(mapDepartment);
            const rawStats = ((data.stats || resp.stats || {}) as Record<string, unknown>);

            const normalizedStats: HospitalDashboardStats = {
                totalDoctors: Number(rawStats.totalDoctors || 0),
                totalAppointments: Number(rawStats.totalAppointments || 0),
                totalPatients: Number(rawStats.totalPatients || 0),
                // backend can send either todayAppointments or legacy todaysAppointments
                todayAppointments: Number(rawStats.todayAppointments || rawStats.todaysAppointments || 0),
                todaysAppointments: Number(rawStats.todaysAppointments || rawStats.todayAppointments || 0),
                // if backend omits departments count, derive from list length
                departments: Number(rawStats.departments || departments.length || 0),
                bedCapacity: (rawStats.bedCapacity as string)
                    || (rawStats.bed_capacity != null ? `${rawStats.bed_capacity} beds` : undefined),
            };

            set({
                stats: normalizedStats,
                departments,
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
                const rawData = response.data;
                const departments = (Array.isArray(rawData) ? rawData : (rawData as any)?.departments || (rawData as any)?.data || []) as Department[];
                set({
                    departments: departments.map(mapDepartment),
                    loadingDepartments: false,
                });
            } else {
                // Fallback to dashboard data
                const dashResponse = await hospitalApi.getDashboard();
                if (dashResponse.success) {
                    const dData = dashResponse.data as Record<string, unknown>;
                    const dResp = dashResponse as Record<string, unknown>;
                    set({
                        departments: ((dData.departments || dResp.departments || []) as Department[]).map(mapDepartment),
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

    fetchDoctors: async (page: number = 1, search: string = '', limit: number = 20) => {
        set({ loadingDoctors: true, error: null });
        try {
            const response = await hospitalApi.getDoctors(page, search, limit);
            if (!response.success) {
                set({ error: response.error || 'Failed to load doctors', loadingDoctors: false });
                return;
            }
            const rawData = response.data;
            const doctors = (Array.isArray(rawData) ? rawData : (rawData as any)?.doctors || (rawData as any)?.data || []) as HospitalDoctor[];
            const pagination = (response as any).pagination as Record<string, number> | undefined;
            set({
                doctors: doctors.map(mapHospitalDoctor),
                doctorsPagination: pagination ? {
                    page: pagination.page || page,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || doctors.length,
                    hasMore: (pagination.page || page) < (pagination.totalPages || 1),
                } : { ...defaultPagination, total: doctors.length },
                loadingDoctors: false,
            });
        } catch (error) {
            console.error('Error fetching doctors:', error);
            set({ error: 'Failed to load doctors.', loadingDoctors: false });
        }
    },

    fetchAppointments: async (params = {}) => {
        set({ loadingAppointments: true, error: null });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await hospitalApi.getAppointments({
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
                appointments: appointments.map(normalizeHospitalAppointment),
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
            set({ error: 'Failed to load appointments.', loadingAppointments: false, appointmentsPagination: { ...defaultPagination } });
        }
    },

    inviteDoctor: async (data) => {
        try {
            const response = await hospitalApi.inviteDoctor(data);
            if (response.success) {
                get().fetchDoctors();
                get().fetchDashboardData();
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
