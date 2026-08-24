import { create } from 'zustand';
import { doctorApi, appointmentsApi, consultationsApi } from '../lib/api';

// ==================== Types ====================

export interface DoctorDashboardStats {
    totalPatientsToday: number;
    completedToday: number;
    earningsToday: number;
    totalPatients?: number;
    averageRating?: number;
    totalReviews?: number;
    verifiedReviews?: number;
    /** Legacy aliases for UI compatibility */
    todaysAppointments?: number;
    completed?: number;
    pending?: number;
    todaysEarnings?: number;
}

export interface Appointment {
    id: string;
    patientName: string;
    patientId: string;
    time: string;
    date?: string;
    appointment_date?: string;
    time_slot?: string;
    timeSlot?: string;
    type: string;
    source?: string;
    status: string;
    reason?: string;
    reason_for_visit?: string;
    symptoms?: string[];
    patient_notes?: string;
    doctor_notes?: string;
    diagnosis?: string;
    fee?: number;
    consultation_fee?: number;
    payment_status?: string;
    payment_reference?: string;
    notes?: string;
    consultation_id?: string;
    consultation_status?: string | null;
    consultation_room_id?: string | null;
    has_prescription?: boolean;
    severity_current?: number;
    severity_worst?: number;
    onset_type?: string;
    symptom_duration?: string;
    symptom_pattern?: string;
    known_allergies?: string[];
    current_medications?: string;
    medical_history?: string;
    voice_note_url?: string;
    voice_note_duration?: string;
    patient?: { id: string; name: string; phone?: string; date_of_birth?: string; gender?: string; blood_group?: string; weight?: number; height?: number };
    doctor?: { id: string; name: string; specialization?: string };
}

export interface Consultation {
    id: string;
    appointmentId: string;
    patientName: string;
    status: string;
    type?: string;
    startedAt?: string;
    endedAt?: string;
    created_at?: string;
    appointment?: {
        id?: string;
        appointment_date?: string;
        time_slot?: string;
        type?: string;
    };
}

export interface DoctorPatient {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    age?: number;
    gender?: string;
    bloodGroup?: string;
    profileImageUrl?: string;
    lastVisit?: string;
    totalVisits?: number;
    source?: 'direct' | 'vaididea' | 'mixed' | string;
    sourceLabel?: string;
    sources?: string[];
    lastVisitType?: string;
    lastVisitTypeLabel?: string;
    visitTypes?: string[];
}

export interface TimeSlot {
    id?: string;
    slot_date: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    isVideoEnabled?: boolean;
    isClinicEnabled?: boolean;
    is_video_enabled?: boolean;
    is_clinic_enabled?: boolean;
    slotDuration?: number;
    bufferTime?: number;
    consultationMode?: 'video' | 'in_person';
    organizationType?: 'clinic' | 'hospital' | null;
    organizationId?: string | null;
    organizationName?: string | null;
    departmentId?: string | null;
    departmentName?: string | null;
}

export interface DoctorOrganizationDepartment {
    id: string;
    name: string;
}

export interface DoctorOrganization {
    type: 'clinic' | 'hospital';
    organization_type: 'clinic' | 'hospital';
    id: string;
    name: string;
    image_url?: string | null;
    address?: string | null;
    city?: string | null;
    consultation_fee?: number | null;
    department?: string | null;
    designation?: string | null;
    departments: DoctorOrganizationDepartment[];
    schedule?: Record<string, unknown>;
}

export interface ScheduleConflict {
    id?: string;
    date: string;
    start_time: string;
    end_time: string;
    mode?: 'video' | 'in_person' | 'mixed';
    organization_type?: 'clinic' | 'hospital' | null;
    organization_id?: string | null;
    organization_name?: string | null;
}

export interface Prescription {
    id: string;
    patientName?: string;
    patientId?: string;
    consultationId?: string;
    appointmentId?: string | null;
    medications?: Record<string, unknown>[];
    diagnosis?: string;
    notes?: string;
    status?: string;
    followUpDate?: string;
    created_at?: string;
}

export interface PatientVitals {
    id: string;
    patientName?: string;
    patientId?: string;
    heartRate?: number;
    bloodPressure?: string;
    temperature?: number;
    oxygenSaturation?: number;
    oxygenLevel?: number;
    respiratoryRate?: number;
    bloodSugar?: number;
    weight?: number;
    notes?: string;
    recordedAt?: string;
    created_at?: string;
}

export interface DoctorReview {
    id: string;
    rating: number;
    title?: string;
    comment?: string;
    is_anonymous: boolean;
    is_verified?: boolean;
    created_at: string;
    consultation_id?: string;
    patient?: {
        name: string;
    };
}

