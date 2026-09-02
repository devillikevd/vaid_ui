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
    todayAppointments?: number;
    email?: string;
    phone?: string;
    profileImageUrl?: string;
    profile_image_url?: string;
    rating?: number;
    practice_type?: string;
    consultation_modes?: string[];
    is_approved?: boolean;
    sub_specialization?: string;
    experience_years?: number;
    upcomingAppointments?: number;
    completed_consultations?: number;
    total_consultations?: number;
    total_reviews?: number;
    joined_at?: string;
    consultation_fee?: number;
    video_consultation_fee?: number;
    available_days?: string[];
    available_hours?: string;
    qualifications?: string | string[];
    education?: string | string[];
    bio?: string;
    languages?: string[];
    registration_number?: string;
    [key: string]: any;
}

export interface HospitalAppointment {
    id: string;
    patientId?: string | null;
    patientName: string;
    patientPhone?: string;
    patientUhid?: string | null;
    patientGender?: string | null;
    patientDob?: string | null;
    patientBloodGroup?: string | null;
    doctorId?: string | null;
    doctorName: string;
    doctorSpecialization?: string;
    doctorDepartment?: string;
    doctorProfileImageUrl?: string;
    date?: string | null;
    time?: string | null;
    status: string;
    type?: string;
    fee?: number | null;
    reason?: string;
    symptoms?: string[] | string | null;
    notes?: string | null;
    checkedInAt?: string | null;
    createdAt?: string | null;
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

function normalizeHospitalAppointment(raw: Record<string, any>): HospitalAppointment {
    return {
        ...raw,
        id: raw.id || '',
        patientId: raw.patientId || raw.patient_id || raw.patient?.id || null,
        patientName: raw.patientName || raw.patient?.name || raw.patient_name || 'Patient',
        patientPhone: raw.patientPhone || raw.patient?.user?.phone || raw.patient?.phone || raw.patient_phone || '',
        patientUhid: raw.patientUhid || raw.patient?.uhid || (raw.patientId || raw.patient?.id ? `UHID-${(raw.patientId || raw.patient?.id).slice(0, 8).toUpperCase()}` : null),
        patientGender: raw.patientGender || raw.patient?.gender || raw.patient_gender || null,
        patientDob: raw.patientDob || raw.patient?.date_of_birth || null,
        patientBloodGroup: raw.patientBloodGroup || raw.patient?.blood_group || null,
        doctorId: raw.doctorId || raw.doctor_id || raw.doctor?.id || null,
        doctorName: raw.doctorName || raw.doctor?.name || 'Doctor',
        doctorSpecialization: raw.doctorSpecialization || raw.doctor?.specialization || '',
        doctorDepartment: raw.doctorDepartment || raw.department || raw.doctorSpecialization || 'General',
        doctorProfileImageUrl: raw.doctorProfileImageUrl || raw.doctor?.profile_image_url || '',
        date: raw.date || raw.appointment_date || null,
        time: raw.time || raw.time_slot || null,
        status: raw.status || 'scheduled',
        type: raw.type || 'hospital',
        fee: raw.fee ?? null,
        reason: raw.reason || raw.reason_for_visit || '',
        symptoms: raw.symptoms || null,
        notes: raw.notes || raw.patient_notes || null,
        checkedInAt: raw.checkedInAt || raw.checked_in_at || null,
        createdAt: raw.createdAt || raw.created_at || null,
    };
}

export interface HospitalConsultation {
    id: string;
    appointmentId?: string | null;
    patientId?: string | null;
    patientName: string;
    patientPhone?: string;
    patientUhid?: string | null;
    patientGender?: string | null;
    patientDob?: string | null;
    patientBloodGroup?: string | null;
    doctorId: string | null;
    doctorName: string;
    doctorSpecialization: string;
    doctorDepartment: string;
    doctorProfileImageUrl?: string | null;
    date?: string | null;
    scheduledTime?: string | null;
    startedAt?: string | null;
    endedAt?: string | null;
    durationMinutes?: number | null;
    status: string;
    type: string;
    chiefComplaint?: string | null;
    symptoms?: string[] | string | null;
    diagnosis?: string | null;
    diagnosisCodes?: string[] | string | null;
    notes?: string | null;
    advice?: string | null;
    followUpDate?: string | null;
    followUpNotes?: string | null;
    rating?: number | null;
    review?: string | null;
    createdAt?: string | null;
    appointment?: {
        id: string;
        appointment_date?: string | null;
        time_slot?: string | null;
        type?: string;
        fee?: number | null;
        reason?: string | null;
        symptoms?: string[] | string | null;
        notes?: string | null;
    } | null;
}

export function normalizeHospitalConsultation(raw: Record<string, any>): HospitalConsultation {
    const patient = raw.patient || {};
    const doctor = raw.doctor || {};
    const appointment = raw.appointment || {};

    const patientId = raw.patientId || raw.patient_id || patient.id || null;
    const uhid = raw.patientUhid || (patientId ? `UHID-${patientId.slice(0, 8).toUpperCase()}` : (raw.id ? `UHID-${raw.id.slice(0, 8).toUpperCase()}` : 'UHID-N/A'));

    return {
        id: raw.id || '',
        appointmentId: raw.appointmentId || raw.appointment_id || appointment.id || null,
        patientId,
        patientName: raw.patientName || patient.name || 'Patient',
        patientPhone: raw.patientPhone || patient.phone || patient.users?.phone || patient.user?.phone || '',
        patientUhid: uhid,
        patientGender: raw.patientGender || raw.patient_gender || patient.gender || null,
        patientDob: raw.patientDob || raw.patient_dob || patient.date_of_birth || null,
        patientBloodGroup: raw.patientBloodGroup || raw.patient_blood_group || patient.blood_group || null,
        doctorId: raw.doctorId || raw.doctor_id || doctor.id || null,
        doctorName: raw.doctorName || doctor.name || 'Doctor',
        doctorSpecialization: raw.doctorSpecialization || doctor.specialization || '',
        doctorDepartment: raw.doctorDepartment || doctor.department || 'General',
        doctorProfileImageUrl: raw.doctorProfileImageUrl || doctor.profile_image_url || null,
        date: raw.date || appointment.appointment_date || (raw.started_at ? raw.started_at.split('T')[0] : (raw.created_at ? raw.created_at.split('T')[0] : null)),
        scheduledTime: raw.scheduledTime || appointment.time_slot || null,
        startedAt: raw.startedAt || raw.started_at || null,
        endedAt: raw.endedAt || raw.ended_at || null,
        durationMinutes: raw.durationMinutes || raw.duration_minutes || null,
        status: raw.status || 'scheduled',
        type: raw.type || appointment.type || 'video',
        chiefComplaint: raw.chiefComplaint || raw.chief_complaint || appointment.reason || null,
        symptoms: raw.symptoms || appointment.symptoms || null,
        diagnosis: raw.diagnosis || null,
        diagnosisCodes: raw.diagnosisCodes || raw.diagnosis_codes || null,
        notes: raw.notes || appointment.notes || null,
        advice: raw.advice || null,
        followUpDate: raw.followUpDate || raw.follow_up_date || null,
        followUpNotes: raw.followUpNotes || raw.follow_up_notes || null,
        rating: raw.rating ?? null,
        review: raw.review || null,
        createdAt: raw.createdAt || raw.created_at || null,
        appointment: appointment.id ? {
            id: appointment.id,
            appointment_date: appointment.appointment_date || null,
            time_slot: appointment.time_slot || null,
            type: appointment.type || raw.type || 'video',
            fee: appointment.fee ?? null,
            reason: appointment.reason || null,
            symptoms: appointment.symptoms || null,
            notes: appointment.notes || null,
        } : null,
    };
}

interface HospitalState {
    stats: HospitalDashboardStats | null;
    departments: Department[];
    doctors: HospitalDoctor[];
    appointments: HospitalAppointment[];
    consultations: HospitalConsultation[];
    isLoading: boolean;
    loadingDashboard: boolean;
    loadingDepartments: boolean;
    loadingDoctors: boolean;
    loadingAppointments: boolean;
    loadingConsultations: boolean;
    error: string | null;
    doctorsPagination: { page: number; totalPages: number; total: number; hasMore: boolean };
    appointmentsPagination: { page: number; totalPages: number; total: number; hasMore: boolean };
    consultationsPagination: { page: number; totalPages: number; total: number; hasMore: boolean };
    invitesPagination: { page: number; totalPages: number; total: number; hasMore: boolean };
    joinRequestsPagination: { page: number; totalPages: number; total: number; hasMore: boolean };
    reviews: Review[];
    loadingReviews: boolean;
    invites: any[];
    joinRequests: any[];
    loadingInvites: boolean;
    loadingJoinRequests: boolean;
    appointmentKpis: any | null;
    loadingAppointmentKpis: boolean;
    consultationKpis: any | null;
    loadingConsultationKpis: boolean;
    consultationKpisError: string | null;

