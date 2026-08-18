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
    todaysRevenue?: number;
    todaysPatients?: number;
    pendingActions?: number;
}

export interface NeedsAttentionItem {
    id: string;
    severity: 'critical' | 'warning' | 'info';
    source: string;
    title: string;
    description: string;
    timestamp: string;
    actionUrl: string;
    actionLabel: string;
}

export interface ConnectedCareData {
    pharmacy: {
        totalOrders: number;
        pending: number;
        processing: number;
        ready: number;
        completed: number;
    };
    diagnostics: {
        totalBookings: number;
        pending: number;
        sampleCollected: number;
        processing: number;
        reportsReady: number;
        completed: number;
    };
    hospitals: {
        totalReferrals: number;
        pending: number;
        accepted: number;
        admitted: number;
        discharged: number;
    };
}

export interface TeamSnapshotMember {
    id: string;
    name: string;
    specialization: string;
    profileImageUrl: string | null;
    rating: number;
    totalReviews: number;
    todaysAppointments: number;
    completedToday: number;
    onLeaveToday: boolean;
}

export interface ReviewsSnapshotData {
    averageRating: number;
    totalReviews: number;
    unrespondedCount: number;
    recentReviews: Array<{
        id: string;
        patientName: string;
        rating: number;
        comment: string | null;
        createdAt: string;
        hasResponse: boolean;
    }>;
}

export interface TrendsData {
    appointmentsLast7Days: Array<{
        date: string;
        label: string;
        count: number;
        completed: number;
    }>;
    patientsLast7Days: Array<{
        date: string;
        label: string;
        count: number;
    }>;
}

export interface RecentActivityItem {
    id: string;
    type: string;
    title: string;
    description: string;
    timestamp: string;
    actionUrl: string;
    status: string;
}

export interface Department {
    id: string;
    name: string;
    description?: string;
    head_doctor_id?: string;
    head_doctor_name?: string | null;
    head_doctor_specialization?: string | null;
    head_doctor_profile_image_url?: string | null;
    contact_extension?: string;
    is_active: boolean;
    created_at: string;
    doctor_count?: number;
    today_appointments?: number;
    consultation_modes?: string[];
}

export interface DepartmentMeta {
    total: number;
    active: number;
    inactive: number;
    doctorsAssigned: number;
    todayAppointments: number;
}

export interface DepartmentDoctorMember {
    doctor_id: string;
    name: string;
    specialization: string;
    sub_specialization: string | null;
    profile_image_url: string | null;
    is_approved: boolean;
    verification: string;
    rating: number | null;
    total_reviews: number;
    experience_years: number;
    practice_type: string;
    consultation_modes: string[];
    affiliation: 'head' | 'member';
    is_head: boolean;
}

export interface DepartmentDetail extends Department {
    head_doctor: {
        doctor_id: string;
        name: string;
        specialization: string;
        profile_image_url: string | null;
        is_approved: boolean;
        verification: string;
    } | null;
    doctors: DepartmentDoctorMember[];
    schedule: { doctor_count: number };
    appointments: {
        today: number;
        upcoming: number;
        completed: number;
        cancelled: number;
    };
}

export interface ClinicAppointment {
    id: string;
    patientName: string;
    patientId: string;
    patientPhone: string;
    patientEmail?: string;
    patientGender?: string | null;
    patientAge?: number | null;
    patientProfileImage?: string | null;
    doctorId?: string;
    doctorName: string;
    doctorSpecialization: string;
    doctorProfileImage?: string | null;
    date?: string | null;
    time: string;
    type: string;
    status: string;
    reason?: string | null;
    symptoms?: string | null;
    notes?: string | null;
    fee?: number | null;
    paymentStatus?: string;
    paymentMethod?: string | null;
    checkedInAt?: string | null;
    checkedInBy?: string | null;
    statusHistory?: Array<{ from: string; to: string; by: string; at: string }>;
    createdAt?: string | null;
    updatedAt?: string | null;
}