export interface DoctorProfile {
    id: string;
    name: string;
    specialization?: string;
    experience_years?: number;
    qualifications?: string;
    bio?: string;
    consultation_fee?: number;
    video_consultation_fee?: number;
    profile_image_url?: string;
    registration_number?: string;
    license_number?: string;
    is_available?: boolean;
    is_approved?: boolean;
    approval_status?: string;
    approval_block_reason?: string;
    practice_setup_type?: string;
    onboarding_completed_at?: string;
    degree_certificate_url?: string;
    license_document_url?: string;
    government_id_url?: string;
    live_selfie_url?: string;
    hospital_id?: string;
    profile_completion_percentage?: number;
    intro_video_url?: string;
    rejected_documents?: string[];
    rejection_reason?: string;
    bank_penny_verified?: boolean;
    clinic_license_url?: string;
    compliance_documents?: Record<string, any>;
    rating?: number;
    total_reviews?: number;
    stats?: {
        totalPatients?: number;
        totalAppointments?: number;
        completedConsultations?: number;
        averageRating?: number;
        totalReviews?: number;
        verifiedReviews?: number;
    };
    user?: {
        email: string;
        phone: string;
        is_verified: boolean;
        created_at: string;
    };
}

export interface DoctorLeave {
    id: string;
    doctor_id?: string;
    scope?: 'global' | 'organization';
    organization_type?: 'clinic' | 'hospital' | null;
    organization_id?: string | null;
    organization_name?: string | null;
    leave_type?: 'full_day' | 'partial_day';
    start_date: string;
    end_date: string;
    start_time?: string | null;
    end_time?: string | null;
    reason?: string | null;
    status?: 'active' | 'cancelled';
    affected_appointments_count?: number;
    created_at?: string;
    updated_at?: string;
}

export interface ReviewMetrics {
    totalReviews: number;
    averageRating: number;
    verifiedReviews: number;
    distribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
    };
}

export interface DoctorState {
    stats: DoctorDashboardStats | null;
    doctorProfile: DoctorProfile | null;
    todaysAppointments: Appointment[];
    upcomingAppointments: Appointment[];
    appointments: Appointment[];
    consultations: Consultation[];
    patients: DoctorPatient[];
    schedule: TimeSlot[];
    blockedSlots: { date: string; time: string; }[];
    bookedSlots: { date: string; time: string; }[];
    prescriptions: Prescription[];
    vitals: PatientVitals[];
    reviews: DoctorReview[];
    reviewMetrics: ReviewMetrics | null;
    leaves: DoctorLeave[];
    organizations: DoctorOrganization[];
    organizationsError: boolean;
    isLoading: boolean;
    loadingDashboard: boolean;
    loadingAppointments: boolean;
    loadingConsultations: boolean;
    loadingPatients: boolean;
    loadingSchedule: boolean;
    loadingOrganizations: boolean;
    loadingPrescriptions: boolean;
    loadingVitals: boolean;
    loadingReviews: boolean;
    loadingLeaves: boolean;
    error: string | null;

    // Pagination state
    appointmentsPagination: { page: number; totalPages: number; total: number; hasMore: boolean };
    prescriptionsPagination: { page: number; totalPages: number; total: number; hasMore: boolean };
    vitalsPagination: { page: number; totalPages: number; total: number; hasMore: boolean };
    patientsPagination: { page: number; totalPages: number; total: number; hasMore: boolean };
    reviewsPagination: { page: number; totalPages: number; total: number; hasMore: boolean };

