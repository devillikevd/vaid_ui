'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    Calendar,
    Clock,
    Video,
    Building2,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Loader2,
    Plus,
    X,
    User,
    ChevronRight,
    RefreshCw,
    FileText,
    CreditCard,
    MapPin,
    Stethoscope,
    Shield,
    ExternalLink
} from 'lucide-react';
import { patientApi } from '@/lib/api';
import { useAuthStore, isPatientAuthenticated } from '@/stores/authStore';
import ProtectedPageGate from '@/components/auth/ProtectedPageGate';


type TabType = 'upcoming' | 'past' | 'cancelled';

interface AppointmentDetail {
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
    reason_for_visit?: string;
    patient_notes?: string;
    notes?: string;
    symptoms?: string[];
    doctor?: {
        id?: string;
        name?: string;
        specialization?: string;
        profile_image_url?: string;
        consultation_fee?: number;
    };
    hospital?: {
        id?: string;
        name?: string;
        address?: string;
        city?: string;
        type?: string;
    };
    clinic?: {
        id?: string;
        name?: string;
        address?: string;
        city?: string;
    };
    consultation_id?: string;
    has_prescription?: boolean;
    created_at?: string;
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
    // If format is HH:MM:SS or HH:MM-HH:MM, format cleanly
    const parts = timeSlot.split('-');
    if (parts.length === 2) {
        return `${parts[0].trim().slice(0, 5)} - ${parts[1].trim().slice(0, 5)}`;
    }
    return timeSlot.slice(0, 5);
}

/**
 * Checks whether a video consultation can be joined (10 min before scheduled IST time)
 */