export interface ClinicDoctor {
    id: string;
    doctorId: string;
    associationId?: string | null;
    name: string;
    specialization: string;
    sub_specialization?: string | null;
    qualifications?: string | null;
    education?: string | null;
    languages?: string[];
    bio?: string | null;
    registration_number?: string | null;
    email: string;
    phone: string;
    status: 'active' | 'on-leave' | 'inactive';
    is_approved?: boolean;
    verification?: 'verified' | 'pending';
    rating?: number | null;
    total_reviews?: number;
    total_consultations?: number;
    completed_consultations?: number;
    experience_years?: number;
    consultation_fee?: number | null;
    video_consultation_fee?: number | null;
    profile_image_url?: string | null;
    joined_at?: string | null;
    is_available?: boolean;
    todayAppointments?: number;
    upcomingAppointments?: number;
    practice_type?: string | null;
    consultation_modes?: string[] | null;
    department?: string | null;
    schedule?: any;
    available_days?: string[];
    available_hours?: string;
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
    practice_type?: string | null;
    consultation_modes?: string[] | null;
    schedule?: any | null;
    fee_amount?: number | null;
    payout_terms?: string | null;
    start_date?: string | null;
    counter_proposal?: string | null;
    preferred_days?: string[] | null;
    preferred_start_time?: string | null;
    preferred_end_time?: string | null;
    doctor: {
        id: string;
        name: string;
        specialization: string;
        email: string;
        phone: string;
        profile_image_url?: string | null;
        is_approved: boolean;
    };
    is_join_request?: boolean;
    message?: string;
    department?: string;
}

export interface ClinicPatient {
    id: string;
    clinic_id?: string | null;
    clinicId?: string | null;
    hospital_id?: string | null;
    hospitalId?: string | null;
    organization_id?: string | null;
    organization_type?: string | null;
    name: string;
    phone: string;
    email: string;
    gender?: string | null;
    dateOfBirth?: string | null;
    age?: number | null;
    profile_image_url?: string | null;
    totalVisits: number;
    completedVisits?: number;
    lastVisit?: string | null;
    lastVisitDoctor?: string | null;
    lastVisitType?: string | null;
    lastStatus?: string | null;
    nextAppointment?: {
        clinic_id?: string | null;
        appointment_date: string;
        time_slot: string;
        status: string;
        type?: string;
        doctorName: string;
        doctorSpecialization?: string;
    } | null;
    upcomingCount: number;
    doctorsSeenCount?: number;
    doctorsSeen?: string[];
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
    clinic_id?: string | null;
    clinicId?: string | null;
    hospital_id?: string | null;
    hospitalId?: string | null;
    organization_id?: string | null;
    organization_type?: string | null;
    status: string;
    type: string;
    created_at?: string | null;
    started_at: string | null;
    ended_at: string | null;
    durationMinutes?: number | null;
    room_id?: string | null;
    fee?: number | null;
    diagnosis: string | null;
    notes: string | null;
    doctor: {
        id: string;
        name: string;
        specialization: string;
        profile_image_url?: string | null;
    };
    patient: {
        id: string;
        name: string;
        phone?: string;
        email?: string;
        gender?: string | null;
        age?: number | null;
        date_of_birth?: string | null;
        profile_image_url?: string | null;
    };
    appointment?: {
        id: string;
        clinic_id?: string | null;
        clinicId?: string | null;
        hospital_id?: string | null;
        hospitalId?: string | null;
        organization_id?: string | null;
        organization_type?: string | null;
        date?: string | null;
        time: string;
        type: string;
        status?: string | null;
        reason?: string | null;
        symptoms?: string | null;
        fee?: number | null;
        paymentStatus?: string;
    } | null;
    hasPrescription?: boolean;
    prescriptionCount?: number;
    prescriptions?: any[];
}