    clearError: () => void;
    reset: () => void;
    fetchDashboardData: () => Promise<void>;
    fetchDoctorProfile: () => Promise<void>;
    fetchAppointments: (status?: string, date?: string, page?: number) => Promise<void>;
    fetchConsultations: () => Promise<void>;
    fetchPatients: (page?: number, search?: string, limit?: number, filter?: string, sort?: string, source?: string, visitType?: string) => Promise<void>;
    fetchSchedule: () => Promise<void>;
    fetchOrganizations: () => Promise<void>;
    createSchedule: (data: Record<string, unknown>) => Promise<{ success: boolean; conflict?: ScheduleConflict[]; message?: string }>;
    updateScheduleById: (scheduleId: string, data: Record<string, unknown>) => Promise<boolean>;
    disableSchedule: (scheduleId: string) => Promise<{ success: boolean; message?: string; disabled?: boolean; deleted?: boolean }>;
    fetchPrescriptions: (page?: number) => Promise<void>;
    fetchVitals: (page?: number, patientId?: string) => Promise<void>;
    fetchReviews: (page?: number) => Promise<void>;
    fetchLeaves: () => Promise<void>;
    checkAffectedAppointments: (data: {
        start_date: string;
        end_date: string;
        scope?: 'global' | 'organization';
        organization_type?: 'clinic' | 'hospital';
        organization_id?: string;
        leave_type?: 'full_day' | 'partial_day';
        start_time?: string;
        end_time?: string;
    }) => Promise<{ affected_count: number; appointments: any[] } | null>;
    addLeave: (data: {
        start_date: string;
        end_date: string;
        reason?: string;
        scope?: 'global' | 'organization';
        organization_type?: 'clinic' | 'hospital';
        organization_id?: string;
        leave_type?: 'full_day' | 'partial_day';
        start_time?: string;
        end_time?: string;
    }) => Promise<{ success: boolean; error?: string; data?: any }>;
    cancelLeave: (id: string) => Promise<boolean>;
    deleteLeave: (id: string) => Promise<boolean>;
    loadMoreAppointments: (status?: string, date?: string) => Promise<void>;
    loadMorePrescriptions: () => Promise<void>;
    loadMoreVitals: (patientId?: string) => Promise<void>;
    loadMorePatients: () => Promise<void>;
    recordVitals: (patientId: string, data: Record<string, unknown>) => Promise<boolean>;
    updateSchedule: (slots: Record<string, unknown>[]) => Promise<boolean>;
    startConsultation: (appointmentId: string) => Promise<string | false>;
    endConsultation: (appointmentId: string, consultationId?: string) => Promise<boolean>;
    completeAppointment: (appointmentId: string, otp: string) => Promise<boolean>;
    resendOtp: (appointmentId: string) => Promise<boolean>;
    confirmAppointment: (appointmentId: string) => Promise<boolean>;
    checkInAppointment: (appointmentId: string) => Promise<boolean>;
    rescheduleAppointment: (appointmentId: string, date: string, timeSlot: string) => Promise<boolean>;
    cancelAppointment: (appointmentId: string, reason?: string) => Promise<boolean>;
    updateAvailability: (isAvailable: boolean) => Promise<boolean>;
    toggleSlotBlock: (date: string, timeSlot: string, action: 'block' | 'unblock') => Promise<boolean>;
}

// ==================== Store ====================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapAppointment(raw: any): Appointment {
    let rawTime = raw.time || raw.time_slot || raw.timeSlot || '';
    if (typeof rawTime === 'string' && rawTime.split(':').length === 3) {
        rawTime = rawTime.substring(0, 5); // Convert "10:30:00" to "10:30"
    }

    return {
        ...raw,
        patientName: raw.patientName || raw.patient?.name || 'Patient',
        patientId: raw.patientId || raw.patient_id || raw.patient?.id || '',
        time: rawTime,
        date: raw.date || raw.appointment_date || '',
        appointment_date: raw.appointment_date || raw.date || '',
        timeSlot: rawTime,
        type: raw.type || 'clinic',
        source: raw.source || (raw.type === 'home_visit' ? 'direct_walk_in' : undefined),
        status: raw.status || 'scheduled',
        fee: raw.fee ?? raw.consultation_fee ?? undefined,
        consultation_fee: raw.consultation_fee ?? raw.fee ?? undefined,
        payment_status: raw.payment_status || undefined,
        payment_reference: raw.payment_reference || undefined,
        doctor_notes: raw.doctor_notes || undefined,
        diagnosis: raw.diagnosis || undefined,
        patient: raw.patient || undefined,
        symptoms: raw.symptoms || undefined,
        reason: raw.reason || raw.reason_for_visit || (Array.isArray(raw.symptoms) ? raw.symptoms.join(', ') : raw.symptoms) || undefined,
    };
}

const DAY_INDEX_TO_NAME = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const DAY_SORT_ORDER: Record<string, number> = {
    Monday: 0,
    Tuesday: 1,
    Wednesday: 2,
    Thursday: 3,
    Friday: 4,
    Saturday: 5,
    Sunday: 6,
};