    fetchDashboardData: () => Promise<void>;
    fetchDepartments: () => Promise<void>;
    fetchDoctors: (page?: number, search?: string, limit?: number) => Promise<void>;
    fetchAppointments: (params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        date?: string;
        doctorId?: string;
        department?: string;
        fromDate?: string;
        toDate?: string;
    }) => Promise<void>;
    fetchAppointmentKpis: () => Promise<void>;
    fetchConsultations: (params?: {
        page?: number;
        limit?: number;
        search?: string;
        status?: string;
        doctorId?: string;
        department?: string;
        date?: string;
        fromDate?: string;
        toDate?: string;
        type?: string;
    }) => Promise<void>;
    fetchConsultationKpis: () => Promise<void>;
    updateAppointmentStatus: (appointmentId: string, status: string, reason?: string) => Promise<boolean>;
    rescheduleAppointment: (appointmentId: string, date: string, timeSlot: string) => Promise<boolean>;
    checkInAppointment: (appointmentId: string) => Promise<boolean>;
    fetchReviews: (page?: number) => Promise<void>;
    fetchInvites: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
    fetchJoinRequests: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
    cancelInvite: (inviteId: string) => Promise<boolean>;
    respondToJoinRequest: (requestId: string, decision: 'accept' | 'reject', message?: string) => Promise<boolean>;
    inviteDoctor: (data: Record<string, unknown>) => Promise<boolean>;
    removeDoctor: (doctorId: string) => Promise<boolean>;
    addDepartment: (data: Record<string, unknown>) => Promise<boolean>;
    updateDepartment: (departmentId: string, data: Record<string, unknown>) => Promise<boolean>;
    deleteDepartment: (departmentId: string) => Promise<boolean>;
    updateErWaitTime: (waitMinutes: number) => Promise<boolean>;
    clearError: () => void;
    reset: () => void;
}