export interface ConsultationMetrics {
    todayConsultations: number;
    inProgress: number;
    completed: number;
    videoConsultations: number;
    inPersonConsultations: number;
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
        message: raw.message || null,
        department: raw.department || null,
        practice_type: raw.practice_type || raw.practiceType || null,
        consultation_modes: raw.consultation_modes || raw.consultationModes || null,
        schedule: raw.schedule || null,
        fee_amount: raw.fee_amount || raw.feeAmount || null,
        payout_terms: raw.payout_terms || raw.payoutTerms || null,
        start_date: raw.start_date || raw.startDate || null,
        counter_proposal: raw.counter_proposal || raw.counterProposal || null,
        preferred_days: raw.preferred_days || raw.preferredDays || null,
        preferred_start_time: raw.preferred_start_time || raw.preferredStartTime || null,
        preferred_end_time: raw.preferred_end_time || raw.preferredEndTime || null,
        doctor: {
            id: doctor.id || raw.doctorId || raw.doctor_id || '',
            name: doctor.name || 'Doctor',
            specialization: doctor.specialization || raw.specialization || '',
            email: doctor.email || raw.email || '',
            phone: doctor.phone || raw.phone || '',
            profile_image_url: doctor.profile_image_url || null,
            is_approved: doctor.is_approved === true,
        },
        is_join_request: raw.is_join_request === true || raw.type === 'join_request',
    };
}

function normalizeClinicPatient(raw: Record<string, any>): ClinicPatient {
    const nextAppointment = raw.nextAppointment as Record<string, any> | null | undefined;
    return {
        id: raw.id || '',
        clinic_id: raw.clinic_id || raw.clinicId || (raw.appointment && (raw.appointment.clinic_id || raw.appointment.clinicId)) || null,
        hospital_id: raw.hospital_id || raw.hospitalId || (raw.appointment && (raw.appointment.hospital_id || raw.appointment.hospitalId)) || null,
        organization_id: raw.organization_id || raw.organizationId || null,
        organization_type: raw.organization_type || raw.organizationType || null,
        name: raw.name || 'Patient',
        phone: raw.phone || '',
        email: raw.email || '',
        gender: raw.gender || null,
        dateOfBirth: raw.dateOfBirth || raw.date_of_birth || null,
        age: raw.age ?? null,
        profile_image_url: raw.profile_image_url || null,
        totalVisits: Number(raw.totalVisits || 0),
        completedVisits: Number(raw.completedVisits || 0),
        lastVisit: raw.lastVisit || null,
        lastVisitDoctor: raw.lastVisitDoctor || null,
        lastVisitType: raw.lastVisitType || null,
        lastStatus: raw.lastStatus || null,
        nextAppointment: nextAppointment
            ? {
                clinic_id: nextAppointment.clinic_id || nextAppointment.clinicId || null,
                appointment_date: nextAppointment.appointment_date,
                time_slot: nextAppointment.time_slot,
                status: nextAppointment.status,
                type: nextAppointment.type || 'clinic',
                doctorName: nextAppointment.doctorName || '',
                doctorSpecialization: nextAppointment.doctorSpecialization || '',
            }
            : null,
        upcomingCount: Number(raw.upcomingCount || 0),
        doctorsSeenCount: Number(raw.doctorsSeenCount || 0),
        doctorsSeen: Array.isArray(raw.doctorsSeen) ? raw.doctorsSeen : [],
    };
}