function normalizeTimeValue(value?: string | null) {
    if (!value) return '';
    const match = value.match(/^(\d{2}:\d{2})/);
    return match ? match[1] : value;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapDoctorPatient(raw: any): DoctorPatient {
    return {
        ...raw,
        id: raw.id || raw.patientId || '',
        name: raw.name || raw.patientName || 'Patient',
        email: raw.email || raw.user?.email || '',
        phone: raw.phone || raw.user?.phone || '',
        age: raw.age,
        gender: raw.gender,
        bloodGroup: raw.bloodGroup || raw.blood_group,
        profileImageUrl: raw.profileImageUrl || raw.profile_image_url,
        lastVisit: raw.lastVisit || raw.last_visit || '',
        totalVisits: raw.totalVisits || raw.total_visits || 0,
        source: raw.source || 'vaididea',
        sourceLabel: raw.sourceLabel || (raw.source === 'direct' ? 'Direct Practice' : 'Vaididea Platform'),
        sources: raw.sources || [],
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapTimeSlot(raw: any): TimeSlot {
    const normalizedDay = raw.slot_date || raw.slotDate || raw.date || '';
    const isVideo = raw.consultation_mode === 'video'
        || raw.is_video_enabled === true
        || raw.isVideoEnabled === true;
    const isClinic = raw.consultation_mode === 'in_person'
        || raw.is_clinic_enabled === true
        || raw.isClinicEnabled === true;

    const mode: 'video' | 'in_person' = isClinic && !isVideo ? 'in_person' : 'video';

    return {
        id: raw.id,
        slot_date: normalizedDay,
        startTime: normalizeTimeValue(raw.startTime || raw.start_time),
        endTime: normalizeTimeValue(raw.endTime || raw.end_time),
        isAvailable: raw.isAvailable ?? raw.is_active ?? raw.isActive ?? true,
        isVideoEnabled: raw.is_video_enabled ?? raw.isVideoEnabled,
        isClinicEnabled: raw.is_clinic_enabled ?? raw.isClinicEnabled,
        slotDuration: raw.slot_duration ?? raw.slotDuration,
        bufferTime: raw.buffer_time ?? raw.bufferTime,
        consultationMode: raw.consultation_mode || mode,
        organizationType: raw.organization_type || null,
        organizationId: raw.organization_id || null,
        organizationName: raw.organization_name || null,
        departmentId: raw.department_id || null,
        departmentName: raw.department_name || null,
    };
}

const defaultPagination = { page: 1, totalPages: 1, total: 0, hasMore: false };

const doctorInitialState = {
    error: null as string | null,
    stats: null as DoctorDashboardStats | null,
    doctorProfile: null as DoctorProfile | null,
    todaysAppointments: [] as Appointment[],
    upcomingAppointments: [] as Appointment[],
    appointments: [] as Appointment[],
    consultations: [] as Consultation[],
    patients: [] as DoctorPatient[],
    schedule: [] as TimeSlot[],
    blockedSlots: [] as { date: string; time: string; }[],
    bookedSlots: [] as { date: string; time: string; }[],
    prescriptions: [] as Prescription[],
    vitals: [] as PatientVitals[],
    reviews: [] as DoctorReview[],
    reviewMetrics: null as ReviewMetrics | null,
    leaves: [] as DoctorLeave[],
    organizations: [] as DoctorOrganization[],
    organizationsError: false,
    isLoading: false,
    loadingDashboard: false,
    loadingAppointments: false,
    loadingConsultations: false,
    loadingPatients: false,
    loadingSchedule: false,
    loadingOrganizations: false,
    loadingPrescriptions: false,
    loadingVitals: false,
    loadingReviews: false,
    loadingLeaves: false,
    appointmentsPagination: { ...defaultPagination },
    prescriptionsPagination: { ...defaultPagination },
    vitalsPagination: { ...defaultPagination },
    patientsPagination: { ...defaultPagination },
    reviewsPagination: { ...defaultPagination },
};

let latestAppointmentRequestId = 0;

export const useDoctorStore = create<DoctorState>((set, get) => ({
    ...doctorInitialState,

    clearError: () => set({ error: null }),
    reset: () => set({ ...doctorInitialState }),

    fetchDashboardData: async () => {
        set({ loadingDashboard: true, isLoading: true, error: null });
        try {
            const response = await doctorApi.getDashboard();
            if (!response.success) {
                set({
                    error: response.error || 'Failed to load dashboard',
                    loadingDashboard: false,
                    isLoading: false,
                });
                return;
            }
            const data = response.data as Record<string, unknown>;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawToday = ((data.todayAppointments || data.todaysAppointments) as any[]) || [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const rawUpcoming = (data.upcomingAppointments as any[]) || [];
            set({
                stats: (data.stats as DoctorDashboardStats) || null,
                todaysAppointments: rawToday.map(mapAppointment),
                upcomingAppointments: rawUpcoming.map(mapAppointment),
                loadingDashboard: false,
                isLoading: false,
            });
            // Fetch profile separately so stats are independent
            get().fetchDoctorProfile();
        } catch (error) {
            console.error('Error fetching doctor dashboard:', error);
            set({
                error: 'Failed to connect to server. Please check your connection.',
                loadingDashboard: false,
                isLoading: false,
            });
        }
    },

    fetchDoctorProfile: async () => {
        try {
            const response = await doctorApi.getProfile();
            if (response.success) {
                set({ doctorProfile: response.data as DoctorProfile });
            }
        } catch (error: any) {
            console.error('Failed to fetch doctor profile', error);
        }
    },

    fetchLeaves: async () => {
        set({ loadingLeaves: true, error: null });
        try {
            const response = await doctorApi.getLeaves();
            if (response.success) {
                set({ leaves: (response.data as DoctorLeave[]) || [], loadingLeaves: false });
            } else {
                set({ error: response.error || 'Failed to load leaves', loadingLeaves: false });
            }
        } catch (error) {
            console.error('Error fetching leaves:', error);
            set({ error: 'Failed to connect to server.', loadingLeaves: false });
        }
    },

    checkAffectedAppointments: async (data) => {
        try {
            const response = await doctorApi.checkAffectedAppointments(data);
            if (response.success && response.data) {
                return response.data as { affected_count: number; appointments: any[] };
            }
            return null;
        } catch (error) {
            console.error('Error checking affected appointments:', error);
            return null;
        }
    },

    addLeave: async (data) => {
        try {
            const response = await doctorApi.addLeave(data);
            if (response.success) {
                get().fetchLeaves();
                get().fetchSchedule();
                return { success: true, data: response.data };
            }
            return { success: false, error: response.error || 'Failed to add leave' };
        } catch (error: any) {
            console.error('Error adding leave:', error);
            return { success: false, error: error.message || 'Network error while adding leave.' };
        }
    },

    cancelLeave: async (id: string) => {
        try {
            const response = await doctorApi.cancelLeave(id);
            if (response.success) {
                await get().fetchLeaves();
                await get().fetchSchedule();
                return true;
            }
            set({ error: response.error || 'Failed to cancel leave' });
            return false;
        } catch (error) {
            console.error('Error cancelling leave:', error);
            set({ error: 'Network error while cancelling leave.' });
            return false;
        }
    },

    deleteLeave: async (id: string) => {
        return get().cancelLeave(id);
    },

    fetchAppointments: async (status?: string, date?: string, page: number = 1) => {
        const requestId = ++latestAppointmentRequestId;
        set({ loadingAppointments: true, isLoading: true, error: null });
        try {
            const response = await doctorApi.getAppointments(status, date, page);
            if (requestId !== latestAppointmentRequestId) return; // Stale response discarded

            if (!response.success) {
                set((state) => ({
                    error: state.appointments.length > 0 ? null : (response.error || 'Unable to load appointments'),
                    loadingAppointments: false,
                    isLoading: false,
                }));
                return;
            }
            // After fetchWithAuth unwrap, response.data IS the array;
            // pagination is preserved as response.pagination
             
            const rawData = response.data;
            const rawAppointments = (Array.isArray(rawData) ? rawData : (rawData as any)?.appointments || (rawData as any)?.data || []) as any[];
            const pagination = (response as any).pagination as Record<string, number> | undefined;
            const mapped = rawAppointments.map(mapAppointment);
            set({
                appointments: page === 1 ? mapped : [...get().appointments, ...mapped],
                appointmentsPagination: pagination ? {
                    page: pagination.page || page,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || mapped.length,
                    hasMore: (pagination.page || page) < (pagination.totalPages || 1),
                } : { page, totalPages: 1, total: mapped.length, hasMore: false },
                loadingAppointments: false,
                isLoading: false,
                error: null,
            });
        } catch (error) {
            if (requestId !== latestAppointmentRequestId) return;
            console.error('Error fetching appointments:', error);
            set({ error: 'Unable to load appointments. Please check your connection and try again.', loadingAppointments: false, isLoading: false });
        } finally {
            if (requestId === latestAppointmentRequestId) {
                set({ loadingAppointments: false, isLoading: false });
            }
        }
    },

    fetchConsultations: async () => {
        set({ loadingConsultations: true, error: null });
        try {
            const response = await consultationsApi.getAll();
            if (!response.success) {
                set({ error: response.error || 'Failed to load consultations', loadingConsultations: false });
                return;
            }
            // After fetchWithAuth unwrap, response.data IS the array
            const rawData = response.data;
            const consultationsList = Array.isArray(rawData) ? rawData : (rawData as any)?.consultations || (rawData as any)?.data || [];
            set({
                consultations: consultationsList as Consultation[],
                loadingConsultations: false,
            });
        } catch (error) {
            console.error('Error fetching consultations:', error);
            set({ error: 'Failed to load consultations.', loadingConsultations: false });
        }
    },

    fetchPatients: async (page: number = 1, search: string = '', limit: number = 20, filter: string = 'all', sort: string = 'recent', source: string = 'all', visitType: string = 'all') => {
        set({ loadingPatients: true, error: null });
        try {
            const response = await doctorApi.getPatients(page, search, limit, filter, sort, source, visitType);
            if (!response.success) {
                set({ error: response.error || 'Failed to load patients', loadingPatients: false });
                return;
            }
            // After fetchWithAuth unwrap, response.data IS the array;
            // pagination is preserved as response.pagination
            const rawData = response.data;
            const patients = ((Array.isArray(rawData) ? rawData : (rawData as any)?.patients || (rawData as any)?.data || []) as DoctorPatient[]).map(mapDoctorPatient);
            const pagination = (response as any).pagination as Record<string, number> | undefined;
            set({
                patients: page === 1 ? patients : [...get().patients, ...patients],
                patientsPagination: pagination ? {
                    page: pagination.page || page,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || patients.length,
                    hasMore: (pagination.page || page) < (pagination.totalPages || 1),
                } : { page, totalPages: 1, total: patients.length, hasMore: false },
                loadingPatients: false,
            });
        } catch (error) {
            console.error('Error fetching patients:', error);
            set({ error: 'Failed to load patients.', loadingPatients: false });
        }
    },

    fetchSchedule: async () => {
        set({ loadingSchedule: true, error: null });
        try {
            const result = await doctorApi.getSchedule();
            if (!result.success) {
                set({ error: result.error || 'Failed to load schedule', loadingSchedule: false });
                return;
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const apiData = (result.data as any)?.slots ?? result.data ?? [];
            const schedule = Array.isArray(apiData) ? apiData.map(mapTimeSlot).sort((a, b) => {
                const dateDelta = a.slot_date.localeCompare(b.slot_date);
                if (dateDelta !== 0) return dateDelta;
                return a.startTime.localeCompare(b.startTime);
            }) : [];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const blockedSlots = ((result as any).blocked || []) as { date: string; time: string; }[];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const bookedSlots = ((result as any).booked || []) as { date: string; time: string; }[];
            set({ schedule, blockedSlots, bookedSlots, loadingSchedule: false });
        } catch (error) {
            console.error('Error fetching schedule:', error);
            set({ error: 'Failed to load schedule.', loadingSchedule: false });
        }
    },

    fetchOrganizations: async () => {
        set({ loadingOrganizations: true, organizationsError: false });
        try {
            const result = await doctorApi.getMyOrganizations();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const raw = (result.data as any) ?? [];
            const organizations = Array.isArray(raw) ? raw as DoctorOrganization[] : [];
            set({ organizations, loadingOrganizations: false, organizationsError: false });
        } catch (error) {
            console.error('Error fetching organizations:', error);
            set({ loadingOrganizations: false, organizationsError: true });
        }
    },

    createSchedule: async (data) => {
        try {
            const response = await doctorApi.createSchedule(data);
            if (response.success) {
                await get().fetchSchedule();
                return { success: true };
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const conflicts = (response as any)?.details?.conflicts as ScheduleConflict[] | undefined;
            if (conflicts && conflicts.length > 0) {
                return { success: false, conflict: conflicts, message: response.error };
            }
            set({ error: response.error || 'Failed to create schedule' });
            return { success: false, message: response.error };
        } catch (error) {
            console.error('Error creating schedule:', error);
            set({ error: 'Failed to create schedule.' });
            return { success: false, message: 'Failed to create schedule.' };
        }
    },

    updateScheduleById: async (scheduleId, data) => {
        try {
            const response = await doctorApi.updateScheduleById(scheduleId, data);
            if (response.success) {
                await get().fetchSchedule();
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

    disableSchedule: async (scheduleId) => {
        try {
            const response = await doctorApi.disableSchedule(scheduleId);
            if (response.success) {
                await get().fetchSchedule();
                return { success: true, ...(response.data as object) };
            }
            set({ error: response.error || 'Failed to remove schedule' });
            return { success: false, message: response.error };
        } catch (error) {
            console.error('Error removing schedule:', error);
            set({ error: 'Failed to remove schedule.' });
            return { success: false, message: 'Failed to remove schedule.' };
        }
    },

    fetchPrescriptions: async (page = 1) => {
        set({ loadingPrescriptions: true, error: null });
        try {
            const response = await doctorApi.getPrescriptions(page);
            if (!response.success) {
                set({ error: response.error || 'Failed to load prescriptions', loadingPrescriptions: false });
                return;
            }
            // After fetchWithAuth unwrap, response.data IS the array;
            // pagination is preserved as response.pagination
            const rawData = response.data;
            const prescriptions = (Array.isArray(rawData) ? rawData : (rawData as any)?.prescriptions || (rawData as any)?.data || []) as Prescription[];
            const pagination = (response as any).pagination as Record<string, number> | undefined;
            set({
                prescriptions: page === 1 ? prescriptions : [...get().prescriptions, ...prescriptions],
                prescriptionsPagination: pagination ? {
                    page: pagination.page || page,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || prescriptions.length,
                    hasMore: (pagination.page || page) < (pagination.totalPages || 1),
                } : { page, totalPages: 1, total: prescriptions.length, hasMore: false },
                loadingPrescriptions: false,
            });
        } catch (error) {
            console.error('Error fetching prescriptions:', error);
            set({ error: 'Failed to load prescriptions.', loadingPrescriptions: false });
        }
    },

    fetchVitals: async (page = 1, patientId?: string) => {
        set({ loadingVitals: true, error: null });
        try {
            const response = await doctorApi.getPatientVitals(page, patientId);
            if (!response.success) {
                set({ error: response.error || 'Failed to load vitals', loadingVitals: false });
                return;
            }
            // After fetchWithAuth unwrap, response.data IS the array;
            // pagination is preserved as response.pagination
            const rawData = response.data;
            const vitals = (Array.isArray(rawData) ? rawData : (rawData as any)?.vitals || (rawData as any)?.data || []) as PatientVitals[];
            const pagination = (response as any).pagination as Record<string, number> | undefined;
            set({
                vitals: page === 1 ? vitals : [...get().vitals, ...vitals],
                vitalsPagination: pagination ? {
                    page: pagination.page || page,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || vitals.length,
                    hasMore: (pagination.page || page) < (pagination.totalPages || 1),
                } : { page, totalPages: 1, total: vitals.length, hasMore: false },
                loadingVitals: false,
            });
        } catch (error) {
            console.error('Error fetching vitals:', error);
            set({ error: 'Failed to load vitals.', loadingVitals: false });
        }
    },

    fetchReviews: async (page = 1) => {
        set({ loadingReviews: true, error: null });
        try {
            const response = await doctorApi.getReviews(page);
            if (!response.success) {
                set({ error: response.error || 'Failed to load reviews', loadingReviews: false });
                return;
            }
            const rawData = response.data;
            const reviews = (Array.isArray(rawData) ? rawData : (rawData as any)?.reviews || (rawData as any)?.data || []) as DoctorReview[];
            const metrics = (response as any).metrics as ReviewMetrics | undefined;
            const pagination = (response as any).pagination as Record<string, number> | undefined;
            set({
                reviews: page === 1 ? reviews : [...get().reviews, ...reviews],
                reviewMetrics: page === 1 && metrics ? metrics : (metrics || get().reviewMetrics),
                reviewsPagination: pagination ? {
                    page: pagination.page || page,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || reviews.length,
                    hasMore: (pagination.page || page) < (pagination.totalPages || 1),
                } : { page, totalPages: 1, total: reviews.length, hasMore: false },
                loadingReviews: false,
            });
        } catch (error) {
            console.error('Error fetching reviews:', error);
            set({ error: 'Failed to load reviews.', loadingReviews: false });
        }
    },

    // ==================== Load More Helpers ====================
    loadMoreAppointments: async (status?: string, date?: string) => {
        const { appointmentsPagination } = get();
        if (!appointmentsPagination.hasMore) return;
        await get().fetchAppointments(status, date, appointmentsPagination.page + 1);
    },

    loadMorePrescriptions: async () => {
        const { prescriptionsPagination } = get();
        if (!prescriptionsPagination.hasMore) return;
        await get().fetchPrescriptions(prescriptionsPagination.page + 1);
    },

    loadMoreVitals: async (patientId?: string) => {
        const { vitalsPagination } = get();
        if (!vitalsPagination.hasMore) return;
        await get().fetchVitals(vitalsPagination.page + 1, patientId);
    },

    loadMorePatients: async () => {
        const { patientsPagination } = get();
        if (!patientsPagination.hasMore) return;
        await get().fetchPatients(patientsPagination.page + 1);
    },

    recordVitals: async (patientId, data) => {
        try {
            const response = await doctorApi.recordPatientVitals(patientId, data);
            if (response.success) {
                get().fetchVitals();
                return true;
            }
            set({ error: response.error || 'Failed to record vitals' });
            return false;
        } catch (error) {
            console.error('Error recording vitals:', error);
            set({ error: 'Failed to record vitals.' });
            return false;
        }
    },

    updateSchedule: async (slots) => {
        try {
            const response = await doctorApi.updateSchedule(slots);
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

    toggleSlotBlock: async (date, timeSlot, action) => {
        try {
            const response = await doctorApi.toggleSlotBlock(date, timeSlot, action);
            if (response.success) {
                // Optimistically fetch again to reflect block state
                await get().fetchSchedule();
                return true;
            }
            set({ error: response.error || `Failed to ${action} slot` });
            return false;
        } catch (error) {
            console.error(`Error toggling slot block:`, error);
            set({ error: `Failed to ${action} slot.` });
            return false;
        }
    },

    startConsultation: async (appointmentId) => {
        try {
            const response = await consultationsApi.start(appointmentId);
            if (response.success) {
                const data = response.data as any;
                const consultationId = data?.id || data?.consultation?.id || data?.consultationId;
                if (!consultationId) {
                    // BUG-09 Fix: Log full response for debugging and show actionable error
                    console.error('startConsultation: No consultation ID in response:', JSON.stringify(data));
                    set({ error: 'Consultation started but could not get the room ID. The server response was unexpected — please refresh and check your consultations list.' });
                    return false;
                }
                get().fetchDashboardData();
                get().fetchAppointments('active');
                return consultationId;
            }
            set({ error: response.error || 'Failed to start consultation' });
            return false;
        } catch (error) {
            console.error('Error starting consultation:', error);
            set({ error: error instanceof Error ? error.message : 'Failed to start consultation.' });
            return false;
        }
    },

    endConsultation: async (appointmentId, consultationId) => {
        // Optimistic UI update: instantly mark as completed in UI
        set((state) => ({
            todaysAppointments: state.todaysAppointments.map(a => 
                a.id === appointmentId ? { ...a, status: 'completed' } : a
            ),
            consultations: state.consultations.map(c => 
                c.appointment?.id === appointmentId || c.id === consultationId ? { ...c, status: 'completed' } : c
            ),
            appointments: state.appointments.map(a => 
                a.id === appointmentId ? { ...a, status: 'completed' } : a
            )
        }));

        try {
            let success = false;
            if (consultationId) {
                const response = await consultationsApi.end(consultationId);
                success = response.success;
            } else {
                const response = await appointmentsApi.updateStatus(appointmentId, 'completed');
                success = response.success;
            }
            
            if (success) {
                get().fetchDashboardData();
                get().fetchConsultations();
                get().fetchAppointments('active');
                return true;
            }
            set({ error: 'Failed to end consultation' });
            return false;
        } catch (error) {
            console.error('Error ending consultation:', error);
            // Background re-sync
            get().fetchDashboardData();
            get().fetchConsultations();
            return false;
        }
    },

    completeAppointment: async (appointmentId, otp) => {
        try {
            const response = await appointmentsApi.updateStatus(appointmentId, 'completed', undefined, otp);
            if (response.success) {
                get().fetchAppointments();
                get().fetchDashboardData();
                return true;
            }
            set({ error: response.error || response.message || 'Failed to complete appointment' });
            return false;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to complete appointment';
            set({ error: message });
            return false;
        }
    },

    resendOtp: async (appointmentId) => {
        try {
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/appointments/${appointmentId}/resend-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            });
            const data = await response.json();
            if (data.success) {
                return true;
            }
            set({ error: data.error || data.message || 'Failed to resend OTP' });
            return false;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to resend OTP';
            set({ error: message });
            return false;
        }
    },

    confirmAppointment: async (appointmentId) => {
        try {
            const response = await appointmentsApi.updateStatus(appointmentId, 'confirmed');
            if (response.success) {
                get().fetchAppointments();
                get().fetchDashboardData();
                return true;
            }
            set({ error: response.error || 'Failed to confirm appointment' });
            return false;
        } catch (error) {
            console.error('Error confirming appointment:', error);
            return false;
        }
    },

    checkInAppointment: async (appointmentId) => {
        try {
            const response = await appointmentsApi.updateStatus(appointmentId, 'in_progress');
            if (response.success) {
                get().fetchAppointments();
                get().fetchDashboardData();
                return true;
            }
            set({ error: response.error || 'Failed to check in appointment' });
            return false;
        } catch (error) {
            console.error('Error checking in appointment:', error);
            return false;
        }
    },

    rescheduleAppointment: async (appointmentId, date, timeSlot) => {
        try {
            const response = await appointmentsApi.reschedule(appointmentId, date, timeSlot);
            if (response.success) {
                // Backend already preserves the existing status during reschedule
                // (scheduled stays scheduled, confirmed stays confirmed)
                // So no extra updateStatus call needed here
                await Promise.all([
                    get().fetchAppointments(),
                    get().fetchDashboardData(),
                ]);
                return true;
            }
            set({ error: response.error || 'Failed to reschedule appointment' });
            return false;
        } catch (error) {
            console.error('Error rescheduling appointment:', error);
            return false;
        }
    },

    cancelAppointment: async (appointmentId, reason) => {
        try {
            const response = await appointmentsApi.updateStatus(appointmentId, 'cancelled', reason);
            if (response.success) {
                get().fetchAppointments();
                get().fetchDashboardData();
                return true;
            }
            set({ error: response.error || 'Failed to cancel appointment' });
            return false;
        } catch (error) {
            console.error('Error cancelling appointment:', error);
            return false;
        }
    },

    updateAvailability: async (isAvailable) => {
        try {
            const response = await doctorApi.updateAvailability(isAvailable);
            if (!response.success) {
                set({ error: response.error || 'Failed to update availability' });
            }
            return response.success;
        } catch (error) {
            console.error('Error updating availability:', error);
            return false;
        }
    },
}));