function isVideoJoinEligible(appt: AppointmentDetail): { canJoin: boolean; reason?: string } {
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


export default function PatientAppointmentsPage() {
    const { user, isAuthenticated, _hasHydrated, isLoading: authLoading } = useAuthStore();
    const isPatient = isPatientAuthenticated(user, isAuthenticated);
    const [appointments, setAppointments] = useState<AppointmentDetail[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [tab, setTab] = useState<TabType>('upcoming');

    // Detail modal state
    const [detailModalAppt, setDetailModalAppt] = useState<AppointmentDetail | null>(null);

    // Cancel modal state
    const [cancelModalAppt, setCancelModalAppt] = useState<AppointmentDetail | null>(null);
    const [cancelReason, setCancelReason] = useState('');
    const [cancelling, setCancelling] = useState(false);
    const [cancelError, setCancelError] = useState<string | null>(null);

    const fetchAppointments = useCallback(async (currentTab: TabType) => {
        setLoading(true);
        setError(null);
        try {
            const backendStatus =
                currentTab === 'upcoming'
                    ? 'upcoming'
                    : currentTab === 'past'
                    ? 'completed'
                    : 'cancelled';

            const res = await patientApi.getAppointments({
                status: backendStatus,
                limit: 50,
                page: 1
            });

            if (res.success) {
                const list = (res.data as AppointmentDetail[]) || [];
                setAppointments(list);
            } else {
                setError(res.message || res.error || 'Failed to load appointments');
            }
        } catch (err: any) {
            setError(err.message || 'Error fetching appointments');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isPatient) {
            fetchAppointments(tab);
        } else {
            setLoading(false);
        }
    }, [tab, fetchAppointments, isPatient]);

    const handleCancelAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!cancelModalAppt) return;
        setCancelling(true);
        setCancelError(null);
        try {
            const res = await patientApi.cancelAppointment(cancelModalAppt.id, cancelReason);
            if (res.success) {
                setCancelModalAppt(null);
                setDetailModalAppt(null);
                setCancelReason('');
                fetchAppointments(tab);
            } else {
                setCancelError(res.message || res.error || 'Failed to cancel appointment');
            }
        } catch (err: any) {
            setCancelError(err.message || 'Error processing cancellation');
        } finally {
            setCancelling(false);
        }
    };

    const filteredAppointments = appointments.filter((appt) => {
        const status = (appt.status || '').toLowerCase();
        const dateVal = appt.appointment_date || appt.date;
        const timeVal = appt.time_slot || appt.timeSlot || '00:00';
        const cleanDate = dateVal ? (dateVal.includes('T') ? dateVal.split('T')[0] : dateVal) : '';
        const timeStr = timeVal.split('-')[0].trim();
        const apptMs = cleanDate ? Date.parse(`${cleanDate}T${timeStr.slice(0, 5)}:00+05:30`) : NaN;
        const nowMs = Date.now();

        if (tab === 'cancelled') {
            return status === 'cancelled' || status === 'rejected' || status === 'no_show';
        }
        if (tab === 'past') {
            return status === 'completed' || (status !== 'cancelled' && status !== 'rejected' && !isNaN(apptMs) && apptMs < nowMs);
        }
        if (status === 'cancelled' || status === 'completed' || status === 'rejected') {
            return false;
        }
        return true;
    });

    if (_hasHydrated && !authLoading && !isPatient) {
        return <ProtectedPageGate pageType="appointments" />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-xs font-semibold mb-2">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Consultation Management</span>
                    </div>
                    <h1 className="font-heading text-2xl sm:text-3xl font-bold text-stone-900">
                        My Appointments
                    </h1>
                    <p className="text-xs sm:text-sm text-stone-500 font-light mt-1">
                        Track scheduled appointments, access video consultations, and review your clinical care history.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => fetchAppointments(tab)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                        title="Refresh appointments"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                    <Link
                        href="/patient/doctors"
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                        <Plus className="w-4 h-4" />
                        <span>Book New Appointment</span>
                    </Link>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-stone-100/80 rounded-2xl w-fit">
                <button
                    onClick={() => setTab('upcoming')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        tab === 'upcoming'
                            ? 'bg-white text-stone-900 shadow-xs font-bold'
                            : 'text-stone-500 hover:text-stone-800'
                    }`}
                >
                    Upcoming
                </button>
                <button
                    onClick={() => setTab('past')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        tab === 'past'
                            ? 'bg-white text-stone-900 shadow-xs font-bold'
                            : 'text-stone-500 hover:text-stone-800'
                    }`}
                >
                    Past & Completed
                </button>
                <button
                    onClick={() => setTab('cancelled')}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        tab === 'cancelled'
                            ? 'bg-white text-stone-900 shadow-xs font-bold'
                            : 'text-stone-500 hover:text-stone-800'
                    }`}
                >
                    Cancelled
                </button>
            </div>

            {/* Content Body */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div
                            key={i}
                            className="bg-white rounded-3xl p-6 border border-stone-200 animate-pulse h-36"
                        />
                    ))}
                </div>
            ) : error ? (
                <div className="bg-white rounded-3xl p-8 border border-stone-200 text-center space-y-3">
                    <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
                    <p className="text-sm font-semibold text-stone-800">{error}</p>
                    <button
                        onClick={() => fetchAppointments(tab)}
                        className="px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                        Retry
                    </button>
                </div>
            ) : filteredAppointments.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 border border-stone-200 text-center space-y-3">
                    <Calendar className="w-10 h-10 text-stone-300 mx-auto mb-1" />
                    <h3 className="font-heading font-bold text-lg text-stone-800">
                        No {tab} appointments
                    </h3>
                    <p className="text-xs text-stone-500 font-light max-w-sm mx-auto">
                        {tab === 'upcoming'
                            ? 'You have no scheduled appointments right now.'
                            : `No ${tab} appointments recorded in your history.`}
                    </p>
                    {tab === 'upcoming' && (
                        <Link
                            href="/patient/doctors"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-vd-forest text-white rounded-xl text-xs font-bold hover:bg-vd-forest-deep transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Find a Doctor</span>
                        </Link>
                    )}
                </div>
            ) : (
                <div className="space-y-4">
                    {filteredAppointments.map((appt) => {
                        const doctorName = appt.doctor?.name || 'Doctor';
                        const specialty = appt.doctor?.specialization || 'General Physician';
                        const isVideo = appt.type === 'video';
                        const isClinic = appt.type === 'clinic' || appt.type === 'in_person';
                        const displayDate = formatDisplayDate(appt.appointment_date || appt.date);
                        const displayTime = formatTimeSlot(appt.time_slot || appt.timeSlot);
                        const statusNormalized = (appt.status || 'scheduled').toLowerCase();
                        const orgName = appt.clinic?.name || appt.hospital?.name;
                        const joinState = isVideo ? isVideoJoinEligible(appt) : { canJoin: false };

                        return (
                            <div
                                key={appt.id}
                                className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/80 hover:border-vd-forest/30 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                            >
                                <div className="flex items-start gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-vd-forest font-bold text-base flex items-center justify-center shrink-0 overflow-hidden">
                                        {appt.doctor?.profile_image_url ? (
                                            <img
                                                src={appt.doctor.profile_image_url}
                                                alt={doctorName}
                                                className="w-full h-full object-cover"
                                            />
                                        ) : (
                                            doctorName.charAt(0)
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h3 className="font-heading font-bold text-base text-stone-900">
                                                {doctorName}
                                            </h3>
                                            <span
                                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                                    statusNormalized === 'confirmed' || statusNormalized === 'scheduled' || statusNormalized === 'booked'
                                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                                        : statusNormalized === 'in_progress'
                                                        ? 'bg-blue-50 text-blue-800 border border-blue-200'
                                                        : statusNormalized === 'completed'
                                                        ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                                        : 'bg-stone-100 text-stone-600'
                                                }`}
                                            >
                                                {statusNormalized}
                                            </span>
                                        </div>

                                        <p className="text-xs text-vd-forest font-medium">{specialty}</p>

                                        <div className="flex flex-wrap items-center gap-3 text-xs text-stone-600 font-light pt-0.5">
                                            <span className="flex items-center gap-1 font-mono font-medium text-stone-800">
                                                <Calendar className="w-3.5 h-3.5 text-stone-400" />
                                                {displayDate}
                                            </span>
                                            <span className="flex items-center gap-1 font-mono font-medium text-stone-800">
                                                <Clock className="w-3.5 h-3.5 text-stone-400" />
                                                {displayTime}
                                            </span>

                                            <span className="flex items-center gap-1 font-semibold capitalize">
                                                {isVideo ? (
                                                    <span className="inline-flex items-center gap-1 text-vd-forest">
                                                        <Video className="w-3.5 h-3.5" />
                                                        <span>Video Consultation</span>
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-teal-800">
                                                        <Building2 className="w-3.5 h-3.5" />
                                                        <span>In-Clinic Visit</span>
                                                    </span>
                                                )}
                                            </span>

                                            {orgName && isClinic && (
                                                <span className="flex items-center gap-1 text-stone-500 text-[11px]">
                                                    <MapPin className="w-3 h-3 text-stone-400" />
                                                    {orgName}
                                                </span>
                                            )}
                                        </div>

                                        {appt.appointment_number && (
                                            <div className="pt-0.5">
                                                <span className="text-[10px] font-mono text-stone-400">
                                                    Appointment ID: <strong className="text-stone-700">{appt.appointment_number}</strong>
                                                </span>
                                            </div>
                                        )}

                                        {appt.reason && (
                                            <p className="text-[11px] text-stone-500 italic">
                                                Reason: {appt.reason}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 self-end md:self-center">
                                    <button
                                        type="button"
                                        onClick={() => setDetailModalAppt(appt)}
                                        className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                    >
                                        View Details
                                    </button>

                                    {tab === 'upcoming' && isVideo && joinState.canJoin && (
                                        <Link
                                            href={`/consultation/${appt.id}`}
                                            className="px-4 py-2 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                                        >
                                            <Video className="w-3.5 h-3.5" />
                                            <span>Join Video Call</span>
                                        </Link>
                                    )}

                                    {tab === 'upcoming' && isVideo && !joinState.canJoin && (
                                        <span
                                            className="px-3 py-2 bg-stone-100 text-stone-400 rounded-xl text-[11px] font-medium cursor-not-allowed"
                                            title={joinState.reason}
                                        >
                                            {joinState.reason || 'Video Call Pending'}
                                        </span>
                                    )}

                                    {tab === 'upcoming' && (
                                        <button
                                            onClick={() => setCancelModalAppt(appt)}
                                            className="px-3.5 py-2 bg-stone-50 hover:bg-rose-50 text-stone-600 hover:text-rose-600 border border-stone-200 hover:border-rose-200 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                                        >
                                            Cancel
                                        </button>
                                    )}

                                    {tab === 'past' && (
                                        <Link
                                            href={`/patient/records`}
                                            className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold transition-all"
                                        >
                                            View Records
                                        </Link>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Appointment Details Modal */}
            {detailModalAppt && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setDetailModalAppt(null)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl relative border border-stone-200 space-y-4 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                            <div>
                                <h3 className="font-heading font-bold text-lg text-stone-900">
                                    Appointment Details
                                </h3>
                                {detailModalAppt.appointment_number && (
                                    <p className="text-xs font-mono text-stone-500 font-semibold">
                                        ID: {detailModalAppt.appointment_number}
                                    </p>
                                )}
                            </div>
                            <button
                                onClick={() => setDetailModalAppt(null)}
                                className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-all"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Doctor Section */}
                        <div className="flex items-center gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
                            <div className="w-12 h-12 rounded-xl bg-emerald-100 text-vd-forest font-bold text-base flex items-center justify-center shrink-0 overflow-hidden">
                                {detailModalAppt.doctor?.profile_image_url ? (
                                    <img
                                        src={detailModalAppt.doctor.profile_image_url}
                                        alt={detailModalAppt.doctor?.name || 'Doctor'}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    detailModalAppt.doctor?.name?.charAt(0) || 'D'
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-bold text-stone-900 truncate">
                                    {detailModalAppt.doctor?.name || 'Doctor'}
                                </h4>
                                <p className="text-xs text-stone-500">
                                    {detailModalAppt.doctor?.specialization || 'General Physician'}
                                </p>
                            </div>
                            <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                    (detailModalAppt.status || '').toLowerCase() === 'confirmed' ||
                                    (detailModalAppt.status || '').toLowerCase() === 'scheduled'
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                        : (detailModalAppt.status || '').toLowerCase() === 'completed'
                                        ? 'bg-teal-50 text-teal-800 border border-teal-200'
                                        : 'bg-stone-100 text-stone-700'
                                }`}
                            >
                                {detailModalAppt.status || 'Scheduled'}
                            </span>
                        </div>

                        {/* Schedule & Mode Grid */}
                        <div className="grid grid-cols-2 gap-2.5">
                            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-0.5">
                                    Date
                                </p>
                                <p className="text-xs font-bold text-stone-900">
                                    {formatDisplayDate(detailModalAppt.appointment_date || detailModalAppt.date)}
                                </p>
                            </div>
                            <div className="p-3 bg-stone-50 rounded-2xl border border-stone-100">
                                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider mb-0.5">
                                    Time Slot
                                </p>
                                <p className="text-xs font-bold text-stone-900">
                                    {formatTimeSlot(detailModalAppt.time_slot || detailModalAppt.timeSlot)}
                                </p>
                            </div>
                        </div>

                        {/* Consultation Type & Facility */}
                        <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-2">
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-stone-500 font-medium">Consultation Type</span>
                                <span className="font-bold text-stone-900 flex items-center gap-1.5 capitalize">
                                    {detailModalAppt.type === 'video' ? (
                                        <>
                                            <Video className="w-3.5 h-3.5 text-vd-forest" />
                                            Video Consultation
                                        </>
                                    ) : (
                                        <>
                                            <Building2 className="w-3.5 h-3.5 text-teal-800" />
                                            In-Clinic Consultation
                                        </>
                                    )}
                                </span>
                            </div>

                            {(detailModalAppt.clinic || detailModalAppt.hospital) && (
                                <div className="pt-2 border-t border-stone-200/60 text-xs flex items-start justify-between gap-2">
                                    <span className="text-stone-500 font-medium">Facility</span>
                                    <div className="text-right">
                                        <p className="font-bold text-stone-900">
                                            {detailModalAppt.clinic?.name || detailModalAppt.hospital?.name}
                                        </p>
                                        <p className="text-[11px] text-stone-500">
                                            {detailModalAppt.clinic?.address || detailModalAppt.hospital?.address}
                                            {detailModalAppt.clinic?.city ? `, ${detailModalAppt.clinic.city}` : ''}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="pt-2 border-t border-stone-200/60 text-xs flex items-center justify-between">
                                <span className="text-stone-500 font-medium">Consultation Fee</span>
                                <span className="font-bold text-stone-900 font-mono text-sm">
                                    ₹{detailModalAppt.fee || detailModalAppt.consultation_fee || detailModalAppt.doctor?.consultation_fee || 500}
                                </span>
                            </div>

                            <div className="text-xs flex items-center justify-between">
                                <span className="text-stone-500 font-medium">Payment Status</span>
                                <span className="font-semibold text-stone-700 capitalize">
                                    {detailModalAppt.payment_status || 'Pay at Visit'}
                                </span>
                            </div>
                        </div>

                        {/* Clinical Intake Information (if present) */}
                        {(detailModalAppt.reason || detailModalAppt.reason_for_visit || detailModalAppt.patient_notes || detailModalAppt.notes) && (
                            <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-100 space-y-1.5">
                                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                                    Visit Notes & Reason
                                </p>
                                {(detailModalAppt.reason || detailModalAppt.reason_for_visit) && (
                                    <p className="text-xs text-stone-800 font-medium">
                                        Reason: {detailModalAppt.reason || detailModalAppt.reason_for_visit}
                                    </p>
                                )}
                                {(detailModalAppt.patient_notes || detailModalAppt.notes) && (
                                    <p className="text-xs text-stone-600 italic">
                                        Notes: {detailModalAppt.patient_notes || detailModalAppt.notes}
                                    </p>
                                )}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2 pt-2">
                            {detailModalAppt.type === 'video' &&
                                (detailModalAppt.status || '').toLowerCase() !== 'cancelled' &&
                                (detailModalAppt.status || '').toLowerCase() !== 'completed' && (
                                    <Link
                                        href={`/consultation/${detailModalAppt.id}`}
                                        className="flex-1 py-2.5 bg-vd-forest hover:bg-vd-forest-deep text-white rounded-2xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5"
                                    >
                                        <Video className="w-4 h-4" />
                                        <span>Join Video Room</span>
                                    </Link>
                                )}

                            {(detailModalAppt.status || '').toLowerCase() === 'scheduled' ||
                            (detailModalAppt.status || '').toLowerCase() === 'confirmed' ? (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setCancelModalAppt(detailModalAppt);
                                    }}
                                    className="px-4 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-2xl text-xs font-bold transition-all cursor-pointer border border-rose-200"
                                >
                                    Cancel Visit
                                </button>
                            ) : null}

                            <button
                                type="button"
                                onClick={() => setDetailModalAppt(null)}
                                className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cancel Appointment Modal */}
            {cancelModalAppt && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
                    onClick={() => setCancelModalAppt(null)}
                >
                    <div
                        className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative border border-stone-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-4">
                            <h3 className="font-heading font-bold text-lg text-stone-900">
                                Cancel Appointment
                            </h3>
                            <button
                                onClick={() => setCancelModalAppt(null)}
                                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <p className="text-xs text-stone-600 leading-relaxed font-light mb-4">
                            Are you sure you want to cancel your consultation with{' '}
                            <strong>{cancelModalAppt.doctor?.name || 'Doctor'}</strong> scheduled for{' '}
                            <strong>{formatDisplayDate(cancelModalAppt.appointment_date || cancelModalAppt.date)}</strong> at{' '}
                            <strong>{formatTimeSlot(cancelModalAppt.time_slot || cancelModalAppt.timeSlot)}</strong>?
                        </p>

                        <form onSubmit={handleCancelAppointment} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-stone-700 mb-1">
                                    Reason for Cancellation
                                </label>
                                <textarea
                                    required
                                    rows={3}
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    placeholder="Please provide a brief reason (e.g. scheduling conflict)"
                                    className="w-full p-3 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                                />
                            </div>

                            {cancelError && (
                                <p className="text-xs text-rose-600 font-medium">{cancelError}</p>
                            )}

                            <div className="flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCancelModalAppt(null)}
                                    className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl cursor-pointer"
                                >
                                    Keep Appointment
                                </button>
                                <button
                                    type="submit"
                                    disabled={cancelling}
                                    className="px-5 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-all flex items-center gap-2 cursor-pointer"
                                >
                                    {cancelling && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <span>Confirm Cancellation</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
