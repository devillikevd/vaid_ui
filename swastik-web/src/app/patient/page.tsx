'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    Calendar,
    Stethoscope,
    Clock,
    Video,
    Building2,
    CheckCircle2,
    AlertCircle,
    ChevronRight,
    ArrowRight,
    RefreshCw,
    Smartphone,
    QrCode,
    User,
    Mail,
    Phone,
    Shield,
    Edit3,
    FileText,
    Check,
    Loader2,
    Sparkles,
    Activity,
    Lock,
    Pill
} from 'lucide-react';
import { patientApi } from '@/lib/api';
import { useAuthStore, isPatientAuthenticated } from '@/stores/authStore';
import AppDownloadModal from '@/components/shared/AppDownloadModal';

interface AppointmentItem {
    id: string;
    appointment_number?: string;
    appointment_date?: string;
    date?: string;
    time_slot?: string;
    timeSlot?: string;
    type?: string;
    status?: string;
    fee?: number;
    consultation_fee?: number;
    payment_status?: string;
    reason?: string;
    doctor?: {
        id?: string;
        name?: string;
        specialization?: string;
        profile_image_url?: string;
    };
    clinic?: {
        name?: string;
        address?: string;
        city?: string;
    };
    hospital?: {
        name?: string;
        address?: string;
        city?: string;
    };
}

function formatDisplayDate(dateStr?: string): string {
    if (!dateStr) return 'Date Pending';
    const cleanDate = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = cleanDate.split('-');
    if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        if (!isNaN(d.getTime())) {
            return d.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
        }
    }
    return cleanDate;
}

function formatTimeSlot(timeSlot?: string): string {
    if (!timeSlot) return '';
    const parts = timeSlot.split('-');
    if (parts.length === 2) {
        return `${parts[0].trim().slice(0, 5)} - ${parts[1].trim().slice(0, 5)}`;
    }
    return timeSlot.slice(0, 5);
}

function isVideoJoinEligible(appt: AppointmentItem): { canJoin: boolean; reason?: string } {
    const status = (appt.status || '').toLowerCase();
    if (status === 'completed') return { canJoin: false, reason: 'Consultation completed' };
    if (status === 'cancelled' || status === 'rejected') return { canJoin: false, reason: 'Appointment cancelled' };
    if (appt.type !== 'video') return { canJoin: false };

    const dateVal = appt.appointment_date || appt.date;
    const timeVal = appt.time_slot || appt.timeSlot;
    if (!dateVal || !timeVal) return { canJoin: true };

    const cleanDate = dateVal.includes('T') ? dateVal.split('T')[0] : dateVal;
    const timeMatch = String(timeVal).match(/^(\d{1,2}):(\d{2})/);
    if (!timeMatch) return { canJoin: true };

    const hours = timeMatch[1].padStart(2, '0');
    const minutes = timeMatch[2];
    const istIsoStr = `${cleanDate}T${hours}:${minutes}:00+05:30`;
    const scheduledStartMs = Date.parse(istIsoStr);
    if (isNaN(scheduledStartMs)) return { canJoin: true };

    const nowMs = Date.now();
    const tenMinutesBeforeMs = scheduledStartMs - 10 * 60 * 1000;

    if (nowMs < tenMinutesBeforeMs) {
        const diffMins = Math.round((scheduledStartMs - nowMs) / (60 * 1000));
        const diffHours = Math.floor(diffMins / 60);
        const remainingMins = diffMins % 60;
        let timeDesc = `${diffMins} mins`;
        if (diffHours > 24) {
            const days = Math.floor(diffHours / 24);
            timeDesc = `${days} day${days > 1 ? 's' : ''}`;
        } else if (diffHours > 0) {
            timeDesc = `${diffHours}h ${remainingMins}m`;
        }
        return {
            canJoin: false,
            reason: `Available in ${timeDesc} (10 min before appointment)`
        };
    }

    return { canJoin: true };
}