function normalizeClinicConsultation(raw: Record<string, any>): Consultation {
    const doctor = (raw.doctor || {}) as Record<string, any>;
    const patient = (raw.patient || {}) as Record<string, any>;
    const appointment = raw.appointment as Record<string, any> | null | undefined;

    return {
        id: raw.id || '',
        clinic_id: raw.clinic_id || raw.clinicId || appointment?.clinic_id || appointment?.clinicId || null,
        hospital_id: raw.hospital_id || raw.hospitalId || appointment?.hospital_id || appointment?.hospitalId || null,
        organization_id: raw.organization_id || raw.organizationId || appointment?.organization_id || appointment?.organizationId || null,
        organization_type: raw.organization_type || raw.organizationType || appointment?.organization_type || appointment?.organizationType || (raw.clinic_id || appointment?.clinic_id ? 'clinic' : null),
        status: raw.status || 'scheduled',
        type: raw.type || appointment?.type || 'clinic',
        created_at: raw.created_at || raw.createdAt || null,
        started_at: raw.started_at || raw.startedAt || null,
        ended_at: raw.ended_at || raw.endedAt || null,
        durationMinutes: raw.durationMinutes ?? raw.duration_minutes ?? null,
        room_id: raw.room_id || raw.roomId || null,
        fee: raw.fee != null ? Number(raw.fee) : (appointment?.fee != null ? Number(appointment.fee) : null),
        diagnosis: raw.diagnosis || null,
        notes: raw.notes || null,
        doctor: {
            id: doctor.id || raw.doctor_id || raw.doctorId || '',
            name: doctor.name || 'Doctor',
            specialization: doctor.specialization || '',
            profile_image_url: doctor.profile_image_url || null,
        },
        patient: {
            id: patient.id || raw.patient_id || raw.patientId || '',
            name: patient.name || 'Patient',
            phone: patient.phone || '',
            email: patient.email || '',
            gender: patient.gender || null,
            age: patient.age ?? null,
            date_of_birth: patient.date_of_birth || patient.dateOfBirth || null,
            profile_image_url: patient.profile_image_url || null,
        },
        appointment: appointment ? {
            id: appointment.id || '',
            clinic_id: appointment.clinic_id || appointment.clinicId || null,
            hospital_id: appointment.hospital_id || appointment.hospitalId || null,
            organization_id: appointment.organization_id || appointment.organizationId || null,
            organization_type: appointment.organization_type || appointment.organizationType || null,
            date: appointment.date || appointment.appointment_date || null,
            time: appointment.time || appointment.time_slot || '',
            type: appointment.type || 'clinic',
            status: appointment.status || null,
            reason: appointment.reason || null,
            symptoms: appointment.symptoms || null,
            fee: appointment.fee != null ? Number(appointment.fee) : null,
            paymentStatus: appointment.paymentStatus || appointment.payment_status || 'pending',
        } : null,
        hasPrescription: raw.hasPrescription ?? (Array.isArray(raw.prescriptions) && raw.prescriptions.length > 0),
        prescriptionCount: raw.prescriptionCount ?? (Array.isArray(raw.prescriptions) ? raw.prescriptions.length : 0),
        prescriptions: Array.isArray(raw.prescriptions) ? raw.prescriptions : [],
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
        patientEmail: raw.patientEmail || patient.email || patient.user?.email || '',
        patientGender: raw.patientGender || patient.gender || null,
        patientAge: raw.patientAge ?? null,
        patientProfileImage: raw.patientProfileImage || patient.profile_image_url || null,
        doctorId: raw.doctorId || raw.doctor_id || doctor.id || '',
        doctorName: raw.doctorName || doctor.name || 'Doctor',
        doctorSpecialization: raw.doctorSpecialization || doctor.specialization || '',
        doctorProfileImage: raw.doctorProfileImage || doctor.profile_image_url || null,
        date: raw.date || raw.appointment_date || null,
        time: raw.time || raw.time_slot || '',
        type: raw.type || 'clinic',
        status: raw.status || 'scheduled',
        reason: raw.reason || null,
        symptoms: raw.symptoms || null,
        notes: raw.notes || null,
        fee: raw.fee != null ? Number(raw.fee) : null,
        paymentStatus: raw.paymentStatus || raw.payment_status || 'pending',
        paymentMethod: raw.paymentMethod || raw.payment_method || null,
        checkedInAt: raw.checkedInAt || raw.checked_in_at || null,
        checkedInBy: raw.checkedInBy || raw.checked_in_by || null,
        statusHistory: Array.isArray(raw.statusHistory || raw.status_history) ? (raw.statusHistory || raw.status_history) : [],
        createdAt: raw.createdAt || raw.created_at || null,
        updatedAt: raw.updatedAt || raw.updated_at || null,
    };
}

