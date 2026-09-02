'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
    X,
    User,
    Phone,
    Calendar,
    Clock,
    Stethoscope,
    Building2,
    CheckCircle2,
    UserCheck,
    CalendarClock,
    XCircle,
    AlertCircle,
    Video,
    ExternalLink,
    DollarSign,
    Info
} from 'lucide-react';
import { HospitalAppointment } from '@/stores/hospitalStore';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface AppointmentDetailsDrawerProps {
    appointment: HospitalAppointment | null;
    isOpen: boolean;
    onClose: () => void;
    onStatusUpdate: (appointmentId: string, status: string, reason?: string) => Promise<boolean>;
    onCheckIn: (appointmentId: string) => Promise<boolean>;
    onOpenReschedule: (appointment: HospitalAppointment) => void;
    onOpenCancel: (appointment: HospitalAppointment) => void;
    staffRole?: string;
}

export function AppointmentDetailsDrawer({
    appointment,
    isOpen,
    onClose,
    onStatusUpdate,
    onCheckIn,
    onOpenReschedule,
    onOpenCancel,
    staffRole = 'hospital_owner',
}: AppointmentDetailsDrawerProps) {
    const [actionLoading, setActionLoading] = useState(false);

    if (!isOpen || !appointment) return null;

    const isOwnerOrAdmin = ['hospital_owner', 'hospital_admin', 'hospital_manager', 'receptionist'].includes(staffRole);
    const isDoctor = staffRole === 'doctor';

    const formatDate = (d?: string | null) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
            });
        } catch {
            return d;
        }
    };

    const formatDateTime = (d?: string | null) => {
        if (!d) return '—';
        try {
            return new Date(d).toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
            });
        } catch {
            return d;
        }
    };

    const formatTime = (t?: string | null) => {
        if (!t) return '—';
        if (t.includes(':')) {
            const parts = t.split(':');
            const hour = parseInt(parts[0], 10);
            const minute = parts[1]?.slice(0, 2) || '00';
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const displayHour = hour % 12 || 12;
            return `${displayHour.toString().padStart(2, '0')}:${minute} ${ampm}`;
        }
        return t;
    };

    const handleConfirm = async () => {
        setActionLoading(true);
        try {
            await onStatusUpdate(appointment.id, 'confirmed');
        } finally {
            setActionLoading(false);
        }
    };

    const handleCheckIn = async () => {
        setActionLoading(true);
        try {
            await onCheckIn(appointment.id);
        } finally {
            setActionLoading(false);
        }
    };

    const handleMarkNoShow = async () => {
        setActionLoading(true);
        try {
            await onStatusUpdate(appointment.id, 'no_show', 'Patient did not arrive for scheduled slot');
        } finally {
            setActionLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
                <div className="w-screen max-w-md sm:max-w-lg bg-white dark:bg-gray-900 shadow-2xl border-l border-slate-200 dark:border-gray-800 flex flex-col animate-in slide-in-from-right duration-200">
                    
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/70 dark:bg-gray-800/40">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-[11px] font-mono font-bold text-slate-400 dark:text-slate-500 uppercase">
                                    APT-{appointment.id.slice(0, 8).toUpperCase()}
                                </span>
                                <StatusBadge status={appointment.status} size="sm" />
                            </div>
                            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                                OPD Appointment Workspace
                            </h2>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 dark:hover:bg-gray-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">

                        {/* SECTION 5 (TOP) — OPERATIONAL ACTIONS */}
                        {isOwnerOrAdmin && (
                            <div className="p-3.5 bg-slate-50 dark:bg-gray-800/60 rounded-2xl border border-slate-200/80 dark:border-gray-700/80 space-y-2">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Administrative Workflow
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {appointment.status === 'scheduled' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleConfirm}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>Confirm Booking</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleCheckIn}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                <UserCheck className="w-3.5 h-3.5" />
                                                <span>Check In / Mark Waiting</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onOpenReschedule(appointment)}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                <CalendarClock className="w-3.5 h-3.5" />
                                                <span>Reschedule</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onOpenCancel(appointment)}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                <span>Cancel</span>
                                            </button>
                                        </>
                                    )}

                                    {appointment.status === 'confirmed' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={handleCheckIn}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
                                            >
                                                <UserCheck className="w-3.5 h-3.5" />
                                                <span>Check In / Mark Waiting</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onOpenReschedule(appointment)}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                <CalendarClock className="w-3.5 h-3.5" />
                                                <span>Reschedule</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onOpenCancel(appointment)}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                <span>Cancel</span>
                                            </button>
                                        </>
                                    )}

                                    {appointment.status === 'waiting' && (
                                        <>
                                            <button
                                                type="button"
                                                onClick={() => onOpenReschedule(appointment)}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                <CalendarClock className="w-3.5 h-3.5" />
                                                <span>Reschedule</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={handleMarkNoShow}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                <span>Mark No Show</span>
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onOpenCancel(appointment)}
                                                disabled={actionLoading}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/80 hover:bg-rose-100 text-rose-700 dark:text-rose-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                                            >
                                                <XCircle className="w-3.5 h-3.5" />
                                                <span>Cancel</span>
                                            </button>
                                        </>
                                    )}

                                    {['in_consultation', 'in_progress', 'completed', 'cancelled', 'no_show'].includes(appointment.status) && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 italic py-1">
                                            {appointment.status === 'in_consultation' || appointment.status === 'in_progress'
                                                ? 'Clinical consultation is currently in progress.'
                                                : `Appointment is closed (${appointment.status.replace('_', ' ')}).`}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* SECTION 1 — APPOINTMENT DETAILS */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Appointment Details</span>
                            </h3>
                            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 text-xs">
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Appointment Date</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        {formatDate(appointment.date)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Time Slot</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        {formatTime(appointment.time)}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Consultation Mode</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize flex items-center gap-1 mt-0.5">
                                        {appointment.type === 'video' ? (
                                            <>
                                                <Video className="w-3.5 h-3.5 text-blue-500" />
                                                <span>Video Call</span>
                                            </>
                                        ) : (
                                            <>
                                                <Building2 className="w-3.5 h-3.5 text-teal-600" />
                                                <span>In-Person (OPD)</span>
                                            </>
                                        )}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Appointment Type</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                                        {appointment.type || 'Standard OPD'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Consultation Fee</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200">
                                        {appointment.fee != null ? `₹${appointment.fee}` : 'Hospital Rate / Complimentary'}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-[10px] text-slate-400 font-medium block">Booking Created</span>
                                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                                        {formatDate(appointment.createdAt)}
                                    </span>
                                </div>
                                <div className="col-span-2 pt-2 border-t border-slate-200/50 dark:border-gray-700/50 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 font-mono">
                                        ID: {appointment.id}
                                    </span>
                                    <StatusBadge status={appointment.status} size="sm" />
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2 — PATIENT DEMOGRAPHICS */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Patient Administrative Demographics</span>
                            </h3>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2.5 text-xs">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                            {appointment.patientName}
                                        </p>
                                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded-md font-mono text-[10px] font-bold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200/80 dark:border-teal-800">
                                            {appointment.patientUhid || `UHID-${appointment.id.slice(0, 8).toUpperCase()}`}
                                        </span>
                                    </div>
                                    {appointment.patientBloodGroup && (
                                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800">
                                            🩸 {appointment.patientBloodGroup}
                                        </span>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/50 dark:border-gray-700/50 text-[11px]">
                                    <div>
                                        <span className="text-slate-400 block">Contact Phone</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                            <Phone className="w-3 h-3 text-slate-400" />
                                            {appointment.patientPhone || 'Not provided'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 block">Gender & Age</span>
                                        <span className="font-semibold text-slate-700 dark:text-slate-300 capitalize">
                                            {[appointment.patientGender, appointment.patientDob ? `${new Date().getFullYear() - new Date(appointment.patientDob).getFullYear()} yrs` : null].filter(Boolean).join(' • ') || '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 3 — DOCTOR & DEPARTMENT */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <Stethoscope className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Doctor & Department</span>
                            </h3>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 space-y-2 text-xs">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-800 dark:text-teal-300 font-bold flex items-center justify-center shrink-0 border border-teal-200 dark:border-teal-800">
                                        {appointment.doctorName ? appointment.doctorName[0].toUpperCase() : 'D'}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100">
                                            Dr. {appointment.doctorName}
                                        </p>
                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                            {appointment.doctorSpecialization || 'Physician'}
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-2 border-t border-slate-200/50 dark:border-gray-700/50 flex items-center justify-between text-[11px]">
                                    <span className="text-slate-400">Hospital Department</span>
                                    <span className="font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/40">
                                        {appointment.doctorDepartment || 'General Medicine'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 4 — CHECK-IN STATUS */}
                        <div className="space-y-3">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                <UserCheck className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                                <span>Check-In & Queue Status</span>
                            </h3>
                            <div className="p-3.5 bg-slate-50/80 dark:bg-gray-800/50 rounded-2xl border border-slate-200/70 dark:border-gray-800 text-xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {appointment.checkedInAt || appointment.status === 'waiting' ? (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 font-bold text-xs">
                                                <UserCheck className="w-3.5 h-3.5" />
                                                <span>Patient Arrived (In Waiting Queue)</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-200/70 dark:bg-gray-800 text-slate-600 dark:text-slate-400 font-medium text-xs">
                                                <span>Not Checked In</span>
                                            </span>
                                        )}
                                    </div>
                                    {appointment.checkedInAt && (
                                        <span className="text-[11px] text-slate-500 font-mono">
                                            {formatDateTime(appointment.checkedInAt)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* CONTROLLED CLINICAL RECORD NAVIGATION */}
                        {(isOwnerOrAdmin || isDoctor) && (
                            <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 rounded-2xl border border-slate-200/70 dark:border-gray-800 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                        Patient Medical Record
                                    </p>
                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                        Past encounters, prescriptions & lab reports reside in Medical Records.
                                    </p>
                                </div>
                                <Link
                                    href={appointment.patientId ? `/hospital/encounters?patientId=${encodeURIComponent(appointment.patientId)}` : '/hospital/encounters'}
                                    className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-teal-700 dark:text-teal-300 rounded-xl text-xs font-semibold shrink-0 transition-colors border border-slate-200/60 dark:border-gray-700 shadow-2xs"
                                >
                                    <span>Open Clinical Record</span>
                                    <ExternalLink className="w-3 h-3" />
                                </Link>
                            </div>
                        )}

                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 border-t border-slate-200/70 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/30 flex justify-end">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                        >
                            Close Workspace
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
