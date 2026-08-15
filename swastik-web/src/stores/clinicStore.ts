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
    departments?: number;
    activeDoctors?: number;
    pendingInvites?: number;
    checkedInToday?: number;
    pendingAppointmentsToday?: number;
}

export interface Department {
    id: string;
    name: string;
    description?: string;
    head_doctor_id?: string;
    head_doctor_name?: string | null;
    head_doctor_specialization?: string | null;
    contact_extension?: string;
    is_active: boolean;
    created_at: string;
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
    checkedInAt?: string | null;
    checkedInBy?: string | null;
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
    is_approved?: boolean;
    verification?: 'verified' | 'pending';
    rating?: number | null;
    total_reviews?: number;
    experience_years?: number;
    consultation_fee?: number | null;
    profile_image_url?: string | null;
    joined_at?: string | null;
    is_available?: boolean;
    todayAppointments?: number;
}

export interface ClinicInvite {
    id: string;
    clinicId: string;
    doctorId: string;
    status: string;
    createdAt?: string | null;
    respondedAt?: string | null;
    expiresAt?: string | null;
    invitedByName?: string;
    doctor: {
        id: string;
        name: string;
        specialization: string;
        email: string;
        phone: string;
        profile_image_url?: string | null;
        is_approved: boolean;
    };
}

export interface ClinicPatient {
    id: string;
    name: string;
    phone: string;
    email: string;
    gender?: string | null;
    dateOfBirth?: string | null;
    profile_image_url?: string | null;
    totalVisits: number;
    lastVisit?: string | null;
    lastVisitDoctor?: string | null;
    nextAppointment?: {
        appointment_date: string;
        time_slot: string;
        status: string;
        doctorName: string;
    } | null;
    upcomingCount: number;
    lastStatus?: string | null;
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

export interface Consultation {
    id: string;
    status: string;
    type: string;
    created_at?: string | null;
    started_at: string | null;
    ended_at: string | null;
    diagnosis: string | null;
    notes: string | null;
    doctor: { id: string; name: string; specialization: string; profile_image_url: string | null };
    patient: { id: string; name: string; phone?: string };
    appointment: { id: string; appointment_date: string; time_slot: string; type: string } | null;
}

export interface ClinicAnalytics {
    totalAppointments: number;
    completedAppointments: number;
    cancelledAppointments: number;
    totalRevenue: number;
    appointmentTrend: { date: string; count: number }[];
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
        is_approved: raw.is_approved === true,
        verification: raw.verification || (raw.is_approved === true ? 'verified' : 'pending'),
        rating: raw.rating != null ? Number(raw.rating) : null,
        total_reviews: Number(raw.total_reviews || 0),
        experience_years: Number(raw.experience_years || 0),
        consultation_fee: raw.consultation_fee != null ? Number(raw.consultation_fee) : null,
        profile_image_url: raw.profile_image_url || doctor.profile_image_url || null,
        joined_at: raw.joined_at || null,
        is_available: raw.is_available !== false,
        todayAppointments: Number(raw.todayAppointments || 0),
    };
}

function normalizeClinicInvite(raw: Record<string, any>): ClinicInvite {
    const doctor = (raw.doctor || {}) as Record<string, any>;
    return {
        id: raw.id || '',
        clinicId: raw.clinicId || raw.clinic_id || '',
        doctorId: raw.doctorId || raw.doctor_id || doctor.id || '',
        status: raw.status || 'pending',
        createdAt: raw.createdAt || raw.created_at || null,
        respondedAt: raw.respondedAt || raw.responded_at || null,
        expiresAt: raw.expiresAt || raw.expires_at || null,
        invitedByName: raw.invitedByName || 'Clinic Owner',
        doctor: {
            id: doctor.id || '',
            name: doctor.name || 'Doctor',
            specialization: doctor.specialization || '',
            email: doctor.email || raw.email || '',
            phone: doctor.phone || raw.phone || '',
            profile_image_url: doctor.profile_image_url || null,
            is_approved: doctor.is_approved === true,
        },
    };
}