export default function PatientPortalPage() {
    const { user, isAuthenticated } = useAuthStore();
    const isPatient = isPatientAuthenticated(user, isAuthenticated);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [profile, setProfile] = useState<any>(null);
    const [upcomingAppointments, setUpcomingAppointments] = useState<AppointmentItem[]>([]);
    const [pastAppointments, setPastAppointments] = useState<AppointmentItem[]>([]);
    const [prescriptions, setPrescriptions] = useState<any[]>([]);

    // Edit Profile Modal
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [editFormData, setEditFormData] = useState({
        name: '',
        phone: '',
        gender: '',
        bloodGroup: '',
        age: ''
    });
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // App Download Modal
    const [appModalOpen, setAppModalOpen] = useState(false);

    const loadPortalData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (isPatient) {
                const [profRes, apptsUpcomingRes, apptsPastRes, rxRes] = await Promise.allSettled([
                    patientApi.getProfile(),
                    patientApi.getAppointments({ status: 'upcoming', limit: 5 }),
                    patientApi.getAppointments({ status: 'completed', limit: 5 }),
                    patientApi.getPrescriptions({ limit: 4 }),
                ]);

                if (profRes.status === 'fulfilled' && profRes.value.success) {
                    const pData = profRes.value.data as any;
                    setProfile(pData);
                    setEditFormData({
                        name: pData?.name || user?.name || '',
                        phone: pData?.phone || user?.phone || '',
                        gender: pData?.gender || '',
                        bloodGroup: pData?.blood_group || pData?.bloodGroup || '',
                        age: pData?.age ? String(pData.age) : ''
                    });
                }
                if (apptsUpcomingRes.status === 'fulfilled' && apptsUpcomingRes.value.success) {
                    setUpcomingAppointments((apptsUpcomingRes.value.data as AppointmentItem[]) || []);
                }
                if (apptsPastRes.status === 'fulfilled' && apptsPastRes.value.success) {
                    setPastAppointments((apptsPastRes.value.data as AppointmentItem[]) || []);
                }
                if (rxRes.status === 'fulfilled' && rxRes.value.success) {
                    setPrescriptions((rxRes.value.data as any[]) || []);
                }
            }
        } catch (err: any) {
            if (isPatient) {
                setError(err.message || 'Failed to load patient information.');
            }
        } finally {
            setLoading(false);
        }
    }, [isPatient, user]);

    useEffect(() => {
        loadPortalData();
    }, [loadPortalData]);

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            const res = await patientApi.updateProfile({
                name: editFormData.name,
                phone: editFormData.phone,
                gender: editFormData.gender,
                bloodGroup: editFormData.bloodGroup,
                age: editFormData.age ? parseInt(editFormData.age) : undefined
            });
            if (res.success) {
                setSaveSuccess(true);
                setTimeout(() => {
                    setSaveSuccess(false);
                    setIsEditProfileOpen(false);
                    loadPortalData();
                }, 800);
            }
        } catch (err: any) {
            console.error('Error updating profile:', err);
        } finally {
            setIsSavingProfile(false);
        }
    };

    const patientDisplayName = profile?.name || user?.name || 'Patient';
    const patientEmail = profile?.email || user?.email || 'No email attached';
    const patientPhone = profile?.phone || user?.phone || 'Not provided';
    const patientBloodGroup = profile?.blood_group || profile?.bloodGroup || null;
    const patientGender = profile?.gender ? profile.gender.charAt(0).toUpperCase() + profile.gender.slice(1) : null;
    const patientAge = profile?.age || null;

    if (loading) {
        return (
            <div className="space-y-6 max-w-5xl mx-auto animate-pulse">
                <div className="h-28 bg-white dark:bg-gray-900 rounded-3xl border border-stone-200/80 dark:border-gray-800" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2 h-72 bg-white dark:bg-gray-900 rounded-3xl border border-stone-200/80 dark:border-gray-800" />
                    <div className="h-72 bg-white dark:bg-gray-900 rounded-3xl border border-stone-200/80 dark:border-gray-800" />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-2xl mx-auto bg-white dark:bg-gray-900 rounded-3xl p-8 border border-stone-200 dark:border-gray-800 text-center space-y-4">
                <AlertCircle className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">Unable to Load Portal Data</h3>
                <p className="text-stone-600 dark:text-stone-400 text-sm">{error}</p>
                <button
                    onClick={loadPortalData}
                    className="inline-flex items-center gap-2 px-5 py-2.5 bg-vd-forest text-white rounded-xl font-semibold text-sm hover:bg-vd-forest-deep transition-all cursor-pointer shadow-xs"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Try Again</span>
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8">
            {/* 1. Welcome & Header Area */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-stone-200/80 dark:border-gray-800 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-vd-forest dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800 text-xs font-semibold">
                        <User className="w-3.5 h-3.5" />
                        <span>Patient Account</span>
                    </div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 tracking-tight">
                        Welcome back, {patientDisplayName}
                    </h1>
                    <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 font-normal">
                        Manage your upcoming appointments, video visits, and basic account profile.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <Link
                        href="/doctors"
                        className="inline-flex items-center gap-2 px-5 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-2xl text-xs sm:text-sm font-bold transition-all shadow-xs cursor-pointer"
                    >
                        <Stethoscope className="w-4 h-4" />
                        <span>Find Doctors</span>
                    </Link>
                    <button
                        type="button"
                        onClick={() => setAppModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-stone-100 dark:bg-gray-800 hover:bg-stone-200 dark:hover:bg-gray-700 text-stone-800 dark:text-stone-200 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer border border-stone-200 dark:border-gray-700"
                    >
                        <Smartphone className="w-4 h-4 text-vd-forest" />
                        <span>Get App</span>
                    </button>
                </div>
            </div>

            {/* 2. Main Grid: Appointments & Profile */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left (2 Cols): Upcoming Consultations & Appointment History */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Section: Upcoming Appointments */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-7 border border-stone-200/80 dark:border-gray-800 shadow-xs space-y-5">
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-gray-800">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-vd-forest dark:text-emerald-300 flex items-center justify-center">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="font-heading text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                                        Upcoming Appointments
                                    </h2>
                                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                                        Scheduled in-clinic and video consultations
                                    </p>
                                </div>
                            </div>
                            <Link
                                href="/patient/appointments"
                                className="text-xs font-semibold text-vd-forest hover:text-vd-forest-deep dark:text-emerald-400 flex items-center gap-1"
                            >
                                <span>View all</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {!isPatient ? (
                            <div className="py-10 text-center space-y-3 bg-stone-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-stone-200 dark:border-gray-800 p-6">
                                <Calendar className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
                                <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">Sign in to view your appointments</h4>
                                <p className="text-[11px] text-stone-400 dark:text-stone-500 max-w-sm mx-auto">
                                    Track upcoming video consultations and in-clinic appointments with certified doctors.
                                </p>
                                <div className="pt-2 flex items-center justify-center gap-2">
                                    <Link
                                        href="/login/patient?redirect=/patient"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold hover:bg-vd-forest-deep transition-all shadow-xs cursor-pointer"
                                    >
                                        <Lock className="w-3.5 h-3.5" />
                                        <span>Sign In as Patient</span>
                                    </Link>
                                </div>
                            </div>
                        ) : upcomingAppointments.length === 0 ? (
                            <div className="py-10 text-center space-y-3 bg-stone-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-stone-200 dark:border-gray-800 p-6">
                                <Calendar className="w-10 h-10 text-stone-300 dark:text-stone-600 mx-auto" />
                                <p className="text-xs font-semibold text-stone-700 dark:text-stone-300">
                                    No upcoming appointments scheduled
                                </p>
                                <p className="text-[11px] text-stone-400 dark:text-stone-500 max-w-sm mx-auto">
                                    Find certified doctors for in-person clinic visits or instant online video consultations.
                                </p>
                                <div className="pt-2">
                                    <Link
                                        href="/doctors"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold hover:bg-vd-forest-deep transition-all shadow-xs"
                                    >
                                        <Stethoscope className="w-3.5 h-3.5" />
                                        <span>Book an Appointment</span>
                                    </Link>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {upcomingAppointments.map((appt) => {
                                    const isVideo = appt.type === 'video';
                                    const joinState = isVideo ? isVideoJoinEligible(appt) : { canJoin: false };
                                    const displayDate = formatDisplayDate(appt.appointment_date || appt.date);
                                    const displayTime = formatTimeSlot(appt.time_slot || appt.timeSlot);
                                    const docName = appt.doctor?.name || 'Doctor';
                                    const specialty = appt.doctor?.specialization || 'General Practitioner';
                                    const facility = appt.clinic?.name || appt.hospital?.name;

                                    return (
                                        <div
                                            key={appt.id}
                                            className="p-5 rounded-2xl bg-stone-50/80 dark:bg-gray-800/50 border border-stone-200/80 dark:border-gray-700/80 hover:border-vd-forest/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                        >
                                            <div className="flex items-start gap-3.5">
                                                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-vd-forest dark:text-emerald-300 font-bold text-sm flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800">
                                                    {docName.charAt(0)}
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-heading font-bold text-sm sm:text-base text-stone-900 dark:text-stone-100">
                                                            {docName}
                                                        </h3>
                                                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                                            {appt.status || 'Scheduled'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-vd-forest dark:text-emerald-400 font-medium">
                                                        {specialty}
                                                    </p>
                                                    <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 dark:text-stone-400 pt-0.5">
                                                        <span className="flex items-center gap-1 font-mono font-medium">
                                                            <Calendar className="w-3.5 h-3.5 text-stone-400" />
                                                            {displayDate}
                                                        </span>
                                                        <span className="flex items-center gap-1 font-mono font-medium">
                                                            <Clock className="w-3.5 h-3.5 text-stone-400" />
                                                            {displayTime}
                                                        </span>
                                                        <span className="flex items-center gap-1 font-semibold">
                                                            {isVideo ? (
                                                                <span className="inline-flex items-center gap-1 text-vd-forest dark:text-emerald-400">
                                                                    <Video className="w-3.5 h-3.5" />
                                                                    <span>Video Call</span>
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 text-teal-800 dark:text-teal-300">
                                                                    <Building2 className="w-3.5 h-3.5" />
                                                                    <span>In-Clinic {facility ? `(${facility})` : ''}</span>
                                                                </span>
                                                            )}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Button: Join Call or Details */}
                                            <div className="flex items-center gap-2 self-end sm:self-center">
                                                {isVideo && joinState.canJoin && (
                                                    <Link
                                                        href={`/consultation/${appt.id}`}
                                                        className="px-4 py-2 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer animate-pulse"
                                                    >
                                                        <Video className="w-3.5 h-3.5" />
                                                        <span>Join Video Consultation</span>
                                                    </Link>
                                                )}
                                                {isVideo && !joinState.canJoin && (
                                                    <span
                                                        className="px-3 py-1.5 bg-stone-100 dark:bg-gray-800 text-stone-400 dark:text-stone-500 rounded-xl text-[11px] font-medium"
                                                        title={joinState.reason}
                                                    >
                                                        {joinState.reason || 'Video Call Pending'}
                                                    </span>
                                                )}
                                                <Link
                                                    href="/patient/appointments"
                                                    className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-stone-200 dark:border-gray-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-semibold hover:bg-stone-50 dark:hover:bg-gray-700 transition-colors"
                                                >
                                                    Manage
                                                </Link>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Section: Appointment History */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-7 border border-stone-200/80 dark:border-gray-800 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-gray-800">
                            <div>
                                <h2 className="font-heading text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                                    Recent Appointment History
                                </h2>
                                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                                    Past consultations and visits
                                </p>
                            </div>
                            <Link
                                href="/patient/appointments"
                                className="text-xs font-semibold text-vd-forest hover:text-vd-forest-deep dark:text-emerald-400 flex items-center gap-1"
                            >
                                <span>Full History</span>
                                <ChevronRight className="w-3.5 h-3.5" />
                            </Link>
                        </div>

                        {pastAppointments.length === 0 ? (
                            <p className="text-xs text-stone-400 dark:text-stone-500 italic py-2">
                                No past appointments recorded.
                            </p>
                        ) : (
                            <div className="divide-y divide-stone-100 dark:divide-gray-800">
                                {pastAppointments.map((appt) => (
                                    <div
                                        key={appt.id}
                                        className="py-3.5 flex items-center justify-between gap-4"
                                    >
                                        <div className="space-y-0.5">
                                            <p className="text-xs font-bold text-stone-900 dark:text-stone-100">
                                                {appt.doctor?.name || 'Doctor Consultation'}
                                            </p>
                                            <p className="text-[11px] text-stone-500 dark:text-stone-400">
                                                {formatDisplayDate(appt.appointment_date || appt.date)} • {appt.type === 'video' ? 'Video' : 'In-Clinic'}
                                            </p>
                                        </div>
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-stone-400">
                                            Completed
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section: Basic Prescriptions & Consultation Notes */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-7 border border-stone-200/80 dark:border-gray-800 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-vd-forest" />
                                <div>
                                    <h2 className="font-heading text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">
                                        Recent Prescriptions
                                    </h2>
                                    <p className="text-[11px] text-stone-500 dark:text-stone-400">
                                        Summary of prescriptions from completed consultations
                                    </p>
                                </div>
                            </div>
                        </div>

                        {!isPatient ? (
                            <div className="p-6 text-center bg-stone-50/50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-stone-200 dark:border-gray-800 space-y-2">
                                <Pill className="w-8 h-8 text-stone-300 dark:text-stone-600 mx-auto" />
                                <h4 className="text-xs font-bold text-stone-800 dark:text-stone-200">Sign in to view prescriptions & medicine</h4>
                                <p className="text-[11px] text-stone-400 dark:text-stone-500 max-w-xs mx-auto">
                                    Access verified electronic prescriptions, medication schedules, and order doorstep pharmacy delivery.
                                </p>
                                <div className="pt-2 flex items-center justify-center gap-2">
                                    <Link
                                        href="/login/patient?redirect=/patient"
                                        className="inline-flex items-center gap-2 px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold hover:bg-vd-forest-deep transition-all shadow-xs"
                                    >
                                        <Lock className="w-3.5 h-3.5" />
                                        <span>Sign In</span>
                                    </Link>
                                </div>
                            </div>
                        ) : prescriptions.length === 0 ? (
                            <p className="text-xs text-stone-400 dark:text-stone-500 italic py-2">
                                No active prescriptions on file. Prescriptions are issued by doctors after consultations.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {prescriptions.slice(0, 3).map((rx) => (
                                    <div
                                        key={rx.id}
                                        className="p-3.5 rounded-2xl bg-stone-50 dark:bg-gray-800/40 border border-stone-100 dark:border-gray-800 flex items-center justify-between gap-4"
                                    >
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-white dark:bg-gray-800 rounded border border-stone-200 dark:border-gray-700 text-stone-800 dark:text-stone-200">
                                                    {rx.prescription_number || 'RX'}
                                                </span>
                                                <span className="text-xs font-semibold text-stone-900 dark:text-stone-100">
                                                    {rx.diagnosis || 'Clinical Prescription'}
                                                </span>
                                            </div>
                                            <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-1">
                                                By {rx.doctor?.name || 'Practitioner'} • {rx.created_at ? new Date(rx.created_at).toLocaleDateString() : 'Recent'}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl border border-emerald-200/70 dark:border-emerald-800/60 text-xs text-emerald-900 dark:text-emerald-200 flex items-center justify-between gap-3">
                            <span className="text-[11px] leading-relaxed">
                                💡 To view complete medical records, laboratory diagnostic reports, and doorstep medicine refills, open the <strong>Vaididea Patient App</strong>.
                            </span>
                            <button
                                type="button"
                                onClick={() => setAppModalOpen(true)}
                                className="px-3 py-1 bg-vd-forest text-white rounded-lg font-bold text-[11px] shrink-0 cursor-pointer shadow-2xs"
                            >
                                Open App
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right (1 Col): Basic Profile Settings & App Promotion */}
                <div className="space-y-8" id="profile">
                    {/* Basic Profile Card */}
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-stone-200/80 dark:border-gray-800 shadow-xs space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-gray-800">
                            <div className="flex items-center gap-2">
                                <User className="w-4 h-4 text-vd-forest" />
                                <h3 className="font-heading text-base font-bold text-stone-900 dark:text-stone-100">
                                    Account Profile
                                </h3>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsEditProfileOpen(true)}
                                className="inline-flex items-center gap-1 text-xs font-bold text-vd-forest hover:text-vd-forest-deep dark:text-emerald-400 cursor-pointer"
                            >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>Edit</span>
                            </button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div>
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                    Full Name
                                </span>
                                <p className="font-semibold text-stone-900 dark:text-stone-100 text-sm mt-0.5">
                                    {patientDisplayName}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                    Email Address
                                </span>
                                <p className="font-medium text-stone-700 dark:text-stone-300 mt-0.5">
                                    {patientEmail}
                                </p>
                            </div>

                            <div>
                                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                    Phone Number
                                </span>
                                <p className="font-medium text-stone-700 dark:text-stone-300 mt-0.5">
                                    {patientPhone}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-stone-100 dark:border-gray-800">
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                        Blood Group
                                    </span>
                                    <p className="font-semibold text-rose-600 dark:text-rose-400 mt-0.5">
                                        {patientBloodGroup ? `🩸 ${patientBloodGroup}` : 'Not Specified'}
                                    </p>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                        Gender / Age
                                    </span>
                                    <p className="font-semibold text-stone-800 dark:text-stone-200 mt-0.5">
                                        {[patientGender, patientAge ? `${patientAge} yrs` : null].filter(Boolean).join(' • ') || 'Not Set'}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Prominent Vaididea Patient App Promotion Banner */}
                    <div className="bg-gradient-to-br from-vd-forest via-emerald-900 to-stone-900 text-white rounded-3xl p-6 sm:p-7 shadow-lg relative overflow-hidden space-y-5">
                        <div className="space-y-2">
                            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-emerald-200 border border-white/20 text-[11px] font-bold uppercase tracking-wider">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>Patient Mobile App</span>
                            </div>
                            <h3 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-white leading-snug">
                                Your healthcare, all in one app.
                            </h3>
                            <p className="text-xs text-emerald-100/90 leading-relaxed font-light">
                                Download the <strong>Vaididea Patient App</strong> for advanced personal healthcare management:
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px] text-emerald-50">
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                <span>Health Records & EHR</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                <span>Digital Health Card</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                <span>ABHA Health ID</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                <span>Doorstep Medicines</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                <span>Home Lab Diagnostics</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                <span>AI Health Assistant</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                <span>Doctor Community Q&A</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                <span>Emergency SOS Alert</span>
                            </div>
                        </div>

                        <div className="pt-2 space-y-2">
                            <button
                                type="button"
                                onClick={() => setAppModalOpen(true)}
                                className="w-full py-3 bg-white hover:bg-stone-100 text-vd-forest font-bold rounded-2xl text-xs transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <Smartphone className="w-4 h-4" />
                                <span>Download Vaididea App</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setAppModalOpen(true)}
                                className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-2xl text-xs transition-all border border-white/20 flex items-center justify-center gap-2 cursor-pointer"
                            >
                                <QrCode className="w-4 h-4" />
                                <span>Scan QR Code</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {isEditProfileOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setIsEditProfileOpen(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-stone-200 dark:border-gray-800 space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-heading font-bold text-lg text-stone-900 dark:text-stone-100">
                            Update Account Profile
                        </h3>

                        <form onSubmit={handleProfileSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                                    Full Name
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={editFormData.name}
                                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                                    Phone Number
                                </label>
                                <input
                                    type="tel"
                                    value={editFormData.phone}
                                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                                        Gender
                                    </label>
                                    <select
                                        value={editFormData.gender}
                                        onChange={(e) => setEditFormData({ ...editFormData, gender: e.target.value })}
                                        className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                                        Blood Group
                                    </label>
                                    <select
                                        value={editFormData.bloodGroup}
                                        onChange={(e) => setEditFormData({ ...editFormData, bloodGroup: e.target.value })}
                                        className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                    >
                                        <option value="">Select</option>
                                        <option value="A+">A+</option>
                                        <option value="A-">A-</option>
                                        <option value="B+">B+</option>
                                        <option value="B-">B-</option>
                                        <option value="AB+">AB+</option>
                                        <option value="AB-">AB-</option>
                                        <option value="O+">O+</option>
                                        <option value="O-">O-</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1">
                                    Age (Years)
                                </label>
                                <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    value={editFormData.age}
                                    onChange={(e) => setEditFormData({ ...editFormData, age: e.target.value })}
                                    className="w-full p-2.5 rounded-xl border border-stone-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2 border-t border-stone-100 dark:border-gray-800">
                                <button
                                    type="button"
                                    onClick={() => setIsEditProfileOpen(false)}
                                    className="px-4 py-2 text-xs font-semibold text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-gray-800 rounded-xl cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSavingProfile}
                                    className="px-5 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold hover:bg-vd-forest-deep transition-all flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                                >
                                    {isSavingProfile ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : saveSuccess ? (
                                        <Check className="w-3.5 h-3.5" />
                                    ) : null}
                                    <span>{saveSuccess ? 'Saved!' : 'Save Changes'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Shared App Download Modal */}
            <AppDownloadModal
                isOpen={appModalOpen}
                onClose={() => setAppModalOpen(false)}
            />
        </div>
    );
}