interface ClinicState {
    stats: ClinicDashboardStats | null;
    todaysAppointments: ClinicAppointment[];
    appointments: ClinicAppointment[];
    appointmentsPagination: PaginationState;
    appointmentMetrics: {
        todayAppointments: number;
        pendingConfirmation: number;
        checkedIn: number;
        completed: number;
        cancelledNoShow: number;
    };
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
    loadingDepartmentDetail: boolean;
    error: string | null;
    reviews: Review[];
    departments: Department[];
    departmentMeta: DepartmentMeta;
    departmentDetail: DepartmentDetail | null;
    consultations: Consultation[];
    consultationsPagination: PaginationState;
    consultationMetrics: ConsultationMetrics;
    analytics: ClinicAnalytics | null;
    invites: ClinicInvite[];
    joinRequests: ClinicInvite[];
    invitesPagination: PaginationState;
    joinRequestsPagination: PaginationState;
    patients: ClinicPatient[];
    patientsPagination: PaginationState;
    patientMetrics: {
        totalPatients: number;
        repeatPatients: number;
        newPatients: number;
        upcomingVisitsCount: number;
    };
    needsAttention: NeedsAttentionItem[];
    connectedCare: ConnectedCareData | null;
    teamSnapshot: TeamSnapshotMember[];
    reviewsSnapshot: ReviewsSnapshotData | null;
    trends: TrendsData | null;
    recentActivity: RecentActivityItem[];
    loadingInvites: boolean;
    loadingJoinRequests: boolean;
    loadingPatients: boolean;

    fetchDashboardData: () => Promise<void>;
    fetchAppointments: (params?: { page?: number; limit?: number; search?: string; status?: string; date?: string; dateRange?: string; doctorId?: string; type?: string }) => Promise<void>;
    fetchDoctors: (params?: { page?: number; limit?: number; search?: string }) => Promise<void>;
    fetchSchedule: () => Promise<void>;
    fetchReviews: (page?: number) => Promise<void>;
    updateSchedule: (schedule: Record<string, unknown>) => Promise<boolean>;
    addDoctor: (data: Record<string, any>) => Promise<boolean>;
    removeDoctor: (doctorId: string) => Promise<boolean>;
    fetchDepartments: () => Promise<void>;
    fetchDepartmentMeta: () => Promise<void>;
    fetchDepartmentDetail: (departmentId: string) => Promise<DepartmentDetail | null>;
    addDepartment: (data: Record<string, unknown>) => Promise<boolean>;
    updateDepartment: (departmentId: string, data: Record<string, unknown>) => Promise<boolean>;
    deleteDepartment: (departmentId: string) => Promise<boolean>;
    fetchConsultations: (params?: { page?: number; limit?: number; search?: string; status?: string; type?: string; date?: string; dateRange?: string; doctorId?: string }) => Promise<void>;
    fetchAnalytics: (period?: string) => Promise<void>;
    fetchInvites: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
    fetchJoinRequests: (params?: { page?: number; limit?: number; status?: string }) => Promise<void>;
    cancelInvite: (inviteId: string) => Promise<boolean>;
    respondToJoinRequest: (requestId: string, decision: 'accept' | 'reject', message?: string) => Promise<boolean>;
    fetchPatients: (params?: { page?: number; limit?: number; search?: string; filter?: string; doctorId?: string }) => Promise<void>;
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
    head_doctor_profile_image_url: raw.head_doctor_profile_image_url || null,
    contact_extension: raw.contact_extension || raw.contactExtension || '',
    is_active: raw.is_active !== false,
    created_at: raw.created_at || new Date().toISOString(),
    doctor_count: Number(raw.doctor_count || 0),
    today_appointments: Number(raw.today_appointments || 0),
    consultation_modes: Array.isArray(raw.consultation_modes) ? raw.consultation_modes : [],
});