// ==================== Store ====================

const hospitalInitialState = {
    stats: null as HospitalDashboardStats | null,
    departments: [] as Department[],
    doctors: [] as HospitalDoctor[],
    appointments: [] as HospitalAppointment[],
    consultations: [] as HospitalConsultation[],
    isLoading: false,
    loadingDashboard: false,
    loadingDepartments: false,
    loadingDoctors: false,
    loadingAppointments: false,
    loadingConsultations: false,
    error: null as string | null,
    doctorsPagination: { page: 1, totalPages: 1, total: 0, hasMore: false },
    appointmentsPagination: { page: 1, totalPages: 1, total: 0, hasMore: false },
    consultationsPagination: { page: 1, totalPages: 1, total: 0, hasMore: false },
    reviews: [] as Review[],
    loadingReviews: false,
    invites: [],
    joinRequests: [],
    loadingInvites: false,
    loadingJoinRequests: false,
    invitesPagination: { page: 1, totalPages: 1, total: 0, hasMore: false },
    joinRequestsPagination: { page: 1, totalPages: 1, total: 0, hasMore: false },
    appointmentKpis: null as any | null,
    loadingAppointmentKpis: false,
    consultationKpis: null as any | null,
    loadingConsultationKpis: false,
    consultationKpisError: null as string | null,
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

    fetchInvites: async (params = {}) => {
        set({ loadingInvites: true, error: null });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await hospitalApi.getInvites({ page, limit, status: params.status });
            if (response.success) {
                const responseData = response.data as any;
                set({ 
                    invites: responseData?.data || responseData || [],
                    invitesPagination: responseData?.pagination || defaultPagination 
                });
            } else {
                set({ error: response.error || 'Failed to load invites' });
            }
        } catch (error) {
            console.error('Error fetching invites:', error);
            set({ error: 'An unexpected error occurred while loading invites.' });
        } finally {
            set({ loadingInvites: false });
        }
    },

    fetchJoinRequests: async (params = {}) => {
        set({ loadingJoinRequests: true, error: null });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await hospitalApi.getJoinRequests({ page, limit, status: params.status });
            if (response.success) {
                const responseData = response.data as any;
                set({ 
                    joinRequests: responseData?.data || responseData || [],
                    joinRequestsPagination: responseData?.pagination || defaultPagination 
                });
            } else {
                set({ error: response.error || 'Failed to load join requests' });
            }
        } catch (error) {
            console.error('Error fetching join requests:', error);
            set({ error: 'An unexpected error occurred while loading join requests.' });
        } finally {
            set({ loadingJoinRequests: false });
        }
    },

    cancelInvite: async (inviteId) => {
        try {
            const response = await hospitalApi.cancelInvite(inviteId);
            if (response.success) {
                get().fetchInvites({ status: 'pending' });
                return true;
            }
            set({ error: response.error || 'Failed to cancel invite.' });
            return false;
        } catch (error) {
            console.error('Error cancelling invite:', error);
            set({ error: 'Failed to cancel invite.' });
            return false;
        }
    },

    respondToJoinRequest: async (requestId, decision, message) => {
        try {
            const response = await hospitalApi.respondToJoinRequest(requestId, decision, message);
            if (response.success) {
                await Promise.allSettled([
                    get().fetchJoinRequests({ status: 'pending' }),
                    get().fetchDoctors(),
                    get().fetchDashboardData(),
                ]);
                return true;
            }
            set({ error: response.error || `Failed to ${decision} join request.` });
            return false;
        } catch (error) {
            console.error(`Error responding to join request (${decision}):`, error);
            set({ error: `Failed to ${decision} join request.` });
            return false;
        }
    },

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
                // BUG-15 Fix: Normalize bedCapacity consistently
                // Backend may send: raw number, percentage string, or 'N beds' string
                bedCapacity: (() => {
                    const raw = rawStats.bedCapacity ?? rawStats.bed_capacity ?? rawStats.total_beds;
                    if (raw == null) return 'N/A';
                    if (typeof raw === 'string' && (raw.includes('beds') || raw.includes('%'))) return raw;
                    const num = Number(raw);
                    return isNaN(num) ? String(raw) : `${num} beds`;
                })(),
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
                doctorId: params.doctorId,
                department: params.department,
                fromDate: params.fromDate,
                toDate: params.toDate,
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
                error: null,
            });
        } catch (error) {
            console.error('Error fetching appointments:', error);
            set({ error: 'Failed to load appointments.', loadingAppointments: false, appointmentsPagination: { ...defaultPagination } });
        }
    },

    fetchAppointmentKpis: async () => {
        set({ loadingAppointmentKpis: true });
        try {
            const response = await hospitalApi.getAppointmentKpis();
            if (response.success) {
                set({ appointmentKpis: response.data ?? response, loadingAppointmentKpis: false });
            } else {
                set({ loadingAppointmentKpis: false });
            }
        } catch (error) {
            console.error('Error fetching appointment KPIs:', error);
            set({ loadingAppointmentKpis: false });
        }
    },

    fetchConsultations: async (params = {}) => {
        set({ loadingConsultations: true, error: null });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await hospitalApi.getConsultations({
                page,
                limit,
                search: params.search,
                status: params.status,
                doctorId: params.doctorId,
                department: params.department,
                date: params.date,
                fromDate: params.fromDate,
                toDate: params.toDate,
                type: params.type,
            });

            if (!response.success) {
                set({ error: response.error || 'Failed to load consultations', loadingConsultations: false });
                return;
            }

            const rawData = response.data;
            const consultations = (Array.isArray(rawData) ? rawData : (rawData as any)?.consultations || (rawData as any)?.data || []) as Record<string, any>[];
            const pagination = (response as any).pagination as Record<string, number> | undefined;

            set({
                consultations: consultations.map(normalizeHospitalConsultation),
                consultationsPagination: pagination ? {
                    page: pagination.page || page,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || consultations.length,
                    hasMore: (pagination.page || page) < (pagination.totalPages || 1),
                } : { ...defaultPagination, total: consultations.length },
                loadingConsultations: false,
                error: null,
            });
        } catch (error) {
            console.error('Error fetching consultations:', error);
            set({ error: 'Failed to load consultations.', loadingConsultations: false, consultationsPagination: { ...defaultPagination } });
        }
    },

    fetchConsultationKpis: async () => {
        set({ loadingConsultationKpis: true, consultationKpisError: null });
        try {
            const response = await hospitalApi.getConsultationKpis();
            if (response.success) {
                set({ consultationKpis: response.data ?? response, loadingConsultationKpis: false, consultationKpisError: null });
            } else {
                set({ loadingConsultationKpis: false, consultationKpisError: response.error || 'Failed to load KPI metrics' });
            }
        } catch (error) {
            console.error('Error fetching consultation KPIs:', error);
            set({ loadingConsultationKpis: false, consultationKpisError: 'Failed to load KPI metrics' });
        }
    },

    updateAppointmentStatus: async (appointmentId: string, status: string, reason?: string) => {
        try {
            const response = await hospitalApi.updateAppointmentStatus(appointmentId, status, reason);
            if (response.success) {
                get().fetchAppointmentKpis();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating appointment status:', error);
            return false;
        }
    },

    rescheduleAppointment: async (appointmentId: string, date: string, timeSlot: string) => {
        try {
            const response = await hospitalApi.rescheduleAppointment(appointmentId, date, timeSlot);
            if (response.success) {
                get().fetchAppointmentKpis();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error rescheduling appointment:', error);
            return false;
        }
    },

    checkInAppointment: async (appointmentId: string) => {
        try {
            const response = await hospitalApi.checkInAppointment(appointmentId);
            if (response.success) {
                get().fetchAppointmentKpis();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error checking in appointment:', error);
            return false;
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

    fetchReviews: async (page = 1) => {
        set({ loadingReviews: true, error: null });
        try {
            const response = await hospitalApi.getReviews(page);
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

    updateErWaitTime: async (waitMinutes: number) => {
        try {
            const response = await hospitalApi.updateErWaitTime(waitMinutes);
            if (response.success) {
                return true;
            }
            set({ error: response.error || 'Failed to update ER wait time' });
            return false;
        } catch (error) {
            console.error('Error updating ER wait time:', error);
            set({ error: 'Failed to update ER wait time.' });
            return false;
        }
    },
}));