function normalizeClinicPatient(raw: Record<string, any>): ClinicPatient {
    const nextAppointment = raw.nextAppointment as Record<string, any> | null | undefined;
    return {
        id: raw.id || '',
        name: raw.name || 'Patient',
        phone: raw.phone || '',
        email: raw.email || '',
        gender: raw.gender || null,
        dateOfBirth: raw.dateOfBirth || raw.date_of_birth || null,
        profile_image_url: raw.profile_image_url || null,
        totalVisits: Number(raw.totalVisits || 0),
        lastVisit: raw.lastVisit || null,
        lastVisitDoctor: raw.lastVisitDoctor || null,
        nextAppointment: nextAppointment
            ? {
                appointment_date: nextAppointment.appointment_date,
                time_slot: nextAppointment.time_slot,
                status: nextAppointment.status,
                doctorName: nextAppointment.doctorName || '',
            }
            : null,
        upcomingCount: Number(raw.upcomingCount || 0),
        lastStatus: raw.lastStatus || null,
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
        checkedInAt: raw.checkedInAt || raw.checked_in_at || null,
        checkedInBy: raw.checkedInBy || raw.checked_in_by || null,
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
    loadingDepartments: boolean;
    loadingConsultations: boolean;
    loadingAnalytics: boolean;
    error: string | null;
    reviews: Review[];
    departments: Department[];
    consultations: Consultation[];
    consultationsPagination: PaginationState;
    analytics: ClinicAnalytics | null;
    invites: ClinicInvite[];
    invitesPagination: PaginationState;
    patients: ClinicPatient[];
    patientsPagination: PaginationState;
    loadingInvites: boolean;
    loadingPatients: boolean;

    fetchDashboardData: () => Promise<void>;
    fetchAppointments: (params?: { page?: number; limit?: number; search?: string; status?: string; date?: string }) => Promise<void>;
    fetchDoctors: (params?: { page?: number; limit?: number; search?: string }) => Promise<void>;
    fetchSchedule: () => Promise<void>;
    fetchReviews: (page?: number) => Promise<void>;
    updateSchedule: (schedule: Record<string, unknown>) => Promise<boolean>;
    addDoctor: (data: Record<string, string>) => Promise<boolean>;
    removeDoctor: (doctorId: string) => Promise<boolean>;
    fetchDepartments: () => Promise<void>;
    addDepartment: (data: Record<string, unknown>) => Promise<boolean>;
    updateDepartment: (departmentId: string, data: Record<string, unknown>) => Promise<boolean>;
    deleteDepartment: (departmentId: string) => Promise<boolean>;
    fetchConsultations: (params?: { page?: number; limit?: number; search?: string; status?: string }) => Promise<void>;
    fetchAnalytics: (period?: string) => Promise<void>;
    fetchInvites: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
    cancelInvite: (inviteId: string) => Promise<boolean>;
    fetchPatients: (params?: { page?: number; limit?: number; search?: string }) => Promise<void>;
    updateAppointmentStatus: (appointmentId: string, status: string, reason?: string) => Promise<boolean>;
    rescheduleAppointment: (appointmentId: string, date: string, timeSlot: string) => Promise<boolean>;
    checkInAppointment: (appointmentId: string) => Promise<boolean>;
    clearError: () => void;
    reset: () => void;
}

const mapDepartment = (raw: Record<string, any>): Department => ({
    id: raw.id || '',
    name: raw.name || '',
    description: raw.description || '',
    head_doctor_id: raw.head_doctor_id || raw.headDoctorId || undefined,
    head_doctor_name: raw.head_doctor_name || null,
    head_doctor_specialization: raw.head_doctor_specialization || null,
    contact_extension: raw.contact_extension || raw.contactExtension || '',
    is_active: raw.is_active !== false,
    created_at: raw.created_at || new Date().toISOString()
});

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
    loadingDepartments: false,
    loadingConsultations: false,
    loadingAnalytics: false,
    error: null as string | null,
    reviews: [] as Review[],
    departments: [] as Department[],
    consultations: [] as Consultation[],
    consultationsPagination: { ...defaultPagination },
    analytics: null as ClinicAnalytics | null,
    invites: [] as ClinicInvite[],
    invitesPagination: { ...defaultPagination },
    patients: [] as ClinicPatient[],
    patientsPagination: { ...defaultPagination },
    loadingInvites: false,
    loadingPatients: false,
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
                departments: Number(rawStats.departments || 0),
                activeDoctors: Number(rawStats.activeDoctors || rawStats.totalDoctors || 0),
                pendingInvites: Number(rawStats.pendingInvites || 0),
                checkedInToday: Number(rawStats.checkedInToday || 0),
                pendingAppointmentsToday: Number(rawStats.pendingAppointmentsToday || 0),
            };

            set({
                stats: normalizedStats,
                todaysAppointments,
                doctors: doctorsList,
                staff: doctorsList,
                departments: (((data.departments || []) as any[]) || []).map(mapDepartment),
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
            console.error('Error deleting doctor:', error);
            set({ error: 'Failed to delete doctor.' });
            return false;
        }
    },

    fetchDepartments: async () => {
        set({ loadingDepartments: true, error: null });
        try {
            const response = await clinicApi.getDepartments();
            if (response.success) {
                const rawData = response.data;
                const departments = (Array.isArray(rawData) ? rawData : (rawData as any)?.departments || (rawData as any)?.data || []) as Department[];
                set({
                    departments: departments.map(mapDepartment),
                    loadingDepartments: false,
                });
            } else {
                set({ error: response.error || 'Failed to load departments', loadingDepartments: false });
            }
        } catch (error) {
            console.error('Error fetching departments:', error);
            set({ error: 'Failed to connect to server.', loadingDepartments: false });
        }
    },

    addDepartment: async (data) => {
        try {
            const response = await clinicApi.addDepartment(data);
            if (response.success) {
                get().fetchDepartments();
                return true;
            }
            set({ error: response.error || 'Failed to add department' });
            return false;
        } catch (error) {
            set({ error: 'Network error while adding department' });
            return false;
        }
    },

    updateDepartment: async (departmentId, data) => {
        try {
            const response = await clinicApi.updateDepartment(departmentId, data);
            if (response.success) {
                get().fetchDepartments();
                return true;
            }
            set({ error: response.error || 'Failed to update department' });
            return false;
        } catch (error) {
            set({ error: 'Network error while updating department' });
            return false;
        }
    },

    deleteDepartment: async (departmentId) => {
        try {
            const response = await clinicApi.deleteDepartment(departmentId);
            if (response.success) {
                get().fetchDepartments();
                return true;
            }
            set({ error: response.error || 'Failed to delete department' });
            return false;
        } catch (error) {
            set({ error: 'Network error while deleting department' });
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

    fetchConsultations: async (params = {}) => {
        set({ loadingConsultations: true, error: null });
        try {
            const response = await clinicApi.getConsultations(params);
            if (!response.success) {
                set({ error: response.error || 'Failed to load consultations', loadingConsultations: false });
                return;
            }
            const rawData = response.data;
            const consultations = (Array.isArray(rawData) ? rawData : (rawData as any)?.consultations || (rawData as any)?.data || []) as Consultation[];
            const pagination = (rawData as any)?.pagination || {};
            set({
                consultations,
                consultationsPagination: {
                    page: pagination.page || params.page || 1,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || consultations.length,
                    hasMore: pagination.hasMore || false,
                },
                loadingConsultations: false,
            });
        } catch (error) {
            console.error('Error fetching consultations:', error);
            set({ error: 'Failed to load consultations.', loadingConsultations: false });
        }
    },

    fetchAnalytics: async (period = '30d') => {
        set({ loadingAnalytics: true, error: null });
        try {
            const response = await clinicApi.getAnalytics(period);
            if (!response.success) {
                set({ error: response.error || 'Failed to load analytics', loadingAnalytics: false });
                return;
            }
            set({ analytics: response.data as ClinicAnalytics, loadingAnalytics: false });
        } catch (error) {
            console.error('Error fetching analytics:', error);
            set({ error: 'Failed to load analytics.', loadingAnalytics: false });
        }
    },

    fetchInvites: async (params = {}) => {
        set({ loadingInvites: true, error: null });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await clinicApi.getInvites({ page, limit, status: params.status });
            if (!response.success) {
                set({ error: response.error || 'Failed to load invites', loadingInvites: false });
                return;
            }
            const rawData = response.data;
            const invites = (Array.isArray(rawData) ? rawData : (rawData as any)?.invites || (rawData as any)?.data || [])
                .map(normalizeClinicInvite) as ClinicInvite[];
            const pagination = (response as any).pagination as Record<string, number> | undefined;
            set({
                invites,
                invitesPagination: pagination ? {
                    page: pagination.page || page,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || invites.length,
                    hasMore: (pagination.page || page) < (pagination.totalPages || 1),
                } : { ...defaultPagination, total: invites.length },
                loadingInvites: false,
            });
        } catch (error) {
            console.error('Error fetching invites:', error);
            set({ error: 'Failed to load invites.', loadingInvites: false });
        }
    },

    cancelInvite: async (inviteId) => {
        try {
            const response = await clinicApi.cancelInvite(inviteId);
            if (response.success) {
                await Promise.allSettled([
                    get().fetchInvites({ status: 'pending' }),
                    get().fetchDashboardData(),
                ]);
                return true;
            }
            set({ error: response.error || 'Failed to cancel invite' });
            return false;
        } catch (error) {
            console.error('Error cancelling invite:', error);
            set({ error: 'Failed to cancel invite.' });
            return false;
        }
    },

    fetchPatients: async (params = {}) => {
        set({ loadingPatients: true, error: null });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await clinicApi.getPatients({ page, limit, search: params.search });
            if (!response.success) {
                set({ error: response.error || 'Failed to load patients', loadingPatients: false });
                return;
            }
            const rawData = response.data;
            const patients = (Array.isArray(rawData) ? rawData : (rawData as any)?.patients || (rawData as any)?.data || [])
                .map(normalizeClinicPatient) as ClinicPatient[];
            const pagination = (response as any).pagination as Record<string, number> | undefined;
            set({
                patients,
                patientsPagination: pagination ? {
                    page: pagination.page || page,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || patients.length,
                    hasMore: (pagination.page || page) < (pagination.totalPages || 1),
                } : { ...defaultPagination, total: patients.length },
                loadingPatients: false,
            });
        } catch (error) {
            console.error('Error fetching patients:', error);
            set({ error: 'Failed to load patients.', loadingPatients: false });
        }
    },

    updateAppointmentStatus: async (appointmentId, status, reason) => {
        try {
            const response = await clinicApi.updateAppointmentStatus(appointmentId, status, reason);
            if (response.success) {
                await Promise.allSettled([
                    get().fetchAppointments(),
                    get().fetchDashboardData(),
                ]);
                return true;
            }
            set({ error: response.error || 'Failed to update appointment' });
            return false;
        } catch (error) {
            console.error('Error updating appointment:', error);
            set({ error: 'Failed to update appointment.' });
            return false;
        }
    },

    rescheduleAppointment: async (appointmentId, date, timeSlot) => {
        try {
            const response = await clinicApi.rescheduleAppointment(appointmentId, date, timeSlot);
            if (response.success) {
                await Promise.allSettled([
                    get().fetchAppointments(),
                    get().fetchDashboardData(),
                ]);
                return true;
            }
            set({ error: response.error || 'Failed to reschedule appointment' });
            return false;
        } catch (error) {
            console.error('Error rescheduling appointment:', error);
            set({ error: 'Failed to reschedule appointment.' });
            return false;
        }
    },

    checkInAppointment: async (appointmentId) => {
        try {
            const response = await clinicApi.checkInAppointment(appointmentId);
            if (response.success) {
                await Promise.allSettled([
                    get().fetchAppointments(),
                    get().fetchDashboardData(),
                ]);
                return true;
            }
            set({ error: response.error || 'Failed to check in patient' });
            return false;
        } catch (error) {
            console.error('Error checking in appointment:', error);
            set({ error: 'Failed to check in patient.' });
            return false;
        }
    },
}));