const clinicInitialState = {
    stats: null as ClinicDashboardStats | null,
    todaysAppointments: [] as ClinicAppointment[],
    appointments: [] as ClinicAppointment[],
    appointmentsPagination: { ...defaultPagination },
    appointmentMetrics: {
        todayAppointments: 0,
        pendingConfirmation: 0,
        checkedIn: 0,
        completed: 0,
        cancelledNoShow: 0,
    },
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
    loadingDepartmentDetail: false,
    error: null as string | null,
    reviews: [] as Review[],
    departments: [] as Department[],
    departmentMeta: {
        total: 0,
        active: 0,
        inactive: 0,
        doctorsAssigned: 0,
        todayAppointments: 0,
    },
    departmentDetail: null as DepartmentDetail | null,
    consultations: [] as Consultation[],
    consultationsPagination: { ...defaultPagination },
    consultationMetrics: {
        todayConsultations: 0,
        inProgress: 0,
        completed: 0,
        videoConsultations: 0,
        inPersonConsultations: 0,
    },
    analytics: null as ClinicAnalytics | null,
    invites: [] as ClinicInvite[],
    joinRequests: [] as ClinicInvite[],
    invitesPagination: { ...defaultPagination },
    joinRequestsPagination: { ...defaultPagination },
    patients: [] as ClinicPatient[],
    patientsPagination: { ...defaultPagination },
    patientMetrics: {
        totalPatients: 0,
        repeatPatients: 0,
        newPatients: 0,
        upcomingVisitsCount: 0,
    },
    needsAttention: [] as NeedsAttentionItem[],
    connectedCare: null as ConnectedCareData | null,
    teamSnapshot: [] as TeamSnapshotMember[],
    reviewsSnapshot: null as ReviewsSnapshotData | null,
    trends: null as TrendsData | null,
    recentActivity: [] as RecentActivityItem[],
    loadingInvites: false,
    loadingJoinRequests: false,
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

            const data = ((response.data as Record<string, unknown>) || response || {}) as Record<string, unknown>;
            const rawStats = ((data.stats || response.stats || {}) as Record<string, unknown>);
            const recentAppointments = ((data.recentAppointments || response.recentAppointments || data.appointments || []) as Record<string, any>[])
                .map(normalizeClinicAppointment);
            const todayListRaw = ((data.todayAppointments || response.todayAppointments || data.todaysAppointments || response.todaysAppointments || recentAppointments) as Record<string, any>[]);
            const todaysAppointments = todayListRaw.map(normalizeClinicAppointment).filter((appointment) => {
                if (!appointment.date) return false;
                return new Date(appointment.date).toDateString() === new Date().toDateString();
            });
            const doctorsList = ((data.staff || response.staff || data.doctors || response.doctors || []) as Record<string, any>[]).map(normalizeClinicDoctor);
            const teamSnapshot = ((data.teamSnapshot || response.teamSnapshot || []) as TeamSnapshotMember[]);

            const activeDoctors = rawStats.activeDoctors != null
                ? Number(rawStats.activeDoctors)
                : (rawStats.totalDoctors != null
                    ? Number(rawStats.totalDoctors)
                    : (rawStats.totalStaff != null ? Number(rawStats.totalStaff) : (teamSnapshot.length > 0 ? teamSnapshot.length : doctorsList.length)));

            const totalStaff = rawStats.totalStaff != null
                ? Number(rawStats.totalStaff)
                : (rawStats.totalDoctors != null ? Number(rawStats.totalDoctors) : activeDoctors);

            const normalizedStats: ClinicDashboardStats = {
                totalStaff,
                todaysAppointments: Number(rawStats.todaysAppointments || rawStats.todayAppointments || todaysAppointments.length || 0),
                walkInsToday: Number(rawStats.walkInsToday || 0),
                repeatPatients: String(rawStats.repeatPatients || '0%'),
                departments: Number(rawStats.departments || 0),
                activeDoctors,
                pendingInvites: Number(rawStats.pendingInvites || (response.pendingInvites as number) || 0),
                checkedInToday: Number(rawStats.checkedInToday || (response.checkedInToday as number) || 0),
                pendingAppointmentsToday: Number(rawStats.pendingAppointmentsToday || (response.pendingAppointmentsToday as number) || 0),
                todaysRevenue: rawStats.todaysRevenue != null ? Number(rawStats.todaysRevenue) : undefined,
                todaysPatients: rawStats.todaysPatients != null ? Number(rawStats.todaysPatients) : undefined,
                pendingActions: rawStats.pendingActions != null ? Number(rawStats.pendingActions) : undefined,
            };

            set({
                stats: normalizedStats,
                todaysAppointments,
                doctors: doctorsList,
                staff: doctorsList,
                departments: ((((data.departments || response.departments || []) as any[]) || [])).map(mapDepartment),
                needsAttention: (data.needsAttention || response.needsAttention || []) as NeedsAttentionItem[],
                connectedCare: (data.connectedCare || response.connectedCare || null) as ConnectedCareData | null,
                teamSnapshot,
                reviewsSnapshot: (data.reviewsSnapshot || response.reviewsSnapshot || null) as ReviewsSnapshotData | null,
                trends: (data.trends || response.trends || null) as TrendsData | null,
                recentActivity: (data.recentActivity || response.recentActivity || []) as RecentActivityItem[],
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
                dateRange: params.dateRange,
                doctorId: params.doctorId,
                type: params.type,
            });
            if (!response.success) {
                set({ error: response.error || 'Failed to load appointments', loadingAppointments: false });
                return;
            }

            const rawData = response.data;
            const appointments = (Array.isArray(rawData) ? rawData : (rawData as any)?.appointments || (rawData as any)?.data || []) as Record<string, any>[];
            const pagination = (response as any).pagination as Record<string, number> | undefined;
            const metrics = (response as any).metrics as Record<string, number> | undefined;

            set({
                appointments: appointments.map(normalizeClinicAppointment),
                appointmentMetrics: metrics ? {
                    todayAppointments: Number(metrics.todayAppointments ?? 0),
                    pendingConfirmation: Number(metrics.pendingConfirmation ?? 0),
                    checkedIn: Number(metrics.checkedIn ?? 0),
                    completed: Number(metrics.completed ?? 0),
                    cancelledNoShow: Number(metrics.cancelledNoShow ?? 0),
                } : get().appointmentMetrics,
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
            if (!response.success) {
                set({ error: response.error || 'Failed to load departments', loadingDepartments: false });
                return;
            }
            const rawData = response.data;
            const departments = (Array.isArray(rawData) ? rawData : (rawData as any)?.departments || (rawData as any)?.data || []) as Department[];
            set({
                departments: departments.map(mapDepartment),
                loadingDepartments: false,
            });
        } catch (error) {
            console.error('Error fetching departments:', error);
            set({ error: 'Failed to connect to server.', loadingDepartments: false });
            return;
        }
        // Meta is a secondary summary; a failure here should not break the page.
        await get().fetchDepartmentMeta();
    },

    fetchDepartmentMeta: async () => {
        try {
            const response = await clinicApi.getDepartmentMeta();
            if (response.success) {
                const rawMeta = response.data as Record<string, any>;
                set({
                    departmentMeta: {
                        total: Number(rawMeta?.total || 0),
                        active: Number(rawMeta?.active || 0),
                        inactive: Number(rawMeta?.inactive || 0),
                        doctorsAssigned: Number(rawMeta?.doctorsAssigned || 0),
                        todayAppointments: Number(rawMeta?.todayAppointments || 0),
                    },
                });
            }
        } catch (error) {
            console.error('Error fetching department meta:', error);
        }
    },

    fetchDepartmentDetail: async (departmentId) => {
        set({ loadingDepartmentDetail: true, error: null });
        try {
            const response = await clinicApi.getDepartmentDetail(departmentId);
            if (response.success) {
                const raw = response.data as Record<string, any>;
                const detail: DepartmentDetail = {
                    ...mapDepartment(raw),
                    head_doctor: raw.head_doctor || null,
                    doctors: Array.isArray(raw.doctors) ? raw.doctors : [],
                    schedule: raw.schedule || { doctor_count: (Array.isArray(raw.doctors) ? raw.doctors : []).length },
                    appointments: raw.appointments || { today: 0, upcoming: 0, completed: 0, cancelled: 0 },
                };
                set({ departmentDetail: detail, loadingDepartmentDetail: false });
                return detail;
            }
            set({ error: response.error || 'Failed to load department', loadingDepartmentDetail: false });
            return null;
        } catch (error) {
            console.error('Error fetching department detail:', error);
            set({ error: 'Failed to connect to server.', loadingDepartmentDetail: false });
            return null;
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
        set({ loadingConsultations: true, error: null, consultations: [] });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await clinicApi.getConsultations({
                page,
                limit,
                search: params.search,
                status: params.status,
                type: params.type,
                date: params.date,
                dateRange: params.dateRange,
                doctorId: params.doctorId,
            });
            if (!response.success) {
                set({ error: response.error || 'Failed to load consultations', loadingConsultations: false });
                return;
            }
            const rawData = response.data;
            const rawConsultations = (Array.isArray(rawData) ? rawData : (rawData as any)?.consultations || (rawData as any)?.data || []) as Record<string, any>[];
            const consultations = rawConsultations.map(normalizeClinicConsultation);
            const pagination = (response as any).pagination as Record<string, number> | undefined;
            const metrics = (response as any).metrics as Record<string, number> | undefined;
            set({
                consultations,
                consultationMetrics: metrics ? {
                    todayConsultations: Number(metrics.todayConsultations ?? 0),
                    inProgress: Number(metrics.inProgress ?? 0),
                    completed: Number(metrics.completed ?? 0),
                    videoConsultations: Number(metrics.videoConsultations ?? 0),
                    inPersonConsultations: Number(metrics.inPersonConsultations ?? 0),
                } : get().consultationMetrics,
                consultationsPagination: pagination ? {
                    page: pagination.page || page,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || consultations.length,
                    hasMore: (pagination.page || page) < (pagination.totalPages || 1),
                } : { ...defaultPagination, total: consultations.length },
                loadingConsultations: false,
            });
        } catch (error) {
            console.error('Error fetching consultations:', error);
            set({
                error: 'Failed to load consultations.',
                loadingConsultations: false,
                consultationsPagination: { ...defaultPagination },
            });
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

    fetchJoinRequests: async (params = {}) => {
        set({ loadingJoinRequests: true, error: null });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await clinicApi.getJoinRequests({ page, limit, status: params.status });
            if (!response.success) {
                set({ error: response.error || 'Failed to load join requests', loadingJoinRequests: false });
                return;
            }
            const rawData = response.data;
            const joinRequests = (Array.isArray(rawData) ? rawData : (rawData as any)?.requests || (rawData as any)?.data || [])
                .map((r: any) => normalizeClinicInvite({ ...r, type: 'join_request' })) as ClinicInvite[];
            const pagination = (response as any).pagination as Record<string, number> | undefined;
            set({
                joinRequests,
                joinRequestsPagination: pagination ? {
                    page: pagination.page || page,
                    totalPages: pagination.totalPages || 1,
                    total: pagination.total || joinRequests.length,
                    hasMore: (pagination.page || page) < (pagination.totalPages || 1),
                } : { ...defaultPagination, total: joinRequests.length },
                loadingJoinRequests: false,
            });
        } catch (error) {
            console.error('Error fetching join requests:', error);
            set({ error: 'Failed to load join requests.', loadingJoinRequests: false });
        }
    },

    respondToJoinRequest: async (requestId, decision, message) => {
        try {
            const response = await clinicApi.respondToJoinRequest(requestId, decision, message);
            if (response.success) {
                await Promise.allSettled([
                    get().fetchJoinRequests({ status: 'pending' }),
                    get().fetchDoctors(),
                    get().fetchDashboardData(),
                ]);
                return true;
            }
            set({ error: response.error || `Failed to ${decision} join request` });
            return false;
        } catch (error) {
            console.error(`Error responding to join request:`, error);
            set({ error: `Failed to ${decision} join request.` });
            return false;
        }
    },

    fetchPatients: async (params = {}) => {
        set({ loadingPatients: true, error: null, patients: [] });
        try {
            const page = params.page ?? 1;
            const limit = params.limit ?? 20;
            const response = await clinicApi.getPatients({
                page,
                limit,
                search: params.search,
                filter: params.filter,
                doctorId: params.doctorId,
            });
            if (!response.success) {
                set({ error: response.error || 'Failed to load patients', loadingPatients: false });
                return;
            }
            const rawData = response.data;
            const patients = (Array.isArray(rawData) ? rawData : (rawData as any)?.patients || (rawData as any)?.data || [])
                .map(normalizeClinicPatient) as ClinicPatient[];
            const pagination = (response as any).pagination as Record<string, number> | undefined;
            const metrics = (response as any).metrics as Record<string, number> | undefined;
            set({
                patients,
                patientMetrics: metrics ? {
                    totalPatients: Number(metrics.totalPatients ?? patients.length),
                    repeatPatients: Number(metrics.repeatPatients ?? 0),
                    newPatients: Number(metrics.newPatients ?? 0),
                    upcomingVisitsCount: Number(metrics.upcomingVisitsCount ?? 0),
                } : get().patientMetrics,
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
